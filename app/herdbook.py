#!/usr/bin/env python3
"""
This file contains the main webserver of 'the herdbook'.

The server uses Flask to serve a React frontend, and connect to a postgres
database.
"""

import sys
import uuid
import time
from flask import (
    Flask,
    jsonify,
    request,
    session,
)

import utils.database as db
import utils.data_access as da
import utils.inbreeding as ibc


APP = Flask(__name__, static_folder="/static")
APP.secret_key = uuid.uuid4().hex
# cookie options at https://flask.palletsprojects.com/en/1.1.x/security/
APP.config.update(
#   SESSION_COOKIE_SECURE=True, # Disabled for now to simplify development workflow
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Strict',
)

@APP.after_request
def after_request(response):
    """
    Callback that triggers after each request. Currently this is used to set
    CORS headers to allow a different origin when using the development server.
    """

    if 'Origin' in request.headers:
        origin = request.headers['Origin']
    else:
        origin = '*'

    response.headers.add('Access-Control-Allow-Origin', origin)
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,UPDATE')
    response.headers.add('Access-Control-Allow-Credentials', 'true')

    return response

@APP.route('/api/user')
def get_user():
    """
    Returns information on the current logged in user, or an empty user object
    representing an anonymous user.
    """
    user = da.fetch_user_info(session.get('user_id', None))
    return jsonify(user.frontend_data() if user else None)

@APP.route('/api/manage/users')
def get_users():
    """
    Returns all users that the logged in user has access to. This is all users
    for admin, all users except admin users for managers, and None for regular
    users.
    """
    users = da.get_users(session.get('user_id', None))
    return jsonify(users=users)

@APP.route('/api/manage/user/<int:u_id>', methods=['GET', 'UPDATE', 'POST'])
def manage_user(u_id):
    """
    Returns user information and a list of all roles for the requested `u_id`.
    """
    if request.method == 'GET':
        user = da.get_user(u_id, session.get('user_id', None))
        return jsonify(user)
    if request.method == 'UPDATE':
        form = request.json
        status = da.update_user(form, session.get('user_id', None))
    if request.method == 'POST':
        form = request.json
        return jsonify(da.add_user(form, session.get('user_id', None)))
    return jsonify(status=status)

@APP.route('/api/manage/role', methods=['POST'])
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

    The return value will be formatted like: `{status: <message>}`, where the
    message is `updated`, `unchanged` or `failed`.
    """
    form = request.json
    status = da.update_role(form, session.get('user_id', None))
    return jsonify(status=status)

@APP.route('/api/manage/herd', methods=['POST', 'UPDATE'])
def manage_herd():
    """
    Used to insert and update herd information in the database.
    Returns "created", "updated", or "failed".
    """
    form = request.json
    status = "failed"
    if request.method == 'POST':
        status = da.add_herd(form, session.get('user_id', None))
    elif request.method == 'UPDATE':
        status = da.update_herd(form, session.get('user_id', None))
    return jsonify(status=status)

@APP.route('/api/login', methods=['POST'])
def login():
    """
    Parses a login form and sets session variables when logged in.
    If login fails the system will return `None`.
    The login form should be in json-format like:

        {'username': '<user>', 'password': '<pass>'}
    """

    form = request.json
    # Authenticate the user and return a user object
    user = da.authenticate_user(form.get('username'), form.get('password'))
    if user:
        session['user_id'] = user.uuid
        session.modified = True

    return get_user()

@APP.route('/api/logout')
def logout():
    """
    Logs out the current user from the system and redirects back to main.
    """
    session.pop('user_id', None)
    return get_user()

@APP.route('/api/genebanks')
@APP.route('/api/genebank/<int:g_id>')
def genebank(g_id=None):
    """
    Returns information on the genebank given by `g_id`, or a list of all
    genebanks if no `g_id` is given.
    """
    user_id = session.get('user_id', None)
    if g_id:
        return jsonify(da.get_genebank(g_id, user_id))
    return jsonify(genebanks=da.get_genebanks(user_id))

@APP.route('/api/herd/<h_id>')
def herd(h_id):
    """
    Returns information on the herd given by `h_id`.
    """
    data = da.get_herd(h_id, session.get('user_id', None))
    return jsonify(data)

@APP.route('/api/individual/<int:i_id>')
def individual(i_id):
    """
    Returns information on the individual given by `i_id`.
    """
    user_id = session.get('user_id', None)
    return jsonify(da.get_individual(i_id, user_id))


@APP.route('/api/inbreeding/<int:i_id>')
def inbreeding(i_id):
    """
    Returns the inbreeding coefficient of the individual given by `i_id`.
    """
    collections = ibc.get_pedigree_collections()
    coefficients = ibc.calculate_inbreeding(collections)
    i_id = str(i_id)

    if i_id in coefficients:
        return jsonify({i_id : coefficients[i_id]})

    return jsonify({i_id: "Not found"}), 404


@APP.route('/', defaults={'path': ''})
@APP.route('/<path:path>') # catch-all to allow react routing
def main(path): #pylint: disable=unused-argument
    """
    Serves the single-page webapp.
    """
    return APP.send_static_file('index.html')

if __name__ == '__main__':
    # Connect to the database, or wait for database and then connect.
    while True:
        APP.logger.info("Connecting to database.") #pylint: disable=no-member
        db.connect()
        if db.is_connected():
            break
        time.sleep(4)

    # verify the database before starting the server.
    if not db.verify():
        APP.logger.error("Database has errors.")  #pylint: disable=no-member
        sys.exit(1)

    APP.run(host="0.0.0.0")
