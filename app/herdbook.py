#!/usr/bin/env python3
"""
This file contains the main webserver of 'the herdbook'.

The server uses Flask to serve a React frontend, and connect to a postgres
database.
"""

import sys
import time
from flask import Flask, render_template, jsonify

import utils.database as db

APP = Flask(__name__, static_folder="/static")


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
