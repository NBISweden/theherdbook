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

APP = Flask(__name__, static_folder="/static")
APP.secret_key = uuid.uuid4().hex
# cookie options at https://flask.palletsprojects.com/en/1.1.x/security/
APP.config.update(
    SESSION_COOKIE_SECURE = False if APP.config['ENV'] == 'development' else True,
    SESSION_COOKIE_HTTPONLY = True,
    SESSION_COOKIE_SAMESITE = 'Lax' if APP.config['ENV'] == 'development' else 'Strict',
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
    user_data = session.get('user_data')
    return user_data if user_data else jsonify(db.User().frontend_data())

@APP.route('/api/login', methods=['POST'])
def login():
    """
    Parses a login form and sets session variables when logged in.
    If login fails the system will default to an anonymous user.
    """

    form = request.json
    # Authenticate the user and return a user object
    user = db.authenticate_user(form.get('username'), form.get('password'))
    if user:
        session['user_data'] = user.frontend_data()
        session.modified = True

    return get_user()

@APP.route('/api/logout')
def logout():
    """
    Logs out the current user from the system and redirects back to main.
    """
    session.pop('user_data', None)
    return get_user()

@APP.route('/')
def main():
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
