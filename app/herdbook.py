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
import utils.inbreeding as ibc


APP = Flask(__name__, static_folder="/static")
APP.secret_key = uuid.uuid4().hex
# cookie options at https://flask.palletsprojects.com/en/1.1.x/security/
APP.config.update(
    SESSION_COOKIE_SECURE=APP.config['ENV'] != 'development',
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE='Lax' if APP.config['ENV'] == 'development' else 'Strict',
)

@APP.after_request
def after_request(response):
    """
    Callback that triggers after each request. Currently this is used to set
    CORS headers to allow a different origin when using the development server.
    """
    if APP.config['ENV'] == 'development':
        response.headers.add('Access-Control-Allow-Origin', 'http://localhost:2345')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
        response.headers.add('Access-Control-Allow-Credentials', 'true')

    return response

@APP.route('/api/user')
def get_user():
    """
    Returns information on the current logged in user, or an empty user object
    representing an anonymous user.
    """
    user = db.fetch_user_info(session.get('user_id', None))
    return jsonify(user.frontend_data() if user else None)

@APP.route('/api/users')
def get_users():
    """
    Returns all users that the logged in user has access to. This is all users
    for admin, all users except admin users for managers, and None for regular
    users.
    """
    users = db.get_users(session.get('user_id', None))
    return jsonify(users=users)

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
    user = db.authenticate_user(form.get('username'), form.get('password'))
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
        return jsonify(db.get_genebank(g_id, user_id))
    return jsonify(db.get_genebanks(user_id))

@APP.route('/api/herd/<int:h_id>')
def herd(h_id):
    """
    Returns information on the herd given by `h_id`.
    """
    data = db.get_herd(h_id, session.get('user_id', None))
    return jsonify(data)

@APP.route('/api/individual/<int:i_id>')
def individual(i_id):
    """
    Returns information on the individual given by `i_id`.
    """
    user_id = session.get('user_id', None)
    return jsonify(db.get_individual(i_id, user_id))


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
