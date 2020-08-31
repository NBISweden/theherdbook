"""
This file contains data access and manipulation functions to interact with the
database.
"""

import uuid
import logging

from peewee import DoesNotExist
from werkzeug.security import (
    check_password_hash,
    generate_password_hash,
)

from utils.database import (
    DATABASE,
    Herd,
    Individual,
    User,
)


def add_user(form, user_uuid=None):
    """
    if the user identified by `user_uuid` has admin or manager rights, the new
    user described by `form` is added to the database.

    the given form should be a dictionary on the form:
    {
        email: <string value>
        password: <string value>
        validated?: <boolean>
    }
    """
    user = fetch_user_info(user_uuid)
    if user is None or not (user.is_admin or user.is_manager):
        return {"status": "forbidden"}

    email = form.get("email", None)
    password = form.get("password", None)
    validated = form.get("validated", False)
    if not email or not password:
        return {"status": "missing data"}

    if User.select().where(User.email == email).first():
        return {"status": "already exists"}

    user = register_user(email, password, validated)
    return {"id": user.id, "status": "success"}


def register_user(email, password, validated=False, privileges=[]):
    """
    Creates a new user from an e-mail and password, returning the new user
    object.
    """
    user = User(
        email=email,
        uuid=uuid.uuid4().hex,
        password_hash=generate_password_hash(password),
        validated=validated,
        privileges=privileges,
    )
    user.save()
    return user


def authenticate_user(email, password):
    """
    Authenticates an email/password pair against the database. Returns the
    user info for the authenticated user on success, or None on failure.
    """
    try:
        user_info = User.get(User.email == email)
        if check_password_hash(user_info.password_hash, password):
            logging.info("Login from %s", email)
            return user_info
    except DoesNotExist:
        # Perform password check regardless of username to prevent timing
        # attacks
        check_password_hash("This-always-fails", password)
    logging.info("Failed login attempt for %s", email)
    return None


def fetch_user_info(user_id):
    """
    Fetches user information for a given user id.
    """
    try:
        return User.get(User.uuid == user_id)
    except DoesNotExist:
        return None


def get_genebank(genebank_id, user_uuid=None):
    """
    Returns the information about the genebank given by `genebank_id` that is
    accessible to the user identified by `user_uuid`.
    """
    user = fetch_user_info(user_uuid)
    if user is None:
        return None

    return user.get_genebank(genebank_id)


def get_genebanks(user_uuid=None):
    """
    Returns all genebanks that are accessible to the user identified by
    `user_uuid`.
    """
    user = fetch_user_info(user_uuid)
    if user is None:
        return None

    data = []
    for genebank in user.get_genebanks():
        genebank_data = genebank.short_info()
        genebank_data["individuals"] = get_individuals(genebank.id, user_uuid)
        data += [genebank_data]

    return data


def get_herd(herd_id, user_uuid=None):
    """
    Returns information on the herd given by `herd_id`, including a list of all
    individuals belonging to that herd. The returned data is limited to the
    access permission of the user identified by `user_uuid`.
    """
    user = fetch_user_info(user_uuid)
    if user is None:
        return None
    try:
        data = Herd.get(herd_id).filtered_dict(user)
        if data["genebank"] not in user.accessible_genebanks:
            return None
        query = Individual().select().where(Individual.herd == herd_id)
        data["individuals"] = [i.short_info() for i in query.execute()]
        return data
    except DoesNotExist:
        return None


def add_herd(form, user_uuid):
    """
    Adds a new herd, defined by `form`, into the database, if the given `user`
    has sufficient permissions to insert herds.
    """
    logging.warning("add_herd is not yet implemented")
    return "failed"


