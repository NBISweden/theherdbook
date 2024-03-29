"""
This file contains data access and manipulation functions to interact with the
database.
"""

# pylint: disable=too-many-lines

import logging
import uuid
from datetime import date, datetime, timedelta

from peewee import (
    JOIN,
    DatabaseError,
    DoesNotExist,
    IntegrityError,
    PeeweeException,
    fn,
)

# pylint: disable=import-error

from utils.database import DB_PROXY as DATABASE  # isort:skip
from utils.database import Authenticators  # isort: skip
from utils.database import Bodyfat  # isort: skip
from utils.database import Breeding  # isort: skip
from utils.database import Color  # isort: skip
from utils.database import Genebank  # isort: skip
from utils.database import Herd  # isort: skip
from utils.database import HerdTracking  # isort: skip
from utils.database import Individual  # isort: skip
from utils.database import User  # isort: skip
from utils.database import Weight  # isort: skip
from utils.database import next_individual_number  # isort: skip
import utils.s3 as s3  # isort:skip

from werkzeug.security import check_password_hash, generate_password_hash  # isort:skip

logger = logging.getLogger("herdbook.da")

# Helper functions


def validate_date(date_string):
    """
    Validates a date string and returns a datetime object or raises ValueError.
    """
    if not date_string:
        raise ValueError("Date missing")
    try:
        return datetime.strptime(date_string, "%Y-%m-%d")  # Try the first format
    except ValueError:
        try:
            return datetime.strptime(
                date_string, "%Y-%m-%dT%H:%M:%S.%fZ"
            )  # Try the second format
        except ValueError as date_except:
            raise ValueError(
                "Date must be formatted as yyyy-mm-dd or yyyy-mm-ddThh:mm:ss.sssZ."
            ) from date_except


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
    privileges = [
        {"level": "viewer", "genebank": 1},
        {"level": "viewer", "genebank": 2},
    ]
    if not email or not password:
        return {"status": "error", "message": "missing data"}

    with DATABASE.atomic():
        if User.select().where(User.email == email).first():
            return {"status": "error", "message": "already exists"}

    user = register_user(email, password, username, validated, privileges)
    return {"status": "created", "data": user.id}


def register_user(
    email, password, username=None, validated=False, privileges=None, fullname=None
):
    """
    Creates a new user from an e-mail and password, returning the new user
    object.
    """
    if privileges is None:
        privileges = []

    # Don't create a new user if the email exists already
    try:
        user = User.select().where((User.email == email)).get()
    except DoesNotExist:
        # Create user
        user = User(
            email=email,
            uuid=uuid.uuid4().hex,
            username=username,
            fullname=fullname,
            validated=validated,
            privileges=privileges,
        )
        with DATABASE.atomic():
            user.save()

    # Update to make sure to get the correct id
    user = User.select().where((User.email == email)).get()
    logger.info(f"Registered User {user.as_dict()}")

    # If no password is provided, don't create an authenticator
    if not password:
        return user

    try:
        # If we have a password authenticator already, update it instead of creating a new.
        authenticator = (
            Authenticators.select()
            .where(
                (Authenticators.user == user.id) & (Authenticators.auth == "password")
            )
            .get()
        )
        authenticator.auth_data = generate_password_hash(password)
    except DoesNotExist:
        authenticator = Authenticators(
            user=user.id, auth="password", auth_data=generate_password_hash(password)
        )
    with DATABASE.atomic():
        authenticator.save()

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
            if user_info:
                authenticator = (
                    Authenticators.select()
                    .where(
                        (Authenticators.auth == "password")
                        & (Authenticators.user == user_info.id)
                    )
                    .get()
                )
        if check_password_hash(authenticator.auth_data, password):
            return user_info
    except DoesNotExist:
        # Perform password check regardless of username to prevent timing
        # attacks
        check_password_hash("This-always-fails", password)
    logger.info("Failed login attempt for %s", name)
    return None


def change_password(active_user, changed_user, form):
    """
    Changes password for user changed_user. Returns
    something that evaluates as True on success.
    """
    if not active_user or not changed_user or not form:
        logger.info("Bad call to change_password, somethings is missing)")
        return None

    if not active_user.is_admin:
        try:
            authenticator = (
                Authenticators.select()
                .where(
                    (Authenticators.user == changed_user)
                    & (Authenticators.auth == "password")
                )
                .get()
            )
            if not check_password_hash(authenticator.auth_data, form["oldpassword"]):
                # Incorrect password supplied
                return None
        except PeeweeException:
            # Non-users need a password set to change it. Fall out on any other
            # exception as well.
            return None

    try:
        # If we have a password authenticator already, update it instead of creating a new.
        authenticator = (
            Authenticators.select()
            .where(
                (Authenticators.user == changed_user)
                & (Authenticators.auth == "password")
            )
            .get()
        )
        authenticator.auth_data = generate_password_hash(form["newpassword"])
    except DoesNotExist:
        authenticator = Authenticators(
            user=changed_user,
            auth="password",
            auth_data=generate_password_hash(form["password"]),
        )
    with DATABASE.atomic():
        authenticator.save()

    return True


