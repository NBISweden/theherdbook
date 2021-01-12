#!/usr/bin/env python3
"""
This file contains the main webserver of 'the herdbook'.

The server uses Flask to serve a React frontend, and connect to a postgres
database.
"""

import sys
import uuid
import time
import logging

from flask import (
    Flask,
    jsonify,
    request,
    redirect,
    session,
    url_for,
    abort
)
from flask_caching import Cache
from flask_login import login_required, login_user, logout_user, current_user, LoginManager
import requests

import utils.database as db
import utils.data_access as da
import utils.settings as settings
import utils.csvparser as csvparser
import utils.external_auth
import flask_session


APP = Flask(__name__, static_folder="/static")
APP.secret_key = uuid.uuid4().hex
# cookie options at https://flask.palletsprojects.com/en/1.1.x/security/
APP.config.update(
    #   SESSION_COOKIE_SECURE=True, # Disabled for now to simplify development workflow
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Strict',
    SESSION_TYPE='filesystem',
    DEBUG=True,  # some Flask specific configs
    CACHE_TYPE='filesystem',
    CACHE_DIR='/tmp',
    CACHE_DEFAULT_TIMEOUT=300
)

# pylint: disable=no-member
APP.logger.setLevel(logging.INFO)

utils.external_auth.setup(APP)

flask_session.Session().init_app(APP)

CACHE = Cache(APP)
LOGIN = LoginManager(APP)
LOGIN.login_view = '/login'


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


# pylint: disable=unused-argument
@LOGIN.user_loader
def load_user(u_id):
    """
    Loads user information for flask-login.

    Currently u_id is not required, since user is loaded from the session.
    """
    user = da.fetch_user_info(session.get('user_id', None))
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


@APP.route("/api/manage/user/", defaults={'u_id':False}, methods=["GET", "UPDATE", "PATCH", "POST"])
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

    form = request.json
    if not u_id:
        # If not provided, default to current user.
        u_id = current_user.id
        if form:
            form['id'] = u_id

    if request.method == "GET":
        retval = da.get_user(u_id, session.get("user_id", None))
    if request.method in ("UPDATE", "PATCH"):
        retval = da.update_user(form, session.get("user_id", None))
    if request.method == "POST":
        retval = da.add_user(form, session.get("user_id", None))
    return jsonify(retval)

@APP.route("/api/manage/setpassword/", defaults={'u_id':False}, methods=["POST"])
@APP.route("/api/manage/setpassword/<u_id>", methods=["POST"])
def change_userpassword(u_id):
    """
    Set password for user u_id. Administrators can set password for any user.
    Non-administrators need to present the old password or a token.
    """

    if request.method != "POST":
        return abort(400) # Makes the linter happy

    form = request.json

    if not current_user.is_authenticated:
        return abort(403) # Makes the linter happy


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


@APP.route("/api/breeding/<h_id>")
@login_required
def breeding_list(h_id):
    """
    Returns a list of all breeding events connected to a given herd.
    A breeding event is considered linked to a herd if any of the parents are
    currently in the herd.
    """
    breedings = da.get_breeding_events(h_id, session.get("user_id", None))
    return jsonify(breedings=breedings)


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
    return get_user()

@APP.route("/api/login/<string:service>", methods=["GET", "POST"])
def external_login_handler(service):
    """
    Do an external authentication. The special sercvice
    available responds with a list of the enabled services.
    """

    if service == 'available':
        return jsonify(utils.external_auth.available_methods())

    if not session.get("link_account") and current_user.is_authenticated:
        return get_user()

    if not utils.external_auth.authorized(APP, service):
        APP.logger.debug("Need to do external auth for service %s" %
                         service)
        return redirect(url_for("%s.login" % service))

    # Hack to reuse the same external handler for both linking and login
    if session.get("link_account"):
        return redirect("/api/link/%s" % service)

    persistent_id = utils.external_auth.get_persistent(service)

    user = da.authenticate_with_credentials(service, persistent_id)

    if user:
        APP.logger.info("Logging in user %s (#%d) by persistent id %s for service %s" %
                        (user.username, user.id, persistent_id, service))
        session["user_id"] = user.uuid
        session.modified = True
        login_user(user)
    else:
        APP.logger.info("No user linked to persistent id %s for service %s" %
                        (persistent_id, service))
        # FIXME: Return error code?

    return get_user()

