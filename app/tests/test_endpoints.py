#!/usr/bin/env python3
"""
Unit tests for the herdbook endpoints.
"""
# Fairly lax pylint settings as we want to test a lot of things

# pylint: disable=too-many-public-methods
# pylint: disable=too-many-statements

import base64
import unittest

from datetime import datetime

import requests
import flask

# pylint: disable=import-error
import utils.database as db
from herdbook import APP
from tests.database_test import DatabaseTest

HOST = "http://localhost:4200"

# pylint: disable=too-few-public-methods
class FlaskTest(DatabaseTest):
    """
    Starts and stops the flask application so that endpoints can be tested.
    """

    # pylint: disable=invalid-name
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
            self.assertEqual(requests.get(HOST + "/").status_code, 200)
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

    def test_breeding_list(self):
        """
        Checks that `herdbook.breeding_list` returns the intended information.
        """

        # not logged in
        self.assertEqual(self.app.get("/api/breeding").get_json(), None)

        with self.app as context:
            # login
            context.post(
                "/api/login", json={"username": self.admin.email, "password": "pass"}
            )
            # register a valid breeding event
            response = context.get("/api/breeding/%s" % self.herds[0].herd)

            breeding = db.Breeding.get(self.breeding[-1].id)
            expected = {"breedings": [breeding.as_dict()]}
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.get_json(), expected)

    def test_request_loader_breeding(self):
        """
        Checks that `herdbook.load_user_from_request` works as intended for
        authenticating the supplied user.
        """

        herd = self.herds[0].herd

        # not logged in
        self.assertEqual(self.app.get("/api/breeding/%s" % herd).get_json(), None)

        self.assertEqual(
            self.app.get(
                "/api/breeding/%s" % herd, headers=[("Authorization", "somethingwrong")]
            ).get_json(),
            None,
        )

        auth_head = base64.encodebytes(
            bytes(self.admin.email, "utf-8") + b":pass"
        ).strip()

        expected_breedings = {
            "breedings": [db.Breeding.get(self.breeding[-1].id).as_dict()]
        }

        response = self.app.get(
            "/api/breeding/%s" % herd,
            headers=[("Authorization", b"Basic " + auth_head)],
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), expected_breedings)

    def test_register_breeding(self):
        """
        Checks that `herdbook.register_breeding` works as intended.

        This will only do a subset of the checks that is done for the
        data_access.register_breeding function, as to avoid too much redundancy.
        """

        valid_form = {
            "father": self.individuals[0].number,
            "mother": self.individuals[1].number,
            "date": datetime.today().strftime("%Y-%m-%d"),
        }

        # not logged in
        self.assertEqual(self.app.get("/api/breeding").get_json(), None)

        with self.app as context:
            # login
            context.post(
                "/api/login", json={"username": self.admin.email, "password": "pass"}
            )
            # register a valid breeding event
            response = context.post("/api/breeding", json=valid_form)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.get_json(), {"status": "success"})

    def test_register_birth(self):
        """
        Checks that `herdbook.register_birth` works as intended.

        This will only do a subset of the checks that is done for the
        data_access.register_birth function, as to avoid too much redundancy.
        """

        valid_form = {
            "id": self.breeding[0].id,
            "date": datetime.today().strftime("%Y-%m-%d"),
            "litter": 4,
        }

        # not logged in
        self.assertEqual(self.app.post("/api/birth", json=valid_form).get_json(), None)

        with self.app as context:
            # login
            context.post(
                "/api/login", json={"username": self.admin.email, "password": "pass"}
            )
            # register a valid breeding event
            response = context.post("/api/birth", json=valid_form)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.get_json(), {"status": "success"})

    def test_update_breeding(self):
        """
        Checks that `herdbook.update_breeding` works as intended.

        This will only do a subset of the checks that is done for the
        data_access.update_breeding function, as to avoid too much redundancy.
        """

        valid_form = {
            "id": self.breeding[0].id,
            "birth_date": datetime.today().strftime("%Y-%m-%d"),
            "litter_size": 4,
        }

        # not logged in
        self.assertEqual(
            self.app.post("/api/breeding", json=valid_form).get_json(), None
        )

        with self.app as context:
            # login
            context.post(
                "/api/login", json={"username": self.admin.email, "password": "pass"}
            )
            # register a valid breeding event
            response = context.patch("/api/breeding", json=valid_form)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.get_json(), {"status": "success"})


if __name__ == "__main__":
    unittest.main()