def update_herd(form, user_uuid):
    """
    Updates a herd, identified by `form.id`, by the values in `form`, if the
    given `user` has sufficient permissions to do so.
    """
    user = fetch_user_info(user_uuid)
    if user is None:
        return None
    try:
        herd = Herd.get(form["id"])
        # check permission to update herd
        permission = (
            user.is_admin
            or user.has_role("owner", herd.id)
            or (user.is_manager and herd.genebank in user.is_manager)
        )
        if not permission:
            return "failed"  # no permission to change

        for key, value in form.items():
            if hasattr(herd, key):
                setattr(herd, key, value)
        herd.save()
        return "updated"
    except DoesNotExist:
        return "failed"  # unknown herd


def get_individual(individual_id, user_uuid=None):
    """
    Returns information on a given individual id, if it's accessible to the user
    identified by `user_uuid`.
    """
    user = fetch_user_info(user_uuid)
    if user is None:
        return None
    try:
        individual = Individual.get(individual_id)
        if individual and individual.herd.genebank.id in user.accessible_genebanks:
            return individual.as_dict()
        return None
    except DoesNotExist:
        return None


def get_users(user_uuid=None):
    """
    Returns all users that the logged in user has access to. This is all users
    for admin, all users except admin users for managers, and None for regular
    users.
    """
    user = fetch_user_info(user_uuid)
    if user is None:
        return None
    try:
        if not user.is_admin and not user.is_manager:
            return None
        users = list(User.select())
        if not user.is_admin:
            users = [user for user in users if not user.is_admin]

        return [{"email": u.email, "id": u.id} for u in users]
    except DoesNotExist:
        return None


def get_user(user_id, user_uuid=None):
    """
    Returns the user identified by `user_id`, if the user identified by
    `user_uuid` has admin or manager privileges. Note that the user does not
    need manager privileges over any particular genebank or herd.
    """
    user = fetch_user_info(user_uuid)
    if user is None:
        return None
    if not (user.is_admin or user.is_manager):
        return None
    try:
        target = User.get(int(user_id))
    except DoesNotExist:
        return None

    return {
        "id": target.id,
        "email": target.email,
        "validated": target.validated,
        "privileges": target.privileges,
    }


def update_user(form, user_uuid=None):
    """
    Takes a role change description `form` and updates the user given by
    `form.id` with the values in `form`, and returns a status message.

    The input data should be formatted like:
        {id: <number>, email: <string>, validated: <boolean>}

    The return value will be `updated`, `unchanged` or `failed`.
    """
    user = fetch_user_info(user_uuid)
    if user is None:
        return "failed"  # not logged in

    logging.warning("a")
    # Check data
    if (
        not isinstance(form, dict)
        or not form.get("id", None)
        or not form.get("email", None)
        or form.get("validated") not in [True, False]
    ):
        return "failed"

    # Check permissions
    if not (user.is_admin or user.is_manager):
        return "failed"

    # check target user
    try:
        target_user = User.get(form["id"])
    except DoesNotExist:
        return "failed"  # target user does not exist

    # update target user data if needed
    updated = False
    for field in ["email", "validated"]:
        if getattr(target_user, field) != form[field]:
            setattr(target_user, field, form[field])
            updated = True

    if updated:
        target_user.save()
        return "updated"

    return "unchanged"


