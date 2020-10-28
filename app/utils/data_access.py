"""
This file contains data access and manipulation functions to interact with the
database.
"""

import uuid
import logging

from datetime import datetime

from peewee import DoesNotExist, IntegrityError
from werkzeug.security import (
    check_password_hash,
    generate_password_hash,
)

from utils.database import (
    DB_PROXY as DATABASE,
    Bodyfat,
    Colour,
    Herd,
    HerdTracking,
    Individual,
    User,
    Weight,
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
    and the response will be on the format:
        JSON: {
                status: 'unchanged' | 'updated' | 'created' | 'success' | 'error',
                message?: string,
                data: any
            }
    """
    user = fetch_user_info(user_uuid)
    if user is None or not (user.is_admin or user.is_manager):
        return {"status": "error", "message": "forbidden"}

    email = form.get("email", None)
    password = form.get("password", None)
    username = form.get("username", None)
    validated = form.get("validated", False)
    if not email or not password:
        return {"status": "error", "message": "missing data"}

    with DATABASE.atomic():
        if User.select().where(User.email == email).first():
            return {"status": "error", "message": "already exists"}

    user = register_user(email, password, username, validated)
    return {"status": "created", "data": user.id}

def register_user(email, password, username = None, validated=False, privileges=[]):
    """
    Creates a new user from an e-mail and password, returning the new user
    object.
    """
    user = User(
        email=email,
        uuid=uuid.uuid4().hex,
        password_hash=generate_password_hash(password),
        username=username,
        validated=validated,
        privileges=privileges,
    )
    with DATABASE.atomic():
        user.save()
    return user

def authenticate_user(name, password):
    """
    Authenticates an email or username and password against the database.
    Returns the user info for the authenticated user on success, or None on
    failure.
    """
    if not name or not password:
        return None
    try:
        with DATABASE.atomic():
            user_info = User.select().where((User.email == name) | (User.username == name)).get()
        if check_password_hash(user_info.password_hash, password):
            logging.info("Login from %s", name)
            return user_info
    except DoesNotExist:
        # Perform password check regardless of username to prevent timing
        # attacks
        check_password_hash("This-always-fails", password)
    logging.info("Failed login attempt for %s", name)
    return None

def fetch_user_info(user_id):
    """
    Fetches user information for a given user id.
    """
    try:
        with DATABASE.atomic():
            return User.get(User.uuid == user_id)
    except DoesNotExist:
        return None

def get_colors():
    """
    Returns all legal colors for all genebanks, like:

    {<genebank>: [{id: <color-id>, name: <color-description>}, [...]],
     [...]
    }
    """
    with DATABASE.atomic():
        #TODO: colors should be connected to genebanks in the database, not in
        #      this function.
        gotlandsColors = Colour.select().where(Colour.id < 100)
        mellerudColors = Colour.select().where(Colour.id >= 100)
        return {'Gotlandskanin': [{'id': c.id, 'name': c.name} for c in gotlandsColors],
                'Mellerudskanin': [{'id': c.id, 'name': c.name} for c in mellerudColors]
                }

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
    with DATABASE.atomic():
        for genebank in user.get_genebanks():
            genebank_data = genebank.short_info()
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
        with DATABASE.atomic():
            herd = Herd.select().where(Herd.herd == herd_id).get()
            data = herd.filtered_dict(user)
            if data["genebank"] not in user.accessible_genebanks:
                return None

            # This turned out to be really hard to write in peewee
            query = Individual.raw("""
                SELECT  i.*
                FROM    individual i
                JOIN    herd_tracking ht ON (i.individual_id = ht.individual_id)
                JOIN    herd h ON (ht.herd_id = h.herd_id)
                WHERE   h.herd = %s
                AND     i.death_date IS NULL
                AND     ht.herd_tracking_date = (
                        SELECT  MAX(herd_tracking_date)
                        FROM    herd_tracking
                        WHERE   individual_id = ht.individual_id
                )
            """, herd_id)

            data["individuals"] = [i.short_info() for i in query.execute()]
            return data
    except DoesNotExist:
        return None

def add_herd(form, user_uuid):
    """
    Adds a new herd, defined by `form`, into the database, if the given `user`
    has sufficient permissions to insert herds.
    The response will be on the format:
        JSON: {
                status: 'unchanged' | 'updated' | 'created' | 'success' | 'error',
                message?: string,
                data: any
            }
    """
    user = fetch_user_info(user_uuid)
    if user is None:
        return {"status": "error", "message": "Not logged in"}
    if not (user.is_admin or (user.is_manager and form['genebank'] in user.is_manager)):
        return {"status": "error", "message": "Forbidden"}

    with DATABASE.atomic():
        try:
            Herd.select().where(Herd.herd == form['herd']).get()
            return {"status": "error", "message": "herd ID already exists"}
        except DoesNotExist:
            pass
        if 'id' in form:
            del form['id']
        herd = Herd(**form)
        try:
            herd.save()
        except IntegrityError:
            return {"status": "error", "message": "missing data"}
        return {"status": "success"}

def update_herd(form, user_uuid):
    """
    Updates a herd, identified by `form.id`, by the values in `form`, if the
    given `user` has sufficient permissions to do so.
    """
    user = fetch_user_info(user_uuid)
    if user is None:
        return {"status": "error", "message": "Not logged in"}
    try:
        with DATABASE.atomic():
            herd = Herd.get(form["id"])
            # check permission to update herd
            permission = user.is_admin \
                        or user.has_role("owner", herd.id) \
                        or (user.is_manager and herd.genebank in user.is_manager)
            if not permission:
                return {"status": "error", "message": "forbidden"}

            for key, value in form.items():
                if hasattr(herd, key):
                    setattr(herd, key, value)
            herd.save()
        return  {"status": "updated"}
    except DoesNotExist:
        return {"status": "error", "message": "Unknown herd"}

def get_individual(individual_id, user_uuid=None):
    """
    Returns information on a given individual id, if it's accessible to the user
    identified by `user_uuid`.
    """
    user = fetch_user_info(user_uuid)
    if user is None:
        return None
    try:
        with DATABASE.atomic():
            individual = Individual.select().where(Individual.number == individual_id).get()
        if individual and individual.current_herd.genebank.id in user.accessible_genebanks:
            return individual.as_dict()
        return None
    except DoesNotExist:
        return None

def form_to_individual(form, user = None):
    """
    Individual data is split over a number of tables; Individual, HerdTracking,
    Colour, Weight, and Bodyfat. This function takes a `form` dict (as returned
    by Individual.as_dict(), and as used in the frontend), verifies the data
    (where possible) and either creates a new Individual object or fetches an
    existing individual from the database and updates it with the information in
    the form.

    The function returns an Individual object with values from `form` or throws
    a ValueError if there's any detected problems with the data.
    """

    # check if the individual exists in the datbase
    with DATABASE.atomic():
        try:
            individual = Individual.get(Individual.number == form["number"])
        except DoesNotExist:
            individual = Individual()

    # If the form has an id - make sure that it points to the same individual as
    # the number.
    if 'id' in form and form['id'] != individual.id:
        raise ValueError(f"Number can not be updated in the current version")

    canManage = user and (user.is_admin or user.is_manager and individual.current_herd.genebank_id in user.is_manager)

    # certificate is different from the other restricted fields in that it can
    # never be set by owners, while the other fields can be set for new animals.
    if 'certificate' in form and form['certificate'] != individual.certificate:
        if not canManage:
            raise ValueError(f"Only managers can update certificate numbers")

    if individual.id and not canManage: # we're updating (not creating new)
        for admin_field in ['name', 'sex', 'birth_date', 'colour_note', 'mother', 'father', 'colour', ]:
            if 'number' in form[admin_field]: # parents
                changed = form[admin_field]['number'] != getattr(individual, admin_field).number
            elif admin_field == 'colour':
                changed = form[admin_field] != individual.colour.name
            else:
                changed = f'{form[admin_field]}' != f'{getattr(individual, admin_field)}'

            if admin_field in form and changed:
                raise ValueError(f"Only managers can update {admin_field}")

    # Colour is stored as name in the form, but needs to be converted to id
    try:
        with DATABASE.atomic():
            form['colour'] = Colour.get(Colour.name == form['colour'])
    except DoesNotExist:
        raise ValueError(f"Unknown color: '{form['colour']}''")

    # fetch the origin herd
    try:
        with DATABASE.atomic():
            form['origin_herd'] = Herd.get(Herd.herd == form['origin_herd']['herd'])
    except DoesNotExist:
        raise ValueError(f"Unknown origin herd: '{form['origin_herd']['herd']}''")

    # parents
    try:
        with DATABASE.atomic():
            form['mother'] = Individual.get(Individual.number == form['mother']['number'])
            form['father'] = Individual.get(Individual.number == form['father']['number'])
    except DoesNotExist:
        raise ValueError("Invalid parents")

    # Update individual fields by looping through all fields on an Individual
    # object.
    for key in vars(Individual).keys():
        if key in form:
            if key.startswith('_'):
                continue
            if key and key.endswith('date'):
                try:
                    date = datetime.strptime(form[key], '%Y-%m-%d').date()
                    setattr(individual, key, date)
                except TypeError:
                    setattr(individual, key, form[key])
            else:
                setattr(individual, key, form[key])

    return individual

def add_individual(form, user_uuid):
    """
    Adds a new individual, defined by `form`, into the database, if the given
    `user` has sufficient permissions to insert individuals into the herd
    specified in the form data.
    The response will be on the format:
        JSON: {
                status: 'unchanged' | 'updated' | 'created' | 'success' | 'error',
                message?: string,
                data: any
            }
    """
    user = fetch_user_info(user_uuid)
    if user is None:
        return {"status": "error", "message": "Not logged in"}
    try:
        with DATABASE.atomic():
            herd = Herd.get(Herd.herd == form['herd'])
    except DoesNotExist:
        return {"status": "error", "message": "Individual must have a valid herd"}

    if not user.can_edit(herd.herd):
        return {"status": "error", "message": "Forbidden"}

    return {"status": "error", "message": "Not implemented"}

def update_individual(form, user_uuid):
    """
    Updates an individual, identified by `form.number`, by the values in `form`,
    if the user identified by `user_uuid` has sufficient permissions to do so.
    """
    user = fetch_user_info(user_uuid)
    if user is None:
        return {"status": "error", "message": "Not logged in"}

    if not user.can_edit(form['number']):
        return {"status": "error", "message": "Forbidden"}

    if isinstance(form['herd'], dict) and form['herd']:
        form['herd'] = form['herd'].get('herd', None)
    if not Herd.select().where(Herd.herd == form['herd']).exists():
        return {"status": "error", "message": "Individual must have a valid herd"}

    try:
        try:
            individual = form_to_individual(form, user)
        except ValueError as e:
            return {"status": "error", "message": f'{e}'}
        update_weights(individual, form['weights'])
        update_bodyfat(individual, form['bodyfat'])

        logging.warning('Herd tracking not updated.')
        individual.save()
        return  {"status": "success", "message": "Individual Updated"}
    except DoesNotExist:
        return {"status": "error", "message": "Unknown herd"}

def update_weights(individual, weights):
    """
    Updates the weight measurements of `individual` to match those in `weights`.

    `weights` should be a list formatted like:
    [{weight: <float>, date: 'yyyy-mm-dd'}, [...]]
    """
    with DATABASE.atomic():
        current_weights = Weight.select() \
                                .where(Weight.individual == individual.id)
        current_list = [(w.weight_date.strftime('%Y-%m-%d'), w.weight) for w in current_weights]
        new_list = [(w['date'], w['weight']) for w in weights]

        # check for current measurements to delete
        for weight in current_list:
            if weight not in new_list:
                Weight.delete().where(Weight.individual == individual, \
                                      Weight.weight_date == weight[0], \
                                      Weight.weight == weight[1]).execute()

        # check for new measurements to add
        for weight in new_list:
            if weight not in current_list:
                Weight(individual=individual, weight_date=weight[0], weight=weight[1]).save()

def update_bodyfat(individual, bodyfat):
    """
    Updates the bodufat measurements of `individual` to match those in `bodyfat`.

    `bodyfat` should be a list formatted like:
    [{bodyfat: 'low' | 'normal' | 'high', date: 'yyyy-mm-dd'}, [...]]
    """
    with DATABASE.atomic():
        logging.warning('bodyfat: %s', bodyfat)
        current_bodyfat = Bodyfat.select() \
                                 .where(Bodyfat.individual == individual.id)
        current_list = [(b.bodyfat_date.strftime('%Y-%m-%d'), b.bodyfat) for b in current_bodyfat]
        new_list = [(b['date'], b['bodyfat']) for b in bodyfat]

        # check for current measurements to delete
        for measure in current_list:
            if measure not in new_list:
                Bodyfat.delete().where(Bodyfat.individual == individual, \
                                       Bodyfat.bodyfat_date == measure[0], \
                                       Bodyfat.bodyfat == measure[1]).execute()

        # check for new measurements to add
        for measure in new_list:
            if measure not in current_list:
                if measure[1] not in ['low', 'normal', 'high']:
                    logging.error('Unknown bodyfat level: %s', measure[1])
                else:
                    Bodyfat(individual=individual, bodyfat_date=measure[0], bodyfat=measure[1]).save()

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
        with DATABASE.atomic():
            users = list(User.select())
        if not user.is_admin:
            users = [user for user in users if not user.is_admin]

        return [{"email": u.email, "name": u.username, "id": u.id} for u in users]
    except DoesNotExist:
        return None

def get_user(user_id, user_uuid=None):
    """
    Returns the user identified by `user_id`, if the user identified by
    `user_uuid` has admin or manager privileges. Note that the user does not
    need manager privileges over any particular genebank or herd.
    Returns:
        JSON: {
                status: 'success' | 'error',
                message?: <error message>,
                data?: <user-data>
            }
    """
    user = fetch_user_info(user_uuid)
    if user is None:
        return {"status": "error", "message": "Not logged in"}
    if not (user.is_admin or user.is_manager):
        return {"status": "error", "message": "Forbidden"}
    try:
        with DATABASE.atomic():
            target = User.get(int(user_id))
    except DoesNotExist:
        return {"status": "error", "message": "Unknown user"}

    return {"status": "success",
            "data": {
                "id": target.id,
                "email": target.email,
                "username": target.username,
                "validated": target.validated,
                "privileges": target.privileges,
                }
            }

def update_user(form, user_uuid=None):
    """
    Takes a role change description `form` and updates the user given by
    `form.id` with the values in `form`, and returns a status message.

    The input data should be formatted like:
        {id: <number>, email: <string>, validated: <boolean>}

    The return value will be formatted as:
        JSON: {
                status: 'unchanged' | 'updated' | 'created' | 'success' | 'error',
                message?: string,
            }
    """
    user = fetch_user_info(user_uuid)
    if user is None:
        return {"status": "error", "message": "not logged in"}

    logging.warning("a")
    # Check data
    if (
        not isinstance(form, dict)
        or not form.get("id", None)
        or not form.get("email", None)
        or form.get("validated") not in [True, False]
    ):
        return {"status": "error", "message": f"malformed request: {form}"}

    # Check permissions
    if not (user.is_admin or user.is_manager):
        return  {"status": "error", "message": "forbidden"}

    # check target user
    try:
        with DATABASE.atomic():
            target_user = User.get(form["id"])
    except DoesNotExist:
        return {"status": "error", "message": "unknown user"}

    # update target user data if needed
    updated = False
    for field in ["email", "username", "validated"]:
        if getattr(target_user, field) != form[field]:
            setattr(target_user, field, form[field])
            updated = True

    if updated:
        with DATABASE.atomic():
            target_user.save()
        return  {"status": "updated"}

    return {"status": "unchanged"}

def update_role(operation, user_uuid=None):
    """
    Takes a role change description `operation`, and returns a status message.

    The input data should be formatted like:
        {action: add | remove,
         role: owner | manager | specialist,
         user: <id>,
         herd | genebank: <id>
        }

    The return value will be formatted like:
        JSON: {
            status: 'unchanged' | 'updated' | 'created' | 'success' | 'error',
            message?: string,
            data?: any
        }
    """
    user = fetch_user_info(user_uuid)
    if user is None:
        return {"status": "error", "message": "not logged in"}

    # Check data
    valid = True
    message = "malformed request"
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
                with DATABASE.atomic():
                    herd = Herd.get(operation["herd"])
                genebank = herd.as_dict()["genebank"]
            except DoesNotExist:
                permitted = False  # unknown herd
                message = "unknown herd"
        if not (user.is_admin or genebank in user.is_manager):
            permitted = False
            message = "forbidden"
    elif not user.is_admin:
        permitted = False
        message = "forbidden"

    if not valid or not permitted:
        return {"status": "error", "message": message}

    # check target user
    try:
        with DATABASE.atomic():
            target_user = User.get(int(operation["user"]))
    except DoesNotExist:
        return {"status": "error", "message": "unknown user"}

    # update roles if needed
    target = "herd" if operation["role"] == "owner" else "genebank"
    has_role = target_user.has_role(operation["role"], operation[target])
    updated = False

    with DATABASE.atomic():
        if has_role and operation["action"] == "remove":
            target_user.remove_role(operation["role"], operation[target])
            updated = True
        elif not has_role and operation["action"] == "add":
            target_user.add_role(operation["role"], operation[target])
            updated = True
    return {"status": "updated" if updated else "unchanged"}

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
        # We currently don't have a real good way of defining when an individual
        # is "genetically dead" (either dead, or no longer part of breeding) so
        # we check a combination of death_date, death_note and that the latest
        # herd_tracking value can't be more than a year old.
        query = f"""
        SELECT      i.individual_id, i.name, i.certificate, i.number, i.sex,
                    i.birth_date, i.death_date, i.death_note, i.litter, i.notes,
                    i.colour_note,
                    f.individual_id, f.name, f.number,
                    m.individual_id, m.name, m.number,
                    c.colour_id, c.name,
                    h.herd_id, h.herd, h.herd_name,
                    g.name,
                    (h.is_active OR h.is_active IS NULL) AS herd_active,
                    ( (ih.herd_tracking_date > current_date - interval '1 year')
                      AND (h.is_active OR h.is_active IS NULL)
                      AND i.death_date IS NULL
                      AND (i.death_note = '' OR i.death_note IS NULL)
                    ) AS active,
                    ( i.death_date IS NULL
                      AND (i.death_note = '' OR i.death_note IS NULL)
                    ) AS alive
        FROM        individual i
        LEFT JOIN   individual f ON (i.father_id = f.individual_id)
        LEFT JOIN   individual m ON (i.mother_id = m.individual_id)
        JOIN        colour c ON (i.colour_id = c.colour_id)
        JOIN        (
                        SELECT DISTINCT ON (individual_id)
                                 individual_id,
                                 herd_id,
                                 herd_tracking_date
                        FROM     herd_tracking
                        ORDER BY individual_id, herd_tracking_date DESC
                    ) AS ih ON (ih.individual_id = i.individual_id)
        JOIN        herd h ON (ih.herd_id = h.herd_id)
        JOIN        genebank g ON (h.genebank_id = g.genebank_id)
        WHERE       h.genebank_id = %s;
        ;"""
        with DATABASE.atomic():
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
                "genebank": i[22],
                "herd_active": i[23], "active": i[24], "alive": i[25],
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
        with DATABASE.atomic():
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
