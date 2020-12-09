#!/usr/bin/env python3
"""
Unit tests for the herdbook endpoints.
"""
# Fairly lax pylint settings as we want to test a lot of things

#pylint: disable=too-many-public-methods
#pylint: disable=too-many-statements

import unittest
import requests

from datetime import datetime

import flask

#pylint: disable=import-error
from herdbook import APP
from tests.database_test import DatabaseTest

HOST = "http://localhost:4200"

#pylint: disable=too-few-public-methods
class FlaskTest(DatabaseTest):
    """
    Starts and stops the flask application so that endpoints can be tested.
    """

    #pylint: disable=invalid-name
    def setUp(self):
        """
        Starts the flask APP on port `self.PORT`.
        """
        APP.config["TESTING"] = True
        APP.config["DEBUG"] = False
        APP.static_folder = "../frontend/"
        self.app = APP.test_client()
        super().setUp()

class TestEndpoints(FlaskTest):
    """
    Checks that all endpoints are valid.
    """

    def test_main(self):
        """
        Checks that the main endpoint (/) is available.
        """

        try:
            self.assertEqual(
                requests.get(HOST + '/').status_code,
                200
                )
        except requests.exceptions.ConnectionError:
            self.skipTest("Server not running")

    def test_get_user(self):
        """
        Checks that `herdbook.get_user` returns the correct user.
        """
        for test_user in [self.admin, self.manager, self.specialist, self.owner]:
            user_data = {
                "email": test_user.email,
                "is_admin": test_user.is_admin,
                "is_manager": test_user.is_manager,
                "is_owner": test_user.is_owner,
                "username": test_user.username,
                "validated": test_user.validated,
            }
            self.assertEqual(self.app.get("/api/user").get_json(), None)
            with self.app as context:
                context.post(
                    "/api/login", json={"username": test_user.email, "password": "pass"}
                )
                self.assertEqual(flask.session["user_id"].hex, test_user.uuid)
                self.assertEqual(self.app.get("/api/user").get_json(), user_data)
                context.get("/api/logout")
                self.assertEqual(self.app.get("/api/user").get_json(), None)

    def test_get_users(self):
        """
        Checks that `herdbook.get_users` returns the correct user.
        """
        user_results = [
            (
                self.admin,
                [
                    {"id": u.id, "email": u.email, "name": u.username}
                    for u in [self.admin, self.specialist, self.manager, self.owner]
                ],
            ),
            (
                self.manager,
                [
                    {"id": u.id, "email": u.email, "name": u.username}
                    for u in [self.specialist, self.manager, self.owner]
                ],
            ),
            (self.specialist, None),
            (self.owner, None),
        ]

        for user, result in user_results:
            with self.app as context:
                context.post(
                    "/api/login", json={"username": user.email, "password": "pass"}
                )
                self.assertDictEqual(
                    self.app.get("/api/manage/users").get_json(), {"users": result}
                )
                context.get("/api/logout")
                self.assertEqual(
                    self.app.get("/api/manage/users").get_json(), {"users": None}
                )

    def test_register_breeding(self):
        """
        Checks that `herdbook.register_breeding` works as intended.

        This will only do a subset of the checks that is done for the
        data_access.register_breeding function, as to avoid too much redundancy.
        """

        valid_form = {'father': self.individuals[0].number,
                      'mother': self.individuals[1].number,
                      'date': datetime.today().strftime('%Y-%m-%d')}

        # not logged in
        self.assertEqual(self.app.get("/api/breeding").get_json(), None)

        with self.app as context:
            # login
            context.post("/api/login", json={"username": self.admin.email,
                                             "password": "pass"})
            # register a valid breeding event
            response = context.post("/api/breeding", json=valid_form)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.get_json(), {'status': 'success'})


if __name__ == "__main__":
    unittest.main()
