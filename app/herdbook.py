#!/usr/bin/env python3
"""
This file contains the main webserver of 'the herdbook'.

The server uses Flask to serve a React frontend, and connect to a postgres
database.
"""

import base64
import binascii
import copy
import datetime
import hashlib
import logging
import sys
import time
import uuid
from logging.handlers import TimedRotatingFileHandler

import apscheduler.schedulers.background
import flask_session
import requests
from flask import Flask, abort, jsonify, redirect, request, session, url_for
from flask_caching import Cache
from flask_login import (
    LoginManager,
    current_user,
    login_required,
    login_user,
    logout_user,
)
from utils.cert_acess import (
    check_certificate_s3,
    create_pdf_response,
    download_certificate_s3,
    get_certificate,
    get_certificate_data,
    sign_data,
    upload_certificate,
    verify_certificate_checksum,
    verify_signature,
)

import utils.csvparser as csvparser  # isort:skip
import utils.external_auth  # isort:skip
import utils.data_access as da  # isort:skip
import utils.database as db  # isort:skip
import utils.settings as settings  # isort:skip
import utils.genebank_logging as gblogging  # isort:skip

APP = Flask(__name__, static_folder="/static")
APP.secret_key = uuid.uuid4().hex
# cookie options at https://flask.palletsprojects.com/en/1.1.x/security/
APP.config.update(
    # SESSION_COOKIE_SECURE=True, # Disabled for now to simplify development
    # workflow
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SECURE=True,
    SESSION_COOKIE_SAMESITE="None",
    SESSION_TYPE="filesystem",
    DEBUG=True,  # some Flask specific configs
    CACHE_TYPE="FileSystemCache",
    CACHE_DIR="/tmp",
    CACHE_DEFAULT_TIMEOUT=300,
)

