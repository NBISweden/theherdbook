#!/usr/bin/env python3
"""
This file contains the main webserver of 'the herdbook'.

The server uses Flask to serve a React frontend, and connect to a postgres
database.
"""

import sys
import uuid
import time
import json
from flask import (
    Flask,
    jsonify,
    request,
    session
)

from werkzeug.urls import url_parse
import utils.database as db
import utils.data_access as da
import utils.settings as settings
import utils.csvparser as csvparser
import logging
from flask_caching import Cache
from flask_login import login_required, login_user, logout_user, current_user, LoginManager
import requests
import os


APP = Flask(__name__, static_folder="/static")
APP.secret_key = uuid.uuid4().hex
# cookie options at https://flask.palletsprojects.com/en/1.1.x/security/
APP.config.update(
    #   SESSION_COOKIE_SECURE=True, # Disabled for now to simplify development workflow
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Strict',
    DEBUG=True,  # some Flask specific configs
    CACHE_TYPE='filesystem',
    CACHE_DIR='/tmp',
    CACHE_DEFAULT_TIMEOUT=300
)

APP.logger.setLevel(logging.INFO)

cache = Cache(APP)
login = LoginManager(APP)
login.login_view = '/login'


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
    response.headers.add("Access-Control-Allow-Methods", "GET,POST,UPDATE")
    response.headers.add("Access-Control-Allow-Credentials", "true")

    return response


@login.user_loader
def load_user(id):
    # id is not required, since user is loaded from the session. Method added to support flask-login
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


@APP.route("/api/manage/user/<u_id>", methods=["GET", "UPDATE", "POST"])
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
    if request.method == "GET":
        retval = da.get_user(u_id, session.get("user_id", None))
    if request.method == "UPDATE":
        form = request.json
        retval = da.update_user(form, session.get("user_id", None))
    if request.method == "POST":
        form = request.json
        retval = da.add_user(form, session.get("user_id", None))
    return jsonify(retval)


@APP.route("/api/manage/role", methods=["POST", "UPDATE"])
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


@APP.route("/api/manage/herd", methods=["POST", "UPDATE"])
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
    elif request.method == "UPDATE":
        status = da.update_herd(form, session.get("user_id", None))
    return jsonify(status)


@APP.route("/api/login", methods=["POST"])
def loginHandler():
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
        ind["inbreeding"] = "%.2f" % (get_ind_inbreeding(ind['number'], ind['genebank_id']) * 100)
        ind["MK"] = "%.2f" % (get_ind_mean_kinship(ind['number'], ind['genebank_id']) * 100)
    return jsonify(ind)


def get_ind_inbreeding(i_number, g_id):
    """
    Returns  the inbreeding coefficient of the individual given by `i_number`.
    """
    id = str(i_number)
    coefficients = get_inbreeding(g_id)
    if id in coefficients:
        return coefficients[id]
    return None


@APP.route("/api/<int:g_id>/inbreeding/")
def inbreeding(g_id):
    id = str(g_id)
    inb_coeffcient = get_inbreeding(id)
    return jsonify(inb_coeffcient)


def get_inbreeding(g_id):
    response = requests.get('http://{}:{}/inbreeding/{}'.format(settings.rapi.host, settings.rapi.port, g_id),
                             params={})

    if response.status_code == 200:
        return csvparser.parse_csv(response.content)

    else:
        APP.logger.error("Could not fetch inbreeding data.")
        APP.logger.error("Error {}".format(response))
        return {}


@APP.route("/api/<int:g_id>/kinship/")
def kinship(g_id):
    id = str(g_id)
    kinship = get_kinship(id)
    return jsonify(kinship)


def get_kinship(g_id):
    response = requests.get('http://{}:{}/kinship/{}'.format(settings.rapi.host, settings.rapi.port, g_id),
                             params={})

    if response.status_code == 200:
        return csvparser.parse_kinship(response.content)

    else:
        APP.logger.error("Could not fetch kinship data.")
        APP.logger.error("Error {}".format(response))
        return {}


def get_ind_mean_kinship(i_number, g_id):
    """
    Returns the mean kinship coefficient of the individual given by `i_number`.
    """
    id = str(i_number)
    mean_kinship = get_mean_kinship(g_id)
    if id in mean_kinship:
        return mean_kinship[id]
    return None


@APP.route("/api/<int:g_id>/kinship/")
def mean_kinship(g_id):
    id = str(g_id)
    mean_kinship = get_mean_kinship(id)
    return jsonify(mean_kinship)


@APP.route("/api/<int:g_id>/meankinship/")
def get_mean_kinship(g_id):
    response = requests.get('http://{}:{}/meankinship/{}'.format(settings.rapi.host, settings.rapi.port, g_id),
                             params={})

    if response.status_code == 200:
        return csvparser.parse_csv(response)

    else:
        APP.logger.error("Could not fetch kinship data.")
        APP.logger.error("Error {}".format(response))
        return {}


@APP.route("/", defaults={"path": ""})
@APP.route("/<path:path>")  # catch-all to allow react routing
def main(path):  # pylint: disable=unused-argument
    """
    Serves the single-page webapp.
    """
    return APP.send_static_file("index.html")


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
