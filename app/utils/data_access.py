"""
This file contains data access and manipulation functions to interact with the
database.
"""

import logging
import uuid
from datetime import date, datetime, timedelta

from peewee import JOIN, DoesNotExist, IntegrityError, fn

# pylint: disable=import-error

from utils.database import DB_PROXY as DATABASE  # isort:skip
from utils.database import Bodyfat  # isort: skip
from utils.database import Breeding  # isort: skip
from utils.database import Color  # isort: skip
from utils.database import Genebank  # isort: skip
from utils.database import Herd  # isort: skip
from utils.database import HerdTracking  # isort: skip
from utils.database import Individual  # isort: skip
from utils.database import User  # isort: skip
from utils.database import Weight  # isort: skip

from werkzeug.security import check_password_hash, generate_password_hash  # isort:skip


# Helper functions


def validate_date(date_string):
    """
    Validates a date string and returns a datetime object or raises ValueError.
    """
    if not date_string:
        raise ValueError("Date missing")
    try:
        return datetime.strptime(date_string, "%Y-%m-%d")
    except ValueError:
        raise ValueError("Date must be formatted as yyyy-mm-dd.")


# User functions


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


def register_user(email, password, username=None, validated=False, privileges=None):
    """
    Creates a new user from an e-mail and password, returning the new user
    object.
    """
    if privileges is None:
        privileges = []
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
            user_info = (
                User.select()
                .where((User.email == name) | (User.username == name))
                .get()
            )
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

    return {
        "status": "success",
        "data": {
            "id": target.id,
            "email": target.email,
            "username": target.username,
            "validated": target.validated,
            "privileges": target.privileges,
        },
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
        return {"status": "error", "message": "forbidden"}

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
        return {"status": "updated"}

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


# Genebank functions


def get_colors():
    """
    Returns all legal colors for all genebanks, like:

    {<genebank>: [{id: <color-id>, name: <color-description>}, [...]],
     [...]
    }
    """
    with DATABASE.atomic():
        return {
            genebank.name: [
                {"id": color.id, "name": color.name}
                for color in Color.select().where(Color.genebank == genebank)
            ]
            for genebank in Genebank.select()
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


# Herd functions


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
        data = None
        with DATABASE.atomic():
            herd = Herd.get(Herd.herd == herd_id)
            data = herd.filtered_dict(user)
            data["individuals"] = []
            if data["genebank"] not in user.accessible_genebanks:
                return None

            data["individuals"] = [i.short_info() for i in herd.individuals]
            return data
    except DoesNotExist:
        return data


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
    if not (user.is_admin or (user.is_manager and form["genebank"] in user.is_manager)):
        return {"status": "error", "message": "Forbidden"}

    with DATABASE.atomic():
        try:
            Herd.select().where(Herd.herd == form["herd"]).get()
            return {"status": "error", "message": "herd ID already exists"}
        except (DoesNotExist, KeyError):
            pass
        if "id" in form:
            del form["id"]
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

            if not user.can_edit(herd.herd):
                return {"status": "error", "message": "Forbidden"}

            for key, value in form.items():
                if hasattr(herd, key):
                    setattr(herd, key, value)
            herd.save()
        return {"status": "updated"}
    except DoesNotExist:
        return {"status": "error", "message": "Unknown herd"}


# Individual functions


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
            individual = (
                Individual.select().where(Individual.number == individual_id).get()
            )
        if (
            individual
            and individual.current_herd.genebank.id in user.accessible_genebanks
        ):
            return individual.as_dict()
        return None
    except DoesNotExist:
        return None


# Feel free to clean this up!
# pylint: disable=too-many-branches
def form_to_individual(form, user=None):
    """
    Individual data is split over a number of tables; Individual, HerdTracking,
    Color, Weight, and Bodyfat. This function takes a `form` dict (as returned
    by Individual.as_dict(), and as used in the frontend), verifies the data
    (where possible) and either creates a new Individual object or fetches an
    existing individual from the database and updates it with the information in
    the form.

    The function returns an Individual object with values from `form` or throws
    a ValueError if there's any detected problems with the data.
    """

    # check user permissions
    if not user.can_edit(form["number"]):
        raise PermissionError

    # check if the individual exists in the datbase
    with DATABASE.atomic():
        try:
            individual = Individual.get(Individual.number == form["number"])
        except DoesNotExist:
            individual = Individual()

    # If the form has an id - make sure that it points to the same individual as
    # the number.
    if "id" in form and form["id"] != individual.id:
        raise ValueError("Number can not be updated")

    can_manage = user and (
        user.is_admin
        or user.is_manager
        and individual.current_herd.genebank_id in user.is_manager
    )

    admin_fields = [
        "certificate",
        "name",
        "sex",
        "birth_date",
        "color_note",
        "mother",
        "father",
        "color",
    ]
    # check if a non-manager-user tries to update restricted fields
    # (owners can still set these values in new individuals)
    if individual.id and not can_manage:
        for admin_field in [field for field in admin_fields if field in form]:
            if "number" in form[admin_field]:  # parents
                changed = (
                    form[admin_field]["number"]
                    != getattr(individual, admin_field).number
                )
            elif admin_field == "color":
                changed = form[admin_field] != individual.color.name
            else:
                changed = (
                    f"{form[admin_field]}" != f"{getattr(individual, admin_field)}"
                )

            if changed:
                raise ValueError(f"Only managers can update {admin_field}")

    # Color is stored as name in the form, but needs to be converted to id
    if "color" in form:
        try:
            with DATABASE.atomic():
                form["color"] = Color.get(Color.name == form["color"])
        except DoesNotExist:
            raise ValueError(f"Unknown color: '{form['color']}''")

    # fetch the origin herd
    if "origin_herd" in form:
        try:
            with DATABASE.atomic():
                form["origin_herd"] = Herd.get(Herd.herd == form["origin_herd"]["herd"])
        except DoesNotExist:
            raise ValueError(f"Unknown origin herd: '{form['origin_herd']['herd']}''")

    # parents
    for parent in ["mother", "father"]:
        if parent in form:
            try:
                with DATABASE.atomic():
                    form[parent] = Individual.get(
                        Individual.number == form[parent]["number"]
                    )
            except DoesNotExist:
                raise ValueError("Invalid parents")

    # Update individual fields by looping through all fields on an Individual
    # object.
    for key in vars(Individual).keys():
        if key in form:
            if key.startswith("_"):
                continue
            if key and key.endswith("date"):
                try:
                    date_val = datetime.strptime(form[key], "%Y-%m-%d").date()
                    setattr(individual, key, date_val)
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
            herd = Herd.get(Herd.herd == form["herd"])
    except DoesNotExist:
        return {"status": "error", "message": "Individual must have a valid herd"}

    if not user.can_edit(herd.herd):
        return {"status": "error", "message": "Forbidden"}

    try:
        individual = form_to_individual(form, user)
    except ValueError as exception:
        return {"status": "error", "message": f"{exception}"}
    if "weights" in form:
        update_weights(individual, form["weights"])
    if "bodyfat" in form:
        update_bodyfat(individual, form["bodyfat"])

    # TODO: also create herd tracking values

    individual.save()
    return {"status": "success", "message": "Individual Created"}


def update_individual(form, user_uuid):
    """
    Updates an individual, identified by `form.number`, by the values in `form`,
    if the user identified by `user_uuid` has sufficient permissions to do so.
    """
    user = fetch_user_info(user_uuid)
    if user is None:
        return {"status": "error", "message": "Not logged in"}

    if not user.can_edit(form["number"]):
        return {"status": "error", "message": "Forbidden"}

    if form["herd"] and isinstance(form["herd"], dict):
        form["herd"] = form["herd"].get("herd", None)
    if not Herd.select().where(Herd.herd == form["herd"]).exists():
        return {"status": "error", "message": "Individual must have a valid herd"}
    if form.get("issue_digital", False) == True:
        nextval = 1000000
        max = Individual.select(  # pylint: disable=E1120
            fn.MAX(Individual.digital_certificate)
        ).scalar()
        if max is not None:
            nextval = max + 1
        form["digital_certificate"] = nextval
    try:
        try:
            individual = form_to_individual(form, user)
        except ValueError as exception:
            return {"status": "error", "message": f"{exception}"}
        if "weights" in form:
            update_weights(individual, form["weights"])
        if "bodyfat" in form:
            update_bodyfat(individual, form["bodyfat"])

        # TODO: also update herd tracking

        individual.save()
        return {
            "status": "success",
            "message": "Individual Updated",
            "digital_certificate": individual.digital_certificate,
        }
    except DoesNotExist:
        return {"status": "error", "message": "Unknown herd"}


def update_weights(individual, weights):
    """
    Updates the weight measurements of `individual` to match those in `weights`.

    `weights` should be a list formatted like:
    [{weight: <float>, date: 'yyyy-mm-dd'}, [...]]
    """
    with DATABASE.atomic():
        current_weights = Weight.select().where(Weight.individual == individual.id)
        current_list = [
            (w.weight_date.strftime("%Y-%m-%d"), w.weight) for w in current_weights
        ]
        new_list = [(w["date"], w["weight"]) for w in weights]

        # check for current measurements to delete
        for weight in current_list:
            if weight not in new_list:
                Weight.delete().where(
                    Weight.individual == individual,
                    Weight.weight_date == weight[0],
                    Weight.weight == weight[1],
                ).execute()

        # check for new measurements to add
        for weight in new_list:
            if weight not in current_list:
                Weight(
                    individual=individual, weight_date=weight[0], weight=weight[1]
                ).save()


def update_bodyfat(individual, bodyfat):
    """
    Updates the bodufat measurements of `individual` to match those in `bodyfat`.

    `bodyfat` should be a list formatted like:
    [{bodyfat: 'low' | 'normal' | 'high', date: 'yyyy-mm-dd'}, [...]]
    """
    with DATABASE.atomic():
        logging.warning("bodyfat: %s", bodyfat)
        current_bodyfat = Bodyfat.select().where(Bodyfat.individual == individual.id)
        current_list = [
            (b.bodyfat_date.strftime("%Y-%m-%d"), b.bodyfat) for b in current_bodyfat
        ]
        new_list = [(b["date"], b["bodyfat"]) for b in bodyfat]

        # check for current measurements to delete
        for measure in current_list:
            if measure not in new_list:
                Bodyfat.delete().where(
                    Bodyfat.individual == individual,
                    Bodyfat.bodyfat_date == measure[0],
                    Bodyfat.bodyfat == measure[1],
                ).execute()

        # check for new measurements to add
        for measure in new_list:
            if measure not in current_list:
                if measure[1] not in ["low", "normal", "high"]:
                    logging.error("Unknown bodyfat level: %s", measure[1])
                else:
                    Bodyfat(
                        individual=individual,
                        bodyfat_date=measure[0],
                        bodyfat=measure[1],
                    ).save()


def get_individuals(genebank_id, user_uuid=None):
    """
    Returns all individuals for a given `genebank_id` that the user identified
    by `user_uuid` has access to.
    """
    user = fetch_user_info(user_uuid)
    if user is None or genebank_id not in user.accessible_genebanks:
        return None  # not logged in
    try:
        # Rank all herdtracking values by individual and date
        current_herd = HerdTracking.select(
            HerdTracking.herd.alias("herd"),
            HerdTracking.herd_tracking_date.alias("ht_date"),
            HerdTracking.individual.alias("i_id"),
            fn.RANK()
            .over(
                order_by=[HerdTracking.herd_tracking_date.desc()],
                partition_by=[HerdTracking.individual],
            )
            .alias("rank"),
        )
        # count children for individuals. This can be done in two ways - total
        # number of children, or number of children that is available in the
        # database.

        # total_children = Breeding.select(fn.SUM(Breeding.litter_size)) \
        #                          .where((Breeding.father == Individual.id) |
        #                                 (Breeding.mother == Individual.id))

        # pylint: disable=invalid-name
        Children = Individual.alias()
        children_in_db = (
            Children.select(fn.COUNT(Children.id))
            .join(Breeding)
            .where(
                (Breeding.father == Individual.id) | (Breeding.mother == Individual.id)
            )
        )

        # use the children in the database for the result
        children = children_in_db

        # pylint: disable=invalid-name
        Father = Individual.alias()
        Mother = Individual.alias()
        # Join all the needed tables
        g_query = (
            Individual.select(
                Individual,
                Breeding,
                Color.id.alias("color_id"),
                Color.name.alias("color_name"),
                Father.id.alias("father_id"),
                Father.name.alias("father_name"),
                Father.number.alias("father_number"),
                Mother.id.alias("mother_id"),
                Mother.name.alias("mother_name"),
                Mother.number.alias("mother_number"),
                current_herd.c.ht_date,
                Herd.id.alias("herd_id"),
                Herd.herd,
                Herd.herd_name,
                Herd.is_active.alias("herd_active"),
                Genebank.name.alias("genebank_name"),
                children.alias("children"),
            )
            .join(Breeding)
            .join(Father, JOIN.LEFT_OUTER, on=(Father.id == Breeding.father_id))
            .join(Mother, JOIN.LEFT_OUTER, on=(Mother.id == Breeding.mother_id))
            .join(Color, JOIN.LEFT_OUTER, on=(Individual.color_id == Color.id))
            .join(current_herd, on=(Individual.id == current_herd.c.i_id))
            .join(Herd, on=(Herd.id == current_herd.c.herd))
            .join(Genebank, on=(Herd.genebank == Genebank.id))
            .where(current_herd.c.rank == 1)
            .where(Genebank.id == genebank_id)
        )

        # individuals are considered invalid if they don't have a herd tracking
        # value newer than one year ago.
        max_report_time = (datetime.now() - timedelta(days=366)).date()

        def as_date(value):
            """
            Function to coerce a value to datetime.date as sqlite returns
            string and postgresql returns datetime.
            """
            if isinstance(value, date):
                return value
            return datetime.strptime(value, "%Y-%m-%d").date()

        with DATABASE.atomic():
            # return as a list of certain fields
            return [
                {
                    "id": i["id"],
                    "name": i["name"],
                    "certificate": i["certificate"],
                    "number": i["number"],
                    "sex": i["sex"],
                    "birth_date": i["birth_date"].strftime("%Y-%m-%d")
                    if i["birth_date"]
                    else None,
                    "death_date": i["death_date"].strftime("%Y-%m-%d")
                    if i["death_date"]
                    else None,
                    "death_note": i["death_note"],
                    "litter": i["litter_size"],
                    "notes": i["notes"],
                    "color_note": i["color_note"],
                    "father": {
                        "id": i["father_id"],
                        "name": i["father_name"],
                        "number": i["father_number"],
                    },
                    "mother": {
                        "id": i["mother_id"],
                        "name": i["mother_name"],
                        "number": i["mother_number"],
                    },
                    "color": {"id": i["color_id"], "name": i["color_name"]},
                    "herd": {
                        "id": i["herd_id"],
                        "herd": i["herd"],
                        "herd_name": i["herd_name"],
                    },
                    "genebank": i["genebank_name"],
                    "herd_active": i["herd_active"] or i["herd_active"] is None,
                    "active": as_date(i["ht_date"]) > max_report_time
                    and (i["herd_active"] or i["herd_active"] is None)
                    and i["death_date"] is None
                    and not i["death_note"],
                    "alive": i["death_date"] is None and not i["death_note"],
                    "children": i["children"],
                }
                for i in g_query.dicts()
            ]
    except DoesNotExist:
        return []


def get_all_genebanks():
    """
    Returns a list of all genebanks.
    """
    query = Genebank().select()

    # Using a list comprehension here will turn the iterator into a list
    return [g for g in query.execute()]  # pylint: disable=unnecessary-comprehension


def get_all_individuals():
    """
    Returns the neccessary information about all individuals for computing genetic coefficients.

    :return: A list of dictionaries containing genetic features of the individuals
    :rtype: list(dict)
    """
    try:
        individuals_dict = []
        with DATABASE.atomic():
            for data in Individual.select(Individual, Breeding).join(Breeding).dicts():
                ind = dict()
                ind["id"] = str(data["id"])
                ind["father"] = (
                    str(data["father"]) if (data["father"] and data["mother"]) else "0"
                )
                ind["mother"] = (
                    str(data["mother"]) if (data["mother"] and data["father"]) else "0"
                )
                ind["sex"] = "M" if data["sex"] == "male" else "F"
                ind["phenotype"] = str(data["color"]) if data["color"] else "0"
                individuals_dict.append(ind)
            return individuals_dict
    except DoesNotExist:
        return []


# Breeding and birth functions


def get_breeding_events(herd_id, user_uuid):
    """
    Returns a list of all breeding events where at least one of the parents is
    in the herd given by `herd_id`.
    """
    user = fetch_user_info(user_uuid)
    if user is None:
        return []

    try:
        herd = Herd.get(Herd.herd == herd_id)

        if herd.genebank.id not in user.accessible_genebanks:
            return []

        parents = [i.id for i in herd.individuals]
        with DATABASE.atomic():
            query = Breeding.select().where(
                (Breeding.father_id << parents) | (Breeding.mother_id << parents)
            )

            return [b.as_dict() for b in query]
    except DoesNotExist:
        logging.warning("Unknown herd %s", herd_id)

    return []


def register_breeding(form, user_uuid):
    """
    Registers a breeding event between two rabbits, defined by `form`, into the
    database (if the given `user` has sufficient permissions).

    The form should be formatted like:
    {
        mother: <individual-number>,
        father: <individual-number>,
        date: <breeding-date, as %Y-%m-%d>,
        notes: <text>,
    }

    The response will be on the format:
    JSON:  {
            status: 'success' | 'error',
            message?: string
           }
    """
    user = fetch_user_info(user_uuid)
    if user is None:
        return {"status": "error", "message": "Not logged in"}

    errors = []
    # Check if the parents are valid
    try:
        mother = Individual.get(Individual.number == form.get("mother", None))
    except DoesNotExist:
        errors += ["Unknown mother"]
    try:
        father = Individual.get(Individual.number == form.get("father", None))
    except DoesNotExist:
        errors += ["Unknown father"]

    if errors:
        return {"status": "error", "message": ", ".join(errors)}

    # A user can insert a breeding event if they have permission to edit at
    # least one of the parents.
    if not (user.can_edit(mother.number) or user.can_edit(father.number)):
        return {"status": "error", "message": "Forbidden"}

    # check if the breeding date is valid
    try:
        breed_date = validate_date(form.get("date", None))
    except ValueError as error:
        return {"status": "error", "message": str(error)}

    exists = (
        Breeding.select()
        .where(Breeding.father == father)
        .where(Breeding.mother == mother)
        .where(Breeding.breed_date == breed_date)
        .count()
    )
    if exists:
        return {"status": "error", "message": "Breeding already registered"}

    with DATABASE.atomic():
        Breeding(
            father=father,
            mother=mother,
            breed_date=breed_date,
            breed_notes=form.get("notes", None),
        ).save()
        return {"status": "success"}


def register_birth(form, user_uuid):
    """
    Updates a breeding event with birth information, defined by `form` (if the
    given `user` has sufficient permissions).

    The form should be formatted like:
    {
        id: <breeding database id>
        date: <birth-date, as %Y-%m-%d>,
        litter: <total litter size (including stillborn)>
        notes: <text>,
    }

    The response will be on the format:
    JSON:  {
            status: 'success' | 'error',
            message?: string
           }
    """
    user = fetch_user_info(user_uuid)
    if user is None:
        return {"status": "error", "message": "Not logged in"}

    try:
        breeding = Breeding.get(form.get("id", None))
    except (DoesNotExist, KeyError):
        return {"status": "error", "message": "Breeding does not exist"}

    # A user can insert a breeding event if they have permission to edit at
    # least one of the parents.
    if not (
        user.can_edit(breeding.mother.number) or user.can_edit(breeding.father.number)
    ):
        return {"status": "error", "message": "Forbidden"}

    errors = []
    # check if the birth date is valid
    try:
        birth_date = validate_date(form.get("date", None))
    except ValueError as error:
        errors += [str(error)]

    # check if the litter size is valid
    try:
        litter = int(form.get("litter", None))
        if litter <= 0:
            errors += ["Litter size must be larger than zero."]
    except ValueError:
        errors += ["Unknown litter size."]
    except TypeError:
        errors += ["Missing litter size."]

    if breeding.birth_date or breeding.birth_notes:
        errors += ["Birth already registered."]

    if errors:
        return {"status": "error", "message": ", ".join(errors)}

    with DATABASE.atomic():
        breeding.birth_date = birth_date
        breeding.litter_size = litter
        breeding.birth_notes = form.get("notes", None)
        breeding.save()
        return {"status": "success"}


def update_breeding(form, user_uuid):
    """
    Updates a breeding event with the information in `form` (if the
    given `user` has sufficient permissions).

    The form should be formatted like:
    {
        id: <breeding database id>
        breed_date?: <date, as %Y-%m-%d>,
        breed_notes?: string,
        father?: <individual-number>,
        mother?: <individual-number>,
        birth_date?: <date, as %Y-%m-%d>,
        birth_notes?: string,
        litter_size?: <total litter size (including stillborn)>,
    }

    The response will be on the format:
    JSON:  {
            status: 'success' | 'error',
            message?: string
           }
    """
    user = fetch_user_info(user_uuid)
    if user is None:
        return {"status": "error", "message": "Not logged in"}

    try:
        breeding = Breeding.get(form["id"])
    except (DoesNotExist, KeyError):
        return {"status": "error", "message": "Breeding does not exist"}

    # A user can insert a breeding event if they have permission to edit at
    # least one of the parents.
    if not (
        user.can_edit(breeding.mother.number) or user.can_edit(breeding.father.number)
    ):
        return {"status": "error", "message": "Forbidden"}

    errors = []
    # Check if the parents are valid
    if "mother" in form:
        try:
            breeding.mother = Individual.get(Individual.number == form["mother"])
        except DoesNotExist:
            errors += ["Unknown mother"]
    if "father" in form:
        try:
            breeding.father = Individual.get(Individual.number == form["father"])
        except DoesNotExist:
            errors += ["Unknown father"]

    for bdate in ["breed_date", "birth_date"]:
        if bdate in form:
            try:
                setattr(breeding, bdate, validate_date(form[bdate]))
            except ValueError as error:
                errors += [str(error)]

    # check if the litter size is valid
    if "litter_size" in form:
        try:
            breeding.litter_size = int(form["litter_size"])
            if breeding.litter_size <= 0:
                errors += ["Litter size must be larger than zero."]
        except ValueError:
            errors += ["Unknown litter size."]

    if errors:
        return {"status": "error", "message": ", ".join(errors)}

    with DATABASE.atomic():
        breeding.save()
        return {"status": "success"}