# pylint: disable=no-member
APP.logger.setLevel(logging.INFO)
file_handler = TimedRotatingFileHandler(
    f"{settings.service.logfolder}/APP.log", when="W6"
)
file_handler.setLevel(logging.INFO)
file_handler.setFormatter(
    gblogging.RequestFormatter(
        "[%(asctime)s] %(module)s.%(levelname)s: %(message)s, URL: %(url)s ",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
)
APP.logger.addHandler(file_handler)
utils.external_auth.setup(APP)

flask_session.Session().init_app(APP)

CACHE = Cache(APP)
LOGIN = LoginManager(APP)
LOGIN.login_view = "/login"

KINSHIP_LIFETIME = 300


@APP.after_request
def after_request(response):
    """
    Callback that triggers after each request. Currently this is used to set
    CORS headers to allow a different origin when using the development server.
    """

    if "Origin" in request.headers:
        origin = request.headers["Origin"]
    else:
        origin = "*"

    response.headers.add("Access-Control-Allow-Origin", origin)
    response.headers.add("Access-Control-Allow-Headers", "Content-Type")
    response.headers.add("Access-Control-Allow-Methods", "GET,POST,PATCH")
    response.headers.add("Access-Control-Allow-Credentials", "true")

    return response


@LOGIN.request_loader
def load_user_from_request(request):
    # Try to login using Basic Auth
    api_key = request.headers.get("Authorization")
    if api_key:
        api_key = api_key.replace("Basic ", "", 1)
        try:
            api_key = base64.b64decode(api_key)
        except (TypeError, binascii.Error):
            return None

        username = api_key[: api_key.find(b":")]
        password = api_key[api_key.find(b":") + 1 :].decode()  # noqa: E203
        user = da.authenticate_user(username, password)

        if user:
            if user.username != "rapiuser" and user.username != "r-api-system-user":
                APP.logger.info("User %s logged in from request header", user.username)

            session["user_id"] = user.uuid
            session.modified = True
            login_user(user)

            return user

        APP.logger.info("Failed login from header for %s", username)

    # we are not logged in.
    return None


# pylint: disable=unused-argument
@LOGIN.user_loader
def load_user(u_id):
    """
    Loads user information for flask-login.

    Currently u_id is not required, since user is loaded from the session.
    """
    user = da.fetch_user_info(session.get("user_id", None))
    return user


@APP.route("/api/user")
def get_user():
    """
    Returns information on the current logged in user, or an empty user object
    representing an anonymous user.
    """
    user = da.fetch_user_info(session.get("user_id", None))
    return jsonify(user.frontend_data() if user else None)


@APP.route("/api/manage/users")
def get_users():
    """
    Returns all users that the logged in user has access to. This is all users
    for admin, all users except admin users for managers, and None for regular
    users.
    """
    users = da.get_users(session.get("user_id", None))
    return jsonify(users=users)


@APP.route(
    "/api/manage/user/",
    defaults={"u_id": False},
    methods=["GET", "UPDATE", "PATCH", "POST"],
)
@APP.route("/api/manage/user/<u_id>", methods=["GET", "UPDATE", "PATCH", "POST"])
@login_required
def manage_user(u_id):
    """
    Returns user information and a list of all roles for the requested `u_id`.

    The return value from this function should be:
        JSON: {
            status: 'unchanged' | 'updated' | 'created' | 'success' | 'error',
            message?: string,
            data?: any
        }
    """

    form = request.json if request.method != "GET" else {}
    if not u_id:
        # If not provided, default to current user.
        u_id = current_user.id
        if form:
            form["id"] = u_id

    if request.method == "GET":
        retval = da.get_user(u_id, session.get("user_id", None))
    if request.method in ("UPDATE", "PATCH"):
        retval = da.update_user(form, session.get("user_id", None))
    if request.method == "POST":
        retval = da.add_user(form, session.get("user_id", None))
    return jsonify(retval)


@APP.route("/api/manage/setpassword/", defaults={"u_id": False}, methods=["POST"])
@APP.route("/api/manage/setpassword/<u_id>", methods=["POST"])
def change_userpassword(u_id):
    """
    Set password for user u_id. Administrators can set password for any user.
    Non-administrators need to present the old password or a token.
    """

    if request.method != "POST":
        return abort(400)  # Makes the linter happy

    form = request.json

    if not current_user.is_authenticated:
        return abort(403)  # Makes the linter happy

    if not u_id:
        u_id = current_user.id
    retval = da.change_password(current_user, u_id, form)
    return jsonify(retval)


@APP.route("/api/manage/role", methods=["POST", "PATCH", "UPDATE"])
@login_required
def manage_roles():
    """
    Changes or adds roles for the user identified by `u_id`, and returns a
    status a json status message.
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
    """
    form = request.json
    status = da.update_role(form, session.get("user_id", None))
    return jsonify(status)


@APP.route("/api/manage/herd", methods=["POST", "PATCH"])
@login_required
def manage_herd():
    """
    Used to insert and update herd information in the database.
    Returns a message formatted like:
        JSON: {
            status: 'unchanged' | 'updated' | 'created' | 'success' | 'error',
            message?: string,
            data?: any
        }
    """
    form = request.json
    status = {"status": "error", "message": "Unknown request"}
    if request.method == "POST":
        status = da.add_herd(form, session.get("user_id", None))
    elif request.method == "PATCH":
        status = da.update_herd(form, session.get("user_id", None))
    return jsonify(status)


@APP.route("/api/breeding/date/<birth_date>")
@login_required
def breedings_from_date(birth_date):
    breedings = da.get_breeding_events_by_date(birth_date, session.get("user_id", None))
    return jsonify(breedings=breedings)


@APP.route("/api/breeding/id/<breeding_id>")
@login_required
def breeding(breeding_id):
    breeding = da.get_breeding_event(breeding_id, session.get("user_id", None))
    return jsonify(breeding=breeding)


@APP.route("/api/breeding/<h_id>", methods=["GET", "POST"])
@login_required
def herd_breeding_list(h_id):
    """
    Returns a list of all breeding events connected to a given herd.
    If post search for a matching breeding given the birth date
    calculate breed date from birth date to find a match or take the
    exact birth date if it exists.
    """
    breedings = da.get_breeding_events_with_ind(h_id, session.get("user_id", None))

    if request.method == "POST":
        form = request.json
        birth_date = da.validate_date(form.get("birth_date", None))
        end = birth_date - datetime.timedelta(days=26)
        start = birth_date - datetime.timedelta(days=38)
        breedings = next(
            (
                item
                for item in breedings
                if item["father"] == form["father"]
                and item["mother"] == form["mother"]
                and (
                    start
                    <= (
                        da.validate_date(item.get("birth_date"))
                        - datetime.timedelta(days=30)
                        if item.get("breed_date") is None
                        else da.validate_date(item.get("breed_date"))
                    )
                    <= end
                    or (
                        da.validate_date(item.get("birth_date")) == birth_date
                        if item.get("birth_date") is not None
                        else None
                    )
                )
            ),
            None,
        )

    return jsonify(breedings=breedings)


@APP.route("/api/breeding/nextind/", methods=["POST"])
@login_required
def breeding_next_indidivual_number():
    """
    Returns the next correct individual number for a breeding ID event
    """

    if request.method == "POST":
        form = request.json
        breeding_id = form.get("id", None)

        return jsonify(
            (
                da.next_individual_number(
                    herd=form["breeding_herd"],
                    birth_date=form["birth_date"],
                    breeding_event=breeding_id,
                )
            )
        )


@APP.route("/api/breeding", methods=["POST", "PATCH"])
@login_required
def register_breeding():
    """
    Used to insert and update breeding events in the database.
    Returns a message formatted like:
        JSON: {
            status: 'success' | 'error',
            message?: string
        }
    """
    form = request.json
    status = {"status": "error", "message": "Unknown request"}
    if request.method == "POST":
        status = da.register_breeding(form, session.get("user_id", None))
    if request.method == "PATCH":
        status = da.update_breeding(form, session.get("user_id", None))
    return jsonify(status)


@APP.route("/api/breeding/delete", methods=["POST"])
@login_required
def delete_breeding():
    """
    Used to delete breeding events in the database.
    Returns a message formatted like:
        JSON: {
            status: 'success' | 'error',
            message?: string
        }
    """
    breeding_id = request.json
    status = {"status": "error", "message": "Unknown request"}
    if request.method == "POST":
        status = da.delete_breeding(breeding_id, session.get("user_id", None))
    return jsonify(status)


@APP.route("/api/birth", methods=["POST"])
@login_required
def register_birth():
    """
    Used to update breeding events in the database with birth information.
    Returns a message formatted like:
        JSON: {
            status: 'success' | 'error',
            message?: string
        }
    """
    form = request.json
    status = {"status": "error", "message": "Unknown request"}
    if request.method == "POST":
        status = da.register_birth(form, session.get("user_id", None))
    return jsonify(status)


@APP.route("/api/colors")
@login_required
def colors():
    """
    Returns all the legal colors for all genebanks.
    """
    return jsonify(da.get_colors())


@APP.route("/api/login", methods=["POST"])
def login_handler():
    """
    Parses a login form and sets session variables when logged in.
    If login fails the system will return `None`.
    The login form should be in json-format like:

        {'username': '<user>', 'password': '<pass>'}
    """
    if current_user.is_authenticated:
        return get_user()
    form = request.json
    # Authenticate the user and return a user object
    user = da.authenticate_user(form.get("username"), form.get("password"))
    if user:
        session["user_id"] = user.uuid
        session.modified = True
        login_user(user)
        APP.logger.info(
            f"Logging in user: {user.username} via the admin password interface"
        )
    else:
        APP.logger.warning(
            f"User name {form.get('username')} is not able to login using admin interface "
        )
    return get_user()


@APP.route("/api/login/<string:service>", methods=["GET", "POST"])
def external_login_handler(service):
    """
    Do an external authentication. The special service
    available responds with a list of the enabled services.
    """

    if service == "available":
        return jsonify(utils.external_auth.available_methods())

    if service not in utils.external_auth.available_methods():
        return "null"  # bad method

    if not session.get("link_account") and current_user.is_authenticated:
        return redirect(request.referrer or "/")

    if not utils.external_auth.authorized(APP, service):
        APP.logger.debug("Need to do external auth for service %s" % service)
        return redirect(url_for("%s.login" % service))

    # Hack to reuse the same external handler for both linking and login
    if session.get("link_account"):
        return redirect("/api/link/%s" % service)

    persistent_id = utils.external_auth.get_persistent(service)

    user = da.authenticate_with_credentials(service, persistent_id)

    if user:
        APP.logger.info(
            "Logging in user %s (%s - #%d) by persistent id %s for service %s, refferrer is %s"
            % (
                user.username,
                user.email,
                user.id,
                persistent_id,
                service,
                request.referrer,
            )
        )
        session["user_id"] = user.uuid
        session.modified = True
        login_user(user)
        if "accounts.google" in request.referrer:
            return redirect("/")
        return redirect(request.referrer or "/")

    if not utils.external_auth.get_autocreate(service):
        # No user - give up
        return None

    accountdetails = utils.external_auth.get_account_details(service)
    APP.logger.debug("Got accountdetails %s" % repr(accountdetails))

    user = da.register_user(
        accountdetails["email"],
        None,
        username=accountdetails["username"],
        validated=True,
        fullname=accountdetails["fullname"] if "fullname" in accountdetails else None,
        privileges=[
            {"level": "viewer", "genebank": 1},
            {"level": "viewer", "genebank": 2},
        ],
    )

    if not user:
        APP.logger.error(
            "Automatic registering of user with e-mail %s (persistent id %s) for service %s FAILED"
            % (accountdetails["email"], persistent_id, service)
        )
        return None

    linked = da.link_account(user, service, persistent_id)

    if not linked:
        APP.logger.error(
            "Linked of of user with e-mail %s (persistent id %s) for service %s FAILED"
            % (accountdetails["email"], persistent_id, service)
        )
        return None

    APP.logger.info(
        "Automatically registered user with e-mail %s (persistent id %s) for service %s"
        % (persistent_id, accountdetails["email"], service)
    )

    # FIXME: this is how we "really" log in the user
    session["user_id"] = user.uuid

    # If we got a herd from external, setup ownership
    if "herd" in accountdetails:
        for h in ["G", "M"]:
            h = h + accountdetails["herd"]
            herd = da.herd_to_herdid(h.strip())
            if herd:
                form = {
                    "action": "add",
                    "role": "owner",
                    "user": user.id,
                    "herd": herd,
                }
                da.update_role(form, user.uuid, skip_role_check=True)
            else:
                APP.logger.warning("Could not find herd id for herd %s" % h.strip())

    login_user(user)

    return redirect("/start")


@APP.route("/api/link/<string:service>", methods=["GET", "POST"])
def external_link_handler(service):
    """
    Link user to selected account. Will be logged in to that service if not.
    """
    # Something odd

    if service == "reset":
        if session.get("link_account"):
            del session["link_account"]
        return "reset"

    if service not in utils.external_auth.available_methods():
        return "null"  # bad method

    if not current_user.is_authenticated:
        return "null"  # FIXME: error code instead?

    if not utils.external_auth.authorized(APP, service):
        # Not authorized? Go back to login
        session["link_account"] = True
        return redirect("/api/login/%s" % service)

    persistent = utils.external_auth.get_persistent(service)
    linked = da.link_account(current_user, service, persistent)

    if not linked:
        # Not linked
        return "null"  # FIXME: error code instead?

    return "%d" % current_user.id


@APP.route("/api/linked", methods=["GET", "POST"])
def external_linked_accounts_handler():
    """
    Return linked services for logged in user.
    """
    # Something odd

    if not current_user.is_authenticated:
        return "null"  # FIXME: Return error code instead?

    linked = da.linked_accounts(current_user)

    if not linked:
        return "null"  # FIXME: error code instead?

    return jsonify(linked)


@APP.route("/api/unlink/<string:service>", methods=["GET", "POST"])
def external_unlink_handler(service):
    """
    Link user to selected account. Should be logged in to that service.
    """
    # Something odd

    if not current_user.is_authenticated:
        return "null"  # FIXME: 403 instead?

    unlinked = da.unlink_account(current_user, service)
    if not unlinked:
        return "null"  # FIXME: Error code instead?
    return "1"


@APP.route("/api/logout")
def logout():
    """
    Logs out the current user from the system and redirects back to main.
    """
    session.pop("user_id", None)
    logout_user()
    return get_user()


@APP.route("/api/genebanks")
@APP.route("/api/genebank/<int:g_id>")
@login_required
def genebank(g_id=None):
    """
    Returns information on the genebank given by `g_id`, or a list of all
    genebanks if no `g_id` is given.
    """
    user_id = session.get("user_id", None)
    if g_id:
        return jsonify(da.get_genebank(g_id, user_id))
    return jsonify(genebanks=da.get_genebanks(user_id))


@APP.route("/api/genebank/<int:g_id>/individuals")
@login_required
def genebank_individuals(g_id):
    """
    Returns individuals for the genebank given by `g_id`, if allowed for the
    currently logged in user.
    """
    user_id = session.get("user_id", None)
    return jsonify(individuals=da.get_individuals(g_id, user_id))


@APP.route("/api/herd/<h_id>")
@login_required
def herd(h_id):
    """
    Returns information on the herd given by `h_id`.
    """
    data = da.get_herd(h_id, session.get("user_id", None))
    return jsonify(data)


@APP.route("/api/individual/<i_number>")
@login_required
def individual(i_number):
    """
    Returns information on the individual given by `i_number`.
    """
    user_id = session.get("user_id", None)
    ind = da.get_individual(i_number, user_id)

    if ind:
        try:
            ind["inbreeding"] = "%.2f" % (
                get_ind_inbreeding(i_number, ind["genebank_id"]) * 100
            )
            ind["MK"] = "%.2f" % (
                get_ind_mean_kinship(i_number, ind["genebank_id"]) * 100
            )
        except requests.exceptions.ConnectionError as error:
            APP.logger.error("%s", error)
            ind["inbreeding"] = ind["inbreeding"] if "inbreeding" in ind else None
            ind["MK"] = None
    return jsonify(ind)


@APP.route("/api/individual", methods=["PATCH", "POST"])
@login_required
def edit_individual():
    """
    Updates an individual on `PATCH`, or creates a new individual on `POST`.

    The return value from this function should be:
        JSON: {
            status: 'success' | 'error',
            message?: string,
        }
    """
    form = request.json
    try:
        if request.method == "PATCH":
            retval = da.update_individual(form, session.get("user_id", None))
        if request.method == "POST":
            retval = da.add_individual(form, session.get("user_id", None))
    except Exception as error:
        APP.logger.error("Unexpected error when edit individual: " + str(error))
        return (
            jsonify(
                {
                    "status": "error",
                    "message": f"Be Admin kolla server loggarna ange {datetime.datetime.now()}",
                }
            ),
            500,
        )
    return jsonify(retval)


@APP.route("/api/checkindnumber", methods=["POST"])
@login_required
def check_ind_number():
    """
    Check if indivdual number exists.

    The return value from this function should be:
        JSON: {
            status: 'success' | 'error',
            message?: string,
        }
    """
    form = request.json
    try:
        if (
            db.Individual.select()
            .where(db.Individual.number == form["number"])
            .exists()
        ):
            return jsonify(
                {"status": "error", "message": "Individual number already exists"}
            )
    except Exception as error:
        APP.logger.error("Unexpected error when checking number: " + str(error))
        return (
            jsonify(
                {
                    "status": "error",
                    "message": f"Be Admin kolla server loggarna ange {datetime.datetime.now()}",
                }
            ),
            500,
        )
    return jsonify(
        {
            "status": "success",
            "message": "No duplicates",
        }
    )


@APP.route("/api/checkintyg", methods=["POST"])
@login_required
def check_ind_intyg():
    """
    Check  if certificate/intyg  exists.

    The return value from this function should be:
        JSON: {
            status: 'success' | 'error',
            message?: string,
        }
    """
    form = request.json
    try:
        if form.get("certificate", None) is not None:
            if (
                db.Individual.select()
                .where(db.Individual.certificate == form["certificate"])
                .exists()
            ):
                return jsonify(
                    {
                        "status": "error",
                        "message": "Individual certificate already exists",
                    }
                )
    except Exception as error:
        APP.logger.error("Unexpected error when checking number: " + str(error))
        return (
            jsonify(
                {
                    "status": "error",
                    "message": f"Be Admin kolla server loggarna ange {datetime.datetime.now()}",
                }
            ),
            500,
        )
    return jsonify(
        {
            "status": "success",
            "message": "No duplicates",
        }
    )


def get_ind_inbreeding(i_number, g_id):
    """
    Returns  the inbreeding coefficient of the individual given by `i_number`.
    """
    coefficients = get_inbreeding(g_id)
    if i_number in coefficients:
        return coefficients[i_number]
    return 0


@APP.route("/api/<int:g_id>/inbreeding/")
def inbreeding(g_id):
    """
    Returns all inbreeding coefficient of the genebank given  by `g_id`.
    """
    inb_coeffcient = get_inbreeding(str(g_id))
    return jsonify(inb_coeffcient)


def get_inbreeding(g_id):
    """
    Fetch ibreeding coefficient from R-API of the genebank given by `g_id`.
    """
    response = requests.get(
        "http://{}:{}/inbreeding/{}".format(
            settings.rapi.host, settings.rapi.port, g_id
        ),
        params={},
        timeout=30,
    )

    if response.status_code == 200:
        return csvparser.parse_csv(response.content)

    APP.logger.error("Could not fetch inbreeding data.")
    APP.logger.error("Error {}".format(response))
    return {}


@APP.route("/api/<int:g_id>/kinship/")
def kinship(g_id):
    """
    Returns kinship matrix of the genebank given  by `g_id`.
    """
    return jsonify(get_kinship(str(g_id)))


@CACHE.memoize(timeout=KINSHIP_LIFETIME)
def get_kinship(g_id):
    """
    Fetch kinship matrix from R-api of the genebank given  by `g_id`.
    """
    response = requests.get(
        "http://{}:{}/kinship/{}".format(settings.rapi.host, settings.rapi.port, g_id),
        params={"update_data": "TRUE"},
        timeout=30,
    )

    if response.status_code == 200:
        return csvparser.parse_kinship(response.content)

    APP.logger.error("Could not fetch kinship data.")
    APP.logger.error("Error %s", response)
    return {}


def get_ind_mean_kinship(i_number, g_id):
    """
    Returns the mean kinship coefficient of the individual given by `i_number`.
    belonging to the genebank given by `g_id`.
    In case the individual is not active, we return 0.
    """
    mk_values = get_mean_kinship(g_id)
    return mk_values[i_number] if i_number in mk_values else 0


@APP.route("/api/<int:g_id>/meankinship/")
def mean_kinship(g_id):
    """
    Returns the mean kinship list if the Genebank given by by `g_id`.
    """
    return jsonify(get_mean_kinship(str(g_id)))


def get_mean_kinship(g_id):
    """
    Fetch the mean kinship matrix from R-api of the genebank given  by `g_id`.
    """
    response = requests.get(
        "http://{}:{}/meankinship/{}".format(
            settings.rapi.host, settings.rapi.port, g_id
        ),
        params={},
        timeout=30,
    )

    if response.status_code == 200:
        return csvparser.parse_csv(response.content)

    APP.logger.error("Could not fetch mean kinship data.")
    APP.logger.error("Error %s", response)
    return {}


@APP.route("/api/testbreed", methods=["POST"])
def testbreed():
    payload = request.json
    APP.logger.info(f"Testbreed calculation input {payload}")
    try:
        # Make sure mother and father are in the active population
        user_id = session.get("user_id", None)
        father = da.get_individual(payload.get("male", ""), user_id)
        mother = da.get_individual(payload.get("female", ""), user_id)
        if (
            mother
            and father
            and father.get("is_active", False) is True
            and mother.get("is_active", False) is True
        ):
            kinship_matrix = get_kinship(request.json["genebankId"])
            offspring_coi = kinship_matrix[payload["male"]][payload["female"]]
        # One/both parents not registrered, thus not present in the kinship matrix
        else:
            payload["update_data"] = "TRUE"
            response = requests.post(
                "http://{}:{}/testbreed/".format(
                    settings.rapi.host, settings.rapi.port
                ),
                data=payload,
                timeout=30,
            )
            offspring_coi = response.json()["calculated_coi"][0]
    except Exception as ex:  # pylint: disable=broad-except
        APP.logger.error(ex)
        return jsonify({"error": "Error processing your request"}), 500

    formatted_offspring_coi = round(offspring_coi * 100, 2)
    APP.logger.info(f"Testbreed calculation result {formatted_offspring_coi}")
    return {"offspringCOI": formatted_offspring_coi}


@APP.route("/api/certificates/update/<i_number>", methods=["PATCH"])
@login_required
def update_certificate(i_number):
    """
    Returns an updated pdf of the individual given by `i_number`.
    """
    user_id = session.get("user_id", None)
    ind_data = da.get_individual(i_number, user_id)
    # get_individual currently returns a dict, not an individual
    if ind_data is None:
        return jsonify({"response": "Individual not found"}), 404

    certificate_exists = ind_data.get("digital_certificate", None)
    form = request.json
    uploaded = False

    try:
        present = check_certificate_s3(ind_number=ind_data["number"])
        if certificate_exists and present:
            breed_data = db.Breeding.get(ind_data.get("breeding")).as_dict()
            ind_data.update(**form)
            ind_data_copy = copy.copy(ind_data)
            cert_data = get_certificate_data(ind_data, user_id)
            pdf_bytes = get_certificate(cert_data)
            signed_data = sign_data(pdf_bytes)
            uploaded = upload_certificate(
                pdf_bytes=signed_data.getvalue(), ind_number=ind_data["number"]
            )
            # Update breeding if litter size has changed
            if breed_data.get("litter_size") != form.get(
                "litter_size"
            ) or breed_data.get("litter_size6w") != form.get("litter_size6w"):
                breed_data.update(litter_size6w=form.get("litter_size6w"))
                breed_data.update(litter_size=form.get("litter_size"))
                da.update_breeding(breed_data, user_id)
            da.update_individual(ind_data_copy, user_id)
    except Exception as ex:  # pylint: disable=broad-except
        APP.logger.error("Unexpected error while updating certificate: " + str(ex))
        return jsonify({"response": "Error processing your request"}), 404

    if uploaded:
        return create_pdf_response(
            pdf_bytes=signed_data.getvalue(), obj_name=f'{ind_data["certificate"]}.pdf'
        )

    return jsonify({"response": "Certificate was not updated"}), 404


@APP.route("/api/certificates/issue/<i_number>", methods=["GET", "POST"])
@login_required
def issue_certificate(i_number):
    """
    Returns an issued pdf certificate of the individual given by `i_number`.
    """
    user_id = session.get("user_id", None)
    ind_data = da.get_individual(i_number, user_id)
    # get_individual currently returns a dict, not an individual
    if ind_data is None:
        return jsonify({"response": "Individual not found"}), 404

    certificate_exists = ind_data.get("digital_certificate", None)
    paper_certificate_exists = ind_data.get("certificate", None)

    if request.method == "GET":
        try:
            present = check_certificate_s3(ind_number=ind_data["number"])
            if certificate_exists and present:
                cert = download_certificate_s3(i_number)
                return create_pdf_response(
                    pdf_bytes=cert, obj_name=f"{i_number}_certificate.pdf"
                )
        except Exception as ex:  # pylint: disable=broad-except
            print(ex)
            return jsonify({"response": "Error processing your request"}), 400

    elif request.method == "POST":
        if certificate_exists or paper_certificate_exists:
            return jsonify({"response": "Certificate already exists"}), 400

        form = request.json
        breed_data = db.Breeding.get(ind_data.get("breeding")).as_dict()
        ind_data.update(**form, issue_digital=True)
        # keep the ind_data object intact
        ind_data_copy = copy.copy(ind_data)
        # Update breeding if litter size has changed
        if breed_data.get("litter_size") != form.get("litter_size") or breed_data.get(
            "litter_size6w"
        ) != form.get("litter_size6w"):
            breed_data.update(litter_size6w=form.get("litter_size6w"))
            breed_data.update(litter_size=form.get("litter_size"))
            da.update_breeding(breed_data, user_id)
        res = da.update_individual(ind_data, user_id)
        cert_number = res.get("digital_certificate", None)
        cert_data = get_certificate_data(ind_data_copy, user_id)
        cert_data.update(digital_certificate=cert_number)
        pdf_bytes = get_certificate(cert_data)
        ind_number = ind_data["number"]
        uploaded = False

        try:
            signed_data = sign_data(pdf_bytes)
            uploaded = upload_certificate(
                pdf_bytes=signed_data.getvalue(), ind_number=ind_number
            )
        except Exception as ex:  # pylint: disable=broad-except
            print(ex)
            return jsonify({"response": "Error processing your request"}), 400

        if uploaded:
            APP.logger.info(
                f"Digital certificate for {ind_number} was created with number {cert_number}"
            )
            return create_pdf_response(
                pdf_bytes=signed_data.getvalue(), obj_name=f"{cert_number}.pdf"
            )

        return jsonify({"response": "Certificate could not be uploaded"}), 400


@APP.route("/api/certificates/preview/<i_number>", methods=["POST", "GET"])
@login_required
def preview_certificate(i_number):
    """
    Returns a preview of a pdf certificate of the individual given by `i_number`.
    """
    user_id = session.get("user_id", None)
    ind = da.get_individual(i_number, user_id)
    if ind is None:
        return jsonify({"response": "Individual not found"}), 404

    if request.method == "POST":
        form = request.json
        ind.update(**form, certificate=ind["digital_certificate"])
        data = get_certificate_data(ind, user_id)
        pdf_bytes = get_certificate(data)
    elif request.method == "GET":
        data = get_certificate_data(ind, user_id)
        pdf_bytes = get_certificate(data)

    return create_pdf_response(pdf_bytes=pdf_bytes.getvalue(), obj_name="preview.pdf")


@APP.route("/api/certificates/verify/<i_number>", methods=["POST"])
@login_required
def verify_certificate(i_number):
    """
    Returns whether an pdf certificate has been issued by us and matches our checksum.
    """
    user_id = session.get("user_id", None)
    ind = da.get_individual(i_number, user_id)
    if ind is None:
        return jsonify({"response": "Individual not found"}), 404

    uploaded_bytes = request.get_data()
    present, signed = False, False

    try:
        checksum = hashlib.sha256(uploaded_bytes).hexdigest()
        signed = verify_signature(uploaded_bytes)
        present = verify_certificate_checksum(i_number, checksum=checksum)
    except Exception as ex:  # pylint: disable=broad-except
        APP.logger.info("Unexpected error while verifying certificate " + str(ex))
        return (
            jsonify(
                {"response": "Oväntat fel vid verifiering av intyget kontakta Admin."}
            ),
            400,
        )

    if present and signed:
        return jsonify({"response": "Certificate is valid"}), 200
    elif not present and signed:
        return jsonify({"response": "Certificate valid but file not present"}), 202

    return (
        jsonify({"response": "The uploaded certificate is not valid"}),
        404,
    )


@APP.route("/", defaults={"path": ""})
@APP.route("/<path:path>")  # catch-all to allow react routing
def main(path):  # pylint: disable=unused-argument
    """
    Serves the single-page webapp.
    """
    return APP.send_static_file("index.html")


def reload_kinship():
    APP.logger.debug("Calling get_kinship to refresh cache if needed")
    for p in da.get_all_genebanks():
        try:
            get_kinship(p.id)
        except requests.exceptions.ConnectionError:
            pass


def initialize_app():
    # Set up a background job to do reload if needed
    # call often to minimize window
    scheduler = apscheduler.schedulers.background.BackgroundScheduler()
    scheduler.add_job(reload_kinship, trigger="interval", seconds=15)
    scheduler.start()
    APP.logger.info("Added background job to refresh kinship cache")
    reload_kinship()
    # Create loggers depending on Genbanks entry in database
    with db.DATABASE.atomic():
        for genebank in db.Genebank.select():
            gblogging.create_genebank_logs(settings.service.logfolder, genebank.name)


# Connect to the database, or wait for database and then connect.
while True:
    APP.logger.info("Connecting to database.")  # pylint: disable=no-member
    db.connect()
    if db.is_connected():
        break
    time.sleep(4)

# verify the database before starting the server.
if not db.verify():
    APP.logger.error("Database has errors.")  # pylint: disable=no-member
    sys.exit(1)

initialize_app()