def authenticate_with_credentials(method, ident):
    """
    Authenticates a user through an external authentication service.
    Returns the user info for the authenticated user on success, or None on
    failure.
    """
    if not method or not ident:
        return None
    try:
        with DATABASE.atomic():
            authenticator = (
                Authenticators.select()
                .where(
                    (Authenticators.auth == method)
                    & (Authenticators.auth_data == ident)
                )
                .get()
            )
        if authenticator:
            user_info = User.select().where((User.id == authenticator.user)).get()

            if user_info:
                return user_info
    except DoesNotExist:
        pass

    logger.info("Failed login attempt for service %s persistent id %s", method, ident)
    return None


def link_account(user, method, ident):
    """
    Registers an account linked to an external authentication service. Returns
    something that evaluates as True on success.
    """
    if not method or not ident or not user:
        return None

    # Allows at most one identity for each method to be linked to this account.
    unlink_account(user, method)

    try:
        with DATABASE.atomic():
            authenticator = (
                Authenticators.select()
                .where(
                    (Authenticators.auth == method)
                    & (Authenticators.auth_data == ident)
                )
                .get()
            )
        if authenticator:
            # Someone else has this identity registered, do not allow the same external identity
            # for multiple users
            return None
    except DoesNotExist:
        pass

    try:
        authenticator = Authenticators(user=user.id, auth=method, auth_data=ident)
        with DATABASE.atomic():
            authenticator.save()
        logger.info("Linked %s to %s persistent id %s", user.username, method, ident)
        return user
    except PeeweeException as auth_except:
        logger.info(
            "Error (%s) while linking %s to %s persistent id %s",
            auth_except,
            user.username,
            method,
            ident,
        )

    logger.info(
        "Failed link attempt for user %s service %s persistent id %s",
        user.username,
        method,
        ident,
    )
    return None


def unlink_account(user, method):
    """
    Removes any linked identities for method method. Return somethings that
    evaluates to false on failure.
    """
    if not method or not user:
        return None
    try:
        with DATABASE.atomic():
            Authenticators.delete().where(
                (Authenticators.user == user.id) & (Authenticators.auth == method)
            ).execute()

        return True
    except DoesNotExist:
        return None

    logger.info("Failed to unlink idenities for service %s user %d", method, user.id)
    return None


def linked_accounts(user):
    """
    Returns any linked methods for the given account.
    """
    if not user:
        return None
    try:
        with DATABASE.atomic():
            auths = Authenticators.select().where(
                (Authenticators.user == user.id) & (Authenticators.auth != "password")
            )

        return [x.auth for x in auths]
    except DoesNotExist:
        return None

    logger.info("Failed to list linked idenities for user %d", user.id)
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

        return [
            {"email": u.email, "name": u.username, "id": u.id, "fullname": u.fullname}
            for u in users
        ]
    except DoesNotExist:
        return None


def get_active_users(minutes, user_uuid=None):
    """
    Returns a list of currently active users

    """
    user = fetch_user_info(user_uuid)
    time_ago = datetime.now() - timedelta(minutes=minutes)
    if user is None:
        return {"status": "error", "message": "Not logged in"}
    if not (user.is_admin or user.is_manager):
        return {"status": "error", "message": "Forbidden"}
    try:
        active_users = User.select().where(User.last_active >= time_ago)
    except DoesNotExist:
        return None
    return [
        {
            "username": user.username,
            "fullname": user.fullname,
            "last_active": user.last_active,
        }
        for user in active_users
    ]