def update_role(operation, user_uuid=None):
    """
    Takes a role change description `operation`, and returns a status message.

    The input data should be formatted like:
        {action: add | remove,
         role: owner | manager | specialist,
         user: <id>,
         herd | genebank: <id>
        }

    The return value will be `updated`, `unchanged` or `failed`.
    """
    user = fetch_user_info(user_uuid)
    if user is None:
        return "failed"  # not logged in

    # Check data
    valid = True
    if (
        not isinstance(operation, dict)
        or operation.get("action", {}) not in ["add", "remove"]
        or (
            not isinstance(operation.get("user", ""), int)
            and not operation.get("user", "").isdigit()
        )
    ):
        valid = False
    elif (
        operation.get("role", {}) not in ["owner", "manager", "specialist"]
        or (
            operation["role"] in ["manager", "specialist"]
            and not operation.get("genebank")
        )
        or (operation["role"] in ["owner"] and not operation.get("herd"))
    ):
        valid = False

    # Check permissions
    permitted = True
    if user.is_manager:
        genebank = operation.get("genebank", None)
        if genebank is None:
            try:
                herd = Herd.get(operation["herd"])
                genebank = herd.as_dict()["genebank"]
            except DoesNotExist:
                permitted = False  # unknown herd
        if genebank not in user.is_manager:
            permitted = False
    elif not user.is_admin:
        permitted = False

    if not valid or not permitted:
        return "failed"  # lacking permissions

    # check target user
    try:
        target_user = User.get(int(operation["user"]))
    except DoesNotExist:
        return "failed"  # target user does not exist

    # update roles if needed
    target = "herd" if operation["role"] == "owner" else "genebank"
    has_role = target_user.has_role(operation["role"], operation[target])
    updated = False
    if has_role and operation["action"] == "remove":
        target_user.remove_role(operation["role"], operation[target])
        updated = True
    elif not has_role and operation["action"] == "add":
        target_user.add_role(operation["role"], operation[target])
        updated = True
    return "updated" if updated else "unchanged"


def get_individuals(genebank_id, user_uuid=None):
    """
    Returns all individuals for a given `genebank_id` that the user identified
    by `user_uuid` has access to.
    """
    user = fetch_user_info(user_uuid)
    if user is None:
        return None  # not logged in
    try:
        # TODO: rewrite this in peewee
        query = """
        SELECT  i.individual_id, i.name, i.certificate, i.number, i.sex,
                i.birth_date, i.death_date, i.death_note, i.litter, i.notes,
                i.colour_note,
                f.individual_id, f.name, f.number,
                m.individual_id, m.name, m.number,
                c.colour_id, c.name,
                h.herd_id, h.herd, h.herd_name
        FROM    individual i JOIN
                individual f ON (i.father_id = f.individual_id) JOIN
                individual m ON (i.mother_id = m.individual_id) JOIN
                colour c ON (i.colour_id = c.colour_id) JOIN
                herd h ON (i.herd_id = h.herd_id)
        WHERE   h.genebank_id = %s AND
                (h.is_active OR h.is_active IS NULL);"""
        cursor = DATABASE.execute_sql(query, (genebank_id,))
        return [
            {
                "id": i[0],
                "name": i[1],
                "certificate": i[2],
                "number": i[3],
                "sex": i[4],
                "birth_date": i[5].strftime("%Y-%m-%d") if i[5] else None,
                "death_date": i[6].strftime("%Y-%m-%d") if i[6] else None,
                "death_note": i[7],
                "litter": i[8],
                "notes": i[9],
                "color_note": i[10],
                "father": {"id": i[11], "name": i[12], "number": i[13]},
                "mother": {"id": i[14], "name": i[15], "number": i[16]},
                "color": {"id": i[17], "name": i[18]},
                "herd": {"id": i[19], "herd": i[20], "herd_name": i[21]},
            }
            for i in cursor.fetchall()
        ]
    except DoesNotExist:
        return []


def get_all_individuals():
    """
    Returns the neccessary information about all individuals for computing genetic coefficients.

    :return: A list of dictionaries containing genetic features of the individuals
    :rtype: list(dict)
    """
    try:
        individuals_dict = []
        for individual in Individual.select():
            data = individual.__dict__["__data__"]
            ind = dict()
            ind["id"] = str(data["id"])
            ind["father"] = (
                str(data["father"]) if (data["father"] and data["mother"]) else "0"
            )
            ind["mother"] = (
                str(data["mother"]) if (data["mother"] and data["father"]) else "0"
            )
            ind["sex"] = "M" if data["sex"] == "male" else "F"
            ind["phenotype"] = str(data["colour"]) if data["colour"] else "0"
            individuals_dict.append(ind)
        return individuals_dict
    except DoesNotExist:
        return []