@APP.route("/api/link/<string:service>", methods=["GET", "POST"])
def external_link_handler(service):
    """
    Link user to selected account. Will be logged in to that service if not.
    """
    # Something odd

    if service == "reset":
        if session.get("link_account"):
            del session['link_account']
        return "reset"

    if not current_user.is_authenticated:
        return 'null' # FIXME: error code instead?

    if not utils.external_auth.authorized(APP, service):
        # Not authorized? Go back to login
        session["link_account"] = True
        return redirect("/api/login/%s" % service)

    persistent = utils.external_auth.get_persistent(service)
    linked = da.link_account(current_user, service, persistent)

    if not linked:
        # Not linked
        return "null" # FIXME: error code instead?

    return "%d" % current_user.id

@APP.route("/api/linked", methods=["GET", "POST"])
def external_linked_accounts_handler():
    """
    Return linked services for logged in user.
    """
    # Something odd

    if not current_user.is_authenticated:
        return 'null' # FIXME: Return error code instead?

    linked = da.linked_accounts(current_user)

    if not linked:
        return "null" # FIXME: error code instead?

    return jsonify(linked)

@APP.route("/api/unlink/<string:service>", methods=["GET", "POST"])
def external_unlink_handler(service):
    """
    Link user to selected account. Should be logged in to that service.
    """
    # Something odd

    if not current_user.is_authenticated:
        return 'null' # FIXME: 403 instead?

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
                get_ind_inbreeding(i_number, ind['genebank_id']) * 100)
            ind["MK"] = "%.2f" % (get_ind_mean_kinship(
                i_number, ind['genebank_id']) * 100)
        except requests.exceptions.ConnectionError as error:
            APP.logger.error('%s', error)
            ind["inbreeding"] = ind['inbreeding'] if 'inbreeding' in ind else None
            ind["MK"] = None
    return jsonify(ind)


@APP.route("/api/individual", methods=["PATCH", "POST"])
@login_required
def edit_user():
    """
    Updates an individual on `PATCH`, or creates a new individual on `POST`.

    The return value from this function should be:
        JSON: {
            status: 'success' | 'error',
            message?: string,
        }
    """
    form = request.json
    if request.method == "PATCH":
        retval = da.update_individual(form, session.get("user_id", None))
    if request.method == "POST":
        retval = da.add_individual(form, session.get("user_id", None))
    return jsonify(retval)


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
    response = requests.get('http://{}:{}/inbreeding/{}'
                            .format(settings.rapi.host,
                                    settings.rapi.port,
                                    g_id),
                            params={})

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


def get_kinship(g_id):
    """
    Fetch kinship matrix from R-api of the genebank given  by `g_id`.
    """
    response = requests.get('http://{}:{}/kinship/{}'
                            .format(settings.rapi.host,
                                    settings.rapi.port,
                                    g_id),
                            params={})

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
    response = requests.get('http://{}:{}/meankinship/{}'
                            .format(settings.rapi.host,
                                    settings.rapi.port,
                                    g_id),
                            params={})

    if response.status_code == 200:
        return csvparser.parse_csv(response.content)

    APP.logger.error("Could not fetch mean kinship data.")
    APP.logger.error("Error %s", response)
    return {}


@APP.route("/", defaults={"path": ""})
@APP.route("/<path:path>")  # catch-all to allow react routing
def main(path):  # pylint: disable=unused-argument
    """
    Serves the single-page webapp.
    """
    return APP.send_static_file("index.html")


print(APP.url_map)


if __name__ == "__main__":
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

    APP.run(host="0.0.0.0")