def get_user(user_id, user_uuid=None):
    """
    Returns the user with id `user_id`, if the user identified by
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
            "fullname": target.fullname,
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

    # Check data
    if (
        not isinstance(form, dict)
        or not form.get("id", None)
        or not form.get("email", None)
        or form.get("validated") not in [True, False]
    ):
        return {"status": "error", "message": f"malformed request: {form}"}

    # Check permissions - allow users to update e-mail only
    if not (user.is_admin or user.is_manager) and (
        form.get("validated") or form.get("username")
    ):
        return {"status": "error", "message": "forbidden"}

    if not (user.is_admin or user.is_manager):
        # Mark user supplied e-mail as false
        form["validated"] = False

    # check target user
    try:
        with DATABASE.atomic():
            target_user = User.get(form["id"])
    except DoesNotExist:
        return {"status": "error", "message": "unknown user"}

    # update target user data if needed
    updated = False
    for field in ["email", "username", "validated", "fullname"]:
        if field in form and getattr(target_user, field) != form[field]:
            setattr(target_user, field, form[field])
            updated = True

    if updated:
        with DATABASE.atomic():
            target_user.save()
        return {"status": "updated"}

    return {"status": "unchanged"}


def update_role(operation, user_uuid=None, skip_role_check=False):
    """
    Takes a role change description `operation`, and returns a status message.

    The input data should be formatted like:
        {action: add | remove,
         role: owner | manager | viewer,
         user: <id>,
         herd | genebank: <id>
        }

    The return value will be formatted like:
        JSON: {
            status: 'unchanged' | 'updated' | 'created' | 'success' | 'error',
            message?: string,
            data?: any
        }

    Optionally takes a flag to skip role verification for system use.
    """
    user = fetch_user_info(user_uuid)
    if user is None and not skip_role_check:
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
        operation.get("role", {}) not in ["owner", "manager", "viewer"]
        or (
            operation["role"] in ["manager", "viewer"] and not operation.get("genebank")
        )
        or (operation["role"] in ["owner"] and not operation.get("herd"))
    ):
        valid = False

    # Check permissions
    permitted = True
    if skip_role_check or user.is_manager:
        genebank = operation.get("genebank", None)
        if genebank is None:
            try:
                with DATABASE.atomic():
                    herd = Herd.get(operation["herd"])
                genebank = herd.as_dict()["genebank"]
            except DoesNotExist:
                permitted = False  # unknown herd
                message = "unknown herd"
        if not (skip_role_check or user.is_admin or genebank in user.is_manager):
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
            logger.info(
                f"User:{user.username} UPDATE: Role remove on user: "
                f"{target_user.username} removed: {operation['role']} "
                f"target:{operation[target]}"
            )
            target_user.remove_role(operation["role"], operation[target])
            updated = True
        elif not has_role and operation["action"] == "add":
            logger.info(
                f"User:{user.username} UPDATE: Role added on user: "
                f"{target_user.username} added: {operation['role']} "
                f"target:{operation[target]}"
            )
            target_user.add_role(operation["role"], operation[target])
            updated = True

    return {"status": "updated" if updated else "unchanged"}


# Genebank functions


def get_colors():
    """
    Returns all legal colors for all genebanks, like:

    {<genebank>: [{id: <color-id>, name: <color-name>, comment: <color-comment>}, [...]],
     [...]
    }
    """
    with DATABASE.atomic():
        return {
            genebank.name: [
                {"id": color.id, "name": color.name, "comment": color.comment}
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


def herd_to_herdid(lookup_herd):
    """
    Returns the id of the herd with the given name.
    """
    with DATABASE.atomic():
        try:
            herd = Herd.get(Herd.herd == lookup_herd)
        except DoesNotExist:
            return None
        return herd.id


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

            data["individuals"] = [i.as_dict() for i in herd.individuals]
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
        logger.info(f"User:{user.username} Added herd: {herd.short_info()}")
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
        logger.info(f"User:{user.username} Updated herd: {herd.short_info()}")
        return {"status": "updated"}
    except DoesNotExist:
        return {"status": "error", "message": "Unknown herd"}


# Individual functions
def update_origin_herd_ind(individual, new_herd, username):
    """
    Updates the origin_herd for the given indivudal,
    and updates number to refelect the new origin herd
    and also updates the birth herd tracking event for the individual
    """
    update_logger = logging.getLogger(f"{individual.current_herd.genebank.name}_update")
    update_logger.info(
        f"{username},{individual.number},"
        "UPDATE origin_herd and number,"
        f"{individual.origin_herd.herd},{new_herd.herd},"
    )
    with DATABASE.atomic():
        individual.origin_herd = new_herd
        individual.number = new_herd.herd + "-" + individual.number.split("-")[1]
        individual.save()

    try:
        with DATABASE.atomic():
            ht_birth = HerdTracking.get(
                (HerdTracking.individual == individual)
                & (
                    HerdTracking.herd_tracking_date
                    == individual.breeding.birth_date.strftime("%Y-%m-%d")
                )
            )
            ht_birth.herd = new_herd
            ht_birth.save()
    except DoesNotExist:
        logger.info(f"{individual.number} does not have birth_date herdtracking event")
        raise ValueError("Individual does not have birth_date herdtracking event")


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

    # Skip if we are adding a new individual
    if not form.get("new_individual", False):
        # Get logger
        update_logger = logging.getLogger(
            f"{individual.current_herd.genebank.name}_update"
        )
        can_manage = user and (
            user.is_admin
            or not bool(individual.certificate or individual.digital_certificate)
            or user.is_manager
            and individual.current_herd.genebank_id in user.is_manager
        )

        admin_fields = ["digital_certificate", "certificate", "number"]
        # check if a non-manager-user tries to update restricted fields
        # (owners can still set these values in new individuals)
        changed = False
        if individual.id and not can_manage:
            for admin_field in [field for field in admin_fields if field in form]:
                if not form.get("issue_digital", False):
                    changed = (
                        f"{form[admin_field]}" != f"{getattr(individual, admin_field)}"
                    )

                if changed:
                    raise ValueError(f"Bara managers kan uppdatera {admin_field}")

    # Make sure a valid breeding id is passed
    if "breeding" in form:
        try:
            with DATABASE.atomic():
                form["breeding"] = Breeding.get(Breeding.id == form["breeding"])
        except DoesNotExist:
            raise ValueError(f"Unknown breeding event: '{form['breeding']}''")

    # Color is stored as name in the form, but needs to be converted to id
    if "color" in form and form["color"] is not None:
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
        except DoesNotExist as herd_except:
            raise ValueError(
                f"Unknown origin herd: '{form['origin_herd']['herd']}''"
            ) from herd_except

    # parents
    for parent in ["mother", "father"]:
        if parent in form:
            try:
                with DATABASE.atomic():
                    form[parent] = Individual.get(
                        Individual.number == form[parent]["number"]
                    )
            except DoesNotExist as parent_except:
                raise ValueError("Invalid parents") from parent_except

    # Update individual fields by looping through all fields on an Individual
    # object.
    for key in vars(Individual).keys():
        if form.get(key, None) is not None:
            if key.startswith("_") or key == "alive":
                continue
            if key and key.endswith("date"):
                try:
                    date_val = datetime.strptime(form[key], "%Y-%m-%d").date()
                    setattr(individual, key, date_val)
                    update_logger.info(
                        f"{user.username},{individual.number},{key},{getattr(individual,key)},{form[key]},"
                    )
                except TypeError:
                    setattr(individual, key, form[key])
            else:
                if not form.get("new_individual", False):
                    if getattr(individual, key) != form[key]:
                        # Reset if switching from paper to digital certificate or vice versa
                        if (
                            key == "digital_certificate"
                            and getattr(individual, "certificate") is not None
                        ):
                            update_logger.info(
                                f"{user.username},{individual.number},"
                                f"certificate,{getattr(individual,'certificate')},'None',"
                            )
                            setattr(individual, "certificate", None)

                        if (
                            key == "certificate"
                            and getattr(individual, "digital_certificate") is not None
                        ):
                            update_logger.info(
                                f"{user.username},{individual.number},"
                                f"digital_certificate,{getattr(individual,'digital_certificate')},'None',"
                            )
                            setattr(individual, "digital_certificate", None)
                        update_logger.info(
                            f"{user.username},{individual.number},{key},{getattr(individual,key)},{form[key]},"
                        )
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
    form["new_individual"] = True
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

    if form.get("number", None) is None and "breeding" in form:
        nextind = next_individual_number(
            herd=form["herd"],
            birth_date=form["birth_date"],
            breeding_event=form["breeding"],
        )
        logger.info(f"nextind is {nextind}")
        if nextind.get("status", None) == "success":
            form["number"] = nextind["number"]
        else:
            logger.error(f"Next in is not successfull: {nextind.get('message')}")
            return nextind

    if Individual.select().where(Individual.number == form["number"]).exists():
        return {"status": "error", "message": "Individual number already exists"}
    if form.get("certificate", None) is not None:
        if (
            Individual.select()
            .where(Individual.certificate == form["certificate"])
            .exists()
        ):
            return {
                "status": "error",
                "message": "Individual certificate already exists",
            }

    birth_date = form.get("birth_date", None)
    if birth_date is None:
        return {"status": "error", "message": "Birth date must be defined"}
    else:
        birth_date = validate_date(birth_date)

    try:
        individual = form_to_individual(form, user)
    except ValueError as exception:
        return {"status": "error", "message": f"{exception}"}
    if "weights" in form:
        update_weights(individual, form["weights"], user.username)
    if "bodyfat" in form:
        update_bodyfat(individual, form["bodyfat"], user.username)

    individual.save()

    try:
        update_herdtracking_values(
            individual=individual,
            new_herd=individual.origin_herd,
            user_signature=user,
            tracking_date=birth_date,
        )
    except ValueError as exception:
        return {"status": "error", "message": f"{exception}"}

    selling_date = form.get("selling_date", None)
    if selling_date is not None:
        selling_date = validate_date(selling_date)

    new_herd = None
    if isinstance(form.get("herd", None), dict):
        new_herd = form["herd"]
    if isinstance(form.get("herd", None), str):
        new_herd = Herd.get(Herd.herd == form["herd"])

    if new_herd and new_herd != individual.origin_herd:
        try:
            update_herdtracking_values(
                individual=individual,
                new_herd=new_herd,
                user_signature=user,
                tracking_date=datetime.utcnow() if not selling_date else selling_date,
            )
        except ValueError as exception:
            raise exception

    logging.getLogger(f"{individual.current_herd.genebank.name}_create").info(
        f"{user.username},{individual.number},{individual.name},{new_herd.herd},{selling_date}"
    )
    return {
        "status": "success",
        "message": "Individual Created",
        "number": individual.number,
    }


def update_herdtracking_values(individual, new_herd, user_signature, tracking_date):
    with DATABASE.atomic():
        ht_history = (
            HerdTracking.select()
            .where(HerdTracking.individual == individual)
            .order_by(HerdTracking.herd_tracking_date.desc())
        )

        current_herd = individual.origin_herd

        if len(ht_history):
            current_herd = ht_history[0].herd
            if ht_history[0].herd_tracking_date > tracking_date.date():
                logger.error("New herd tracking date is before the latest entry")
                raise ValueError("New herd tracking date is before the latest entry")

        if isinstance(new_herd, str):
            new_herd = Herd.get(Herd.herd == new_herd)
        HerdTracking(
            from_herd=current_herd,
            herd=new_herd,
            signature=user_signature,
            individual=individual,
            herd_tracking_date=tracking_date,
        ).save()


def update_individual(form, user_uuid):
    """
    Updates an individual, identified by `form.number`, by the values in `form`,
    if the user identified by `user_uuid` has sufficient permissions to do so.
    """
    user = fetch_user_info(user_uuid)
    if user is None:
        return {"status": "error", "message": "Not logged in"}

    if not user.can_edit(form["id"]):
        return {"status": "error", "message": "Forbidden"}
    new_number = None
    # Get the old individual if we are updating number
    old_individual = Individual.get(Individual.id == form["id"])
    update_logger = logging.getLogger(
        f"{old_individual.current_herd.genebank.name}_update"
    )
    if old_individual.number != form["number"]:
        new_number = form["number"]
        if Individual.select().where(Individual.number == form["number"]).exists():
            logger.warning(
                f"User: {user.username} "
                f"trying to update {old_individual.id}:"
                f"{old_individual.number} new number "
                f"already exists {new_number}"
            )
            return {"status": "error", "message": "Individual number already exists"}
        form["number"] = old_individual.number

    if form.get(
        "certificate", None
    ) is not None and old_individual.certificate != form.get("certificate", None):
        if (
            Individual.select()
            .where(Individual.certificate == form["certificate"])
            .exists()
        ):
            logger.warning(
                f"User: {user.username} trying to change "
                f"{old_individual.id}:{old_individual.number} "
                f"intyg number already exists {form.get('certificate', None)}"
            )
            return {
                "status": "error",
                "message": "Individual certificate already exists",
            }

    if form.get(
        "digital_certificate", None
    ) is not None and old_individual.digital_certificate != form.get(
        "digital_certificate", None
    ):
        if (
            Individual.select()
            .where(Individual.digital_certificate == form["digital_certificate"])
            .exists()
        ):
            logger.warning(
                f"User: {user.username} trying to change "
                f"{old_individual.id}:{old_individual.number} "
                f"intyg number already exists {form.get('digital_certificate', None)}"
            )
            return {
                "status": "error",
                "message": "Individual certificate already exists",
            }

    if form.get("origin_herd") and isinstance(form["origin_herd"], dict):
        try:
            with DATABASE.atomic():
                origin_herd = Herd.get(Herd.herd == form["origin_herd"]["herd"])
        except DoesNotExist as herd_except:
            raise ValueError(
                f"Unknown origin herd: '{form['origin_herd']['herd']}''"
            ) from herd_except
        if old_individual.origin_herd != origin_herd:
            if (
                Individual.select()
                .where(Individual.breeding_id == form["breeding"])
                .count()
                != 1
            ):
                return {
                    "status": "error",
                    "message": "origin_herd more inds",
                }

    if form["herd"] and isinstance(form["herd"], dict):
        form["herd"] = form["herd"].get("herd", None)
        if not Herd.select().where(Herd.herd == form["herd"]).exists():
            return {"status": "error", "message": "Individual must have a valid herd"}
    if form.get("issue_digital", False):
        nextval = 100000
        max = Individual.select(  # pylint: disable=E1120
            fn.MAX(Individual.digital_certificate)
        ).scalar()
        if max is not None:
            nextval = max + 1
        form["digital_certificate"] = nextval
    try:
        with DATABASE.atomic():
            try:
                individual = form_to_individual(form, user)
            except ValueError as exception:
                return {"status": "error", "message": f"{exception}"}
            if new_number:
                setattr(individual, "number", new_number)
                update_logger.info(
                    f"{user.username},{old_individual.number},new_number,{old_individual.number},{individual.number},"
                )

            if "weights" in form:
                update_weights(individual, form["weights"], user.username)
            if "bodyfat" in form:
                update_bodyfat(individual, form["bodyfat"], user.username)
            if (
                "yearly_report_date" in form or "selling_date" in form
            ) and "herd" in form:
                try:
                    update_logger = logging.getLogger(
                        f"{individual.current_herd.genebank.name}_update"
                    )
                    update_date = form.get("selling_date", False)
                    if update_date:
                        update_date = validate_date(update_date)
                        update_logger.info(
                            f"{user.username},{individual.number},selling_date,{old_individual.current_herd.herd},{form['herd']},{update_date}"  # noqa: E501
                        )
                    else:
                        update_date = validate_date(form.get("yearly_report_date"))
                        update_logger.info(
                            f"{user.username},{individual.number},yearly_report_date,{old_individual.current_herd.herd},{form['herd']},{update_date}"  # noqa: E501
                        )

                    update_herdtracking_values(
                        individual=individual,
                        new_herd=form["herd"],
                        user_signature=user,
                        tracking_date=datetime.utcnow()
                        if not update_date
                        else update_date,
                    )
                except ValueError as exception:
                    raise exception

            individual.save()

            # Move the certificate to the new number.
            if new_number and individual.digital_certificate:
                logger.info(
                    f"{user.username},{individual.number},moving intyg to new numeber"
                )
                s3.get_s3_client().copy_object(
                    old_object_name=f"{old_individual.number}/certificate.pdf",
                    object_name=f"{individual.number}/certificate.pdf",
                )
                s3.get_s3_client().delete_object(
                    f"{old_individual.number}/certificate.pdf"
                )
            # if breeding changed and breeding birth_date is changed
            # update birth_date herd_tracking_date
            if (
                old_individual.breeding.id != individual.breeding.id
                and old_individual.breeding.birth_date.strftime("%Y-%m-%d")
                != individual.breeding.birth_date.strftime("%Y-%m-%d")
            ):
                update_birth_date_herd_tracking(
                    individual,
                    user.username,
                    new_date=individual.breeding.birth_date,
                    old_date=old_individual.breeding.birth_date,
                )

            # if origin_herd has change update birth herd tracking.

            if form.get("origin_herd") and old_individual.origin_herd != form.get(
                "origin_herd"
            ):
                update_logger.info(
                    f"{user.username},{old_individual.number},"
                    f"new_origin_herd,{old_individual.origin_herd.herd},"
                    f"{individual.origin_herd.herd},"
                )
                ht_birth = HerdTracking.get(
                    (HerdTracking.individual == individual)
                    & (
                        HerdTracking.herd_tracking_date
                        == individual.breeding.birth_date.strftime("%Y-%m-%d")
                    )
                )
                ht_birth.herd = form["origin_herd"]
                ht_birth.save()
                # Update breeding breeding_herd_id if only one individual connected to herd.
                if (
                    Individual.select()
                    .where(Individual.breeding_id == individual.breeding)
                    .count()
                    == 1
                ):
                    breeding = Breeding.get(Breeding.id == individual.breeding)
                    breeding.breeding_herd_id = form["origin_herd"]
                    breeding.save()
                else:
                    return

        return {
            "status": "success",
            "message": "Individual Updated",
            "digital_certificate": individual.digital_certificate,
        }
    except Exception as e:
        logger.error(
            f"Expetion in update individual {individual.id}:{individual.number}, user: {user.username} exception: {e}"
        )
        return {"status": "error", "message": "Kunde inte uppdatera individ."}


def update_weights(individual, weights, username):
    """
    Updates the weight measurements of `individual` to match those in `weights`.

    `weights` should be a list formatted like:
    [{weight: <float>, date: 'yyyy-mm-dd'}, [...]]
    """
    update_logger = logging.getLogger(f"{individual.current_herd.genebank.name}_update")
    with DATABASE.atomic():
        current_weights = Weight.select().where(Weight.individual == individual.id)
        current_list = [
            (w.weight_date.strftime("%Y-%m-%d"), w.weight) for w in current_weights
        ]
        new_list = [(w["date"], w["weight"]) for w in weights]

        # check for current measurements to delete
        for weight in current_list:
            if weight not in new_list:
                update_logger.info(
                    f"{username},{individual.number},removing weight,{weight[0]},{weight[1]},"
                )
                Weight.delete().where(
                    Weight.individual == individual,
                    Weight.weight_date == weight[0],
                    Weight.weight == weight[1],
                ).execute()

        # check for new measurements to add
        for weight in new_list:
            if weight not in current_list:
                update_logger.info(
                    f"{username},{individual.number},adding weight,{weight[0]},{weight[1]},"
                )
                Weight(
                    individual=individual, weight_date=weight[0], weight=weight[1]
                ).save()


def update_bodyfat(individual, bodyfat, username):
    """
    Updates the bodufat measurements of `individual` to match those in `bodyfat`.

    `bodyfat` should be a list formatted like:
    [{bodyfat: 'low' | 'normal' | 'high', date: 'yyyy-mm-dd'}, [...]]
    """
    update_logger = logging.getLogger(f"{individual.current_herd.genebank.name}_update")
    with DATABASE.atomic():
        logger.warning("bodyfat: %s", bodyfat)
        current_bodyfat = Bodyfat.select().where(Bodyfat.individual == individual.id)
        current_list = [
            (b.bodyfat_date.strftime("%Y-%m-%d"), b.bodyfat) for b in current_bodyfat
        ]
        new_list = [(b["date"], b["bodyfat"]) for b in bodyfat]

        # check for current measurements to delete
        for measure in current_list:
            if measure not in new_list:
                update_logger.info(
                    f"{username},{individual.number},removing hull,{measure[0]},{measure[1]},"
                )
                Bodyfat.delete().where(
                    Bodyfat.individual == individual,
                    Bodyfat.bodyfat_date == measure[0],
                    Bodyfat.bodyfat == measure[1],
                ).execute()

        # check for new measurements to add
        for measure in new_list:
            if measure not in current_list:
                if measure[1] not in ["low", "normal", "high"]:
                    logger.error("Unknown bodyfat level: %s", measure[1])
                else:
                    update_logger.info(
                        f"{username},{individual.number},adding hull,{measure[0]},{measure[1]},"
                    )
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
        ).distinct()
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
        # value newer than 13 months ago.
        max_report_time = (datetime.now() - timedelta(days=365 + 30)).date()

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
                    "certificate": i["digital_certificate"]
                    if i["certificate"] is None
                    else i["certificate"],
                    "digital_certificate": i["digital_certificate"],
                    "number": i["number"],
                    "sex": i["sex"],
                    "birth_date": i["birth_date"].strftime("%Y-%m-%d")
                    if i["birth_date"]
                    else None,
                    "death_date": i["death_date"].strftime("%Y-%m-%d")
                    if i["death_date"]
                    else None,
                    "death_note": i["death_note"],
                    "castration_date": i["castration_date"],
                    "litter_size": i["litter_size"],
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
                    "herd_active": i["herd_active"],
                    "is_active": i["herd_active"]
                    and (i["certificate"] or i["digital_certificate"])
                    and not i["death_date"]
                    and not i["death_note"]
                    and not i["castration_date"]
                    and as_date(i["ht_date"]) > max_report_time,
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


def get_breeding_event(breed_id, user_uuid):
    """
    Returns a list of all breeding events given by `herd_id`.
    """
    user = fetch_user_info(user_uuid)
    if user is None:
        return []

    try:
        with DATABASE.atomic():
            breed = Breeding.select().where(Breeding.id == breed_id).get().as_dict()
            herd = Herd.get(Herd.herd == breed["breeding_herd"])

            if herd.genebank.id not in user.accessible_genebanks:
                return []

            return breed
    except DoesNotExist:
        logging.warning("Unknown herd %s", breed_id)

    return []


def get_breeding_events(herd_id, user_uuid):
    """
    Returns a list of all breeding events given by `herd_id`.
    """
    user = fetch_user_info(user_uuid)
    if user is None:
        return []

    try:
        herd = Herd.get(Herd.herd == herd_id)
        if herd.genebank.id not in user.accessible_genebanks:
            return []

        with DATABASE.atomic():
            query = Breeding.select().where(Breeding.breeding_herd_id == herd)
            return [b.as_dict() for b in query.iterator()]
    except DoesNotExist:
        logger.warning("Unknown herd %s", herd_id)

    return []


def get_breeding_events_with_ind(herd_id, user_uuid):
    """
    Returns a list of all breeding events given by `herd_id`
    and all individuals with the same breeding id.
    """
    user = fetch_user_info(user_uuid)
    if user is None:
        return []
    try:
        herd = Herd.get(Herd.herd == herd_id)
        if herd.genebank.id not in user.accessible_genebanks:
            return []
        breedings_dict = []
        with DATABASE.atomic():
            for breedings in Breeding.select().where(Breeding.breeding_herd_id == herd):
                individuals_dict = []
                for data in (
                    Individual.select(
                        Individual.number,
                        Individual.name,
                        Individual.color,
                        Individual.sex,
                        Individual.id,
                        Individual.origin_herd,
                        Individual.certificate,
                        Individual.digital_certificate,
                    )
                    .where(Individual.breeding_id == breedings.id)
                    .order_by(Individual.number)
                ):
                    ind = dict()
                    if data:
                        ind["number"] = data.number
                        ind["name"] = data.name
                        ind["sex"] = data.sex
                        ind["color"] = data.color.name if data.color else None
                        ind["current_herd"] = data.current_herd.herd
                        ind["is_registered"] = (
                            True
                            if data.certificate or data.digital_certificate
                            else False
                        )
                    individuals_dict.append(ind)
                b = breedings.as_dict()
                b["individuals"] = individuals_dict
                breedings_dict.append(b)

            return breedings_dict

    except DatabaseError as exception:
        logger.error("Database error: %s", exception)
    # except DoesNotExist:
    #     logger.warning("Unknown herd %s", herd_id)

    return []


def get_breeding_events_by_date(birth_date, user_uuid):
    """
    Returns a list of all breeding events in the system.
    """
    user = fetch_user_info(user_uuid)
    if user is None:
        return []

    try:
        with DATABASE.atomic():
            query = Breeding.select().where(Breeding.birth_date == birth_date)
            return [b.as_dict() for b in query.iterator()]
    except DatabaseError as exception:
        logger.error("Database error: %s", exception)

    return []


def register_breeding(form, user_uuid):
    """
    Registers a breeding event between two rabbits, defined by `form`, into the
    database (if the given `user` has sufficient permissions).

    The form should be formatted like:
    {
        mother: <individual-number>,
        father: <individual-number>,
        breeding_herd: <herd-number>,
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
    try:
        with DATABASE.atomic():
            herd = Herd.get(Herd.herd == form.get("breeding_herd", None))
    except DoesNotExist:
        errors += ["Unknown herd"]
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

    # A user can insert a breeding event if they have permission to edit the
    # current herd.
    if not (user.can_edit(herd.herd)):
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
        breeding = Breeding(
            father=father,
            mother=mother,
            breed_date=breed_date,
            breeding_herd_id=herd,
            breed_notes=form.get("notes", None),
        )
        breeding.save()
        logger.info(f"User:{user.username} added breeding: {breeding.as_dict()}")
        return {"status": "success", "breeding_id": breeding.id}


def delete_breeding(id, user_uuid):
    """
    Delete an empty breeding with `id` (if the
    given `user` has sufficient permissions).

    The response will be on the format:
    JSON:  {
            status: 'success' | 'error',
            message?: string
           }
    """
    user = fetch_user_info(user_uuid)
    if user is None:
        return {
            "status": "error",
            "message": "Du är inte inloggad. Logga in och försök igen",
        }

    try:
        breeding = Breeding.get(id)
    except (DoesNotExist, KeyError):
        return {
            "status": "error",
            "message": f"Kan inte hitta parningen med id {id} i databasen",
        }

    # A user can insert a breeding event if they have permission to edit at
    # least one of the parents.
    if not (user.can_edit(breeding.mother.number)):
        return {"status": "error", "message": "Du har inte rätt behörighet"}

    errors = []
    # check if the breeding has any a
    try:
        individuals = (
            Individual.select(Individual.number)
            .where(Individual.breeding_id == breeding.id)
            .count()
        )
        if individuals > 0:
            return {
                "status": "error",
                "message": f"Parningstillfället innehåller {individuals} individer \
                kan ej ta bort! prova att uppdatera sidan.",
            }
    except ValueError as error:
        errors += [str(error)]

    if errors:
        return {"status": "error", "message": ", ".join(errors)}
    try:
        with DATABASE.atomic():
            Breeding.delete().where(Breeding.id == id).execute()
            logger.info(
                f"User:{user.username} deleted empty breeding: {breeding.as_dict()}"
            )
            return {"status": "success"}
    except DoesNotExist:
        return {
            "status": "error",
            "message": f"Kan inte hitta parningen med id {id} i databasen",
        }


def register_birth(form, user_uuid):
    """
    Updates a breeding event with birth information, defined by `form` (if the
    given `user` has sufficient permissions).

    The form should be formatted like:
    {
        id: <breeding database id>
        date: <birth-date, as %Y-%m-%d>,
        litter_size: <total litter size (including stillborn)>
        litter_size6w: <number of litter alive 6 weeks after birth, can be null>
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

    # check if the litter_size size is valid
    try:
        litter_size = int(form.get("litter_size", None))
        if litter_size <= 0:
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
        breeding.litter_size = litter_size
        breeding.litter_size6w = form.get("litter_size6w", None)
        breeding.birth_notes = form.get("notes", None)
        breeding.save()
        logger.info(f"User:{user.username} added birth: {breeding.as_dict()}")
        return {"status": "success"}


def update_breeding(form, user_uuid):
    """
    Updates a breeding event with the information in `form` (if the
    given `user` has sufficient permissions).

    The form should be formatted like:
    {
        id: <breeding database id>
        breeding_herd: <herdnumber>
        breed_date?: <date, as %Y-%m-%d>,
        breed_notes?: string,
        father?: <individual-number>,
        mother?: <individual-number>,
        birth_date?: <date, as %Y-%m-%d>,
        birth_notes?: string,
        litter_size?: <total litter size (including stillborn)>,
        litter_size6w: <number of litter alive 6 weeks after birth, can be null>
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
    update_logger = logging.getLogger(
        f"{breeding.mother.current_herd.genebank.name}_update"
    )
    errors = []
    # Check if the parents are valid
    if "mother" in form:
        try:
            old_mother = breeding.mother.number
            breeding.mother = Individual.get(Individual.number == form["mother"])
            if old_mother != breeding.mother.number:
                update_logger.info(
                    f"{user.username},breeding_id:{breeding.id},changed_mother,{old_mother},{breeding.mother.number}"  # noqa: E501
                )
        except DoesNotExist:
            errors += ["Unknown mother"]
    if "father" in form:
        try:
            old_father = breeding.father.number
            breeding.father = Individual.get(Individual.number == form["father"])
            if old_father != breeding.father.number:
                update_logger.info(
                    f"{user.username},breeding_id:{breeding.id},changed_father,{old_father},{breeding.father.number}"  # noqa: E501
                )
        except DoesNotExist:
            errors += ["Unknown father"]

    for bdate in ["breed_date", "birth_date"]:
        if bdate in form:
            try:
                if getattr(breeding, bdate) != validate_date(form[bdate]).date():
                    update_logger.info(
                        f"{user.username},breeding_id:{breeding.id},changed_{bdate},{getattr(breeding,bdate)},{form[bdate]}"  # noqa: E501
                    )
                    setattr(breeding, bdate, validate_date(form[bdate]))
                    # If birth_date changed update birth_date herd tracking date
                    if bdate == "birth_date":
                        for ind in Individual.select().where(
                            Individual.breeding_id == breeding.id
                        ):
                            logger.info(
                                f"Indi: {ind.number} birth: {ind.breeding.birth_date}"
                            )
                            update_birth_date_herd_tracking(
                                ind,
                                user.username,
                                new_date=validate_date(form[bdate]),
                                old_date=ind.breeding.birth_date,
                            )

            except ValueError as error:
                errors += [str(error)]

    # check if the litter_size is valid
    if "litter_size" in form:
        try:
            breeding.litter_size = int(form["litter_size"])
            if breeding.litter_size <= 0:
                errors += ["Litter size must be larger than zero."]
        except ValueError:
            errors += ["Unknown litter size."]

    if errors:
        return {"status": "error", "message": ", ".join(errors)}

    # Check if breeding_herd has changed
    # Update breeding_herd to new herd ID.
    # Update all Indivuduals in breeding
    if "breeding_herd" in form:
        new_herd = Herd.get(Herd.herd == form["breeding_herd"])
        if new_herd != breeding.breeding_herd_id:
            update_logger.info(
                f"{user.username},breeding_id:{breeding.id},new_breeding_herd,{breeding.breeding_herd_id.herd},{new_herd.herd}"  # noqa: E501
            )
            breeding.breeding_herd_id = new_herd
            # Breeding herd id changed
            for ind in Individual.select().where(Individual.breeding_id == breeding.id):
                update_origin_herd_ind(ind, new_herd, user.username)

    with DATABASE.atomic():
        breeding.birth_notes = form.get("birth_notes", breeding.birth_notes)
        breeding.breed_notes = form.get("breed_notes", breeding.breed_notes)
        breeding.litter_size6w = form.get("litter_size6w", breeding.litter_size6w)
        breeding.save()
        return {"status": "success"}


def update_birth_date_herd_tracking(individual, username, new_date, old_date):
    """
    Updates the birth_date herd_tracking_date
    for the given indivudal
    """

    update_logger = logging.getLogger(f"{individual.current_herd.genebank.name}_update")
    update_logger.info(
        f"{username},{individual.id}:{individual.number},"
        "UPDATE birth tracking date,"
        f"{old_date},{new_date},"
    )
    if new_date.strftime("%y") != old_date.strftime("%y"):
        update_logger.info(
            f"{username},{individual.id},"
            "UPDATE year in number,"
            f"{old_date.strftime('%y')},{new_date.strftime('%y')},"
        )
        with DATABASE.atomic():
            individual.number = (
                individual.number.split("-")[0]
                + "-"
                + new_date.strftime("%y")
                + individual.number.split("-")[1][2:]
            )
            logger.info(
                f"New number Year change for id: {individual.id} is: {individual.number}"
            )
            individual.save()

    try:
        with DATABASE.atomic():
            ht_birth = HerdTracking.get(
                (HerdTracking.individual == individual)
                & (HerdTracking.herd_tracking_date == old_date.strftime("%Y-%m-%d"))
            )
            ht_birth.herd_tracking_date = new_date
            ht_birth.save()

    except DoesNotExist:
        logger.info(f"{individual.number} does not have birth_date herdtracking event")
        raise ValueError("Individual does not have birth_date herdtracking event")
