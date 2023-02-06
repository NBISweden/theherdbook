#!/usr/bin/env python3
"""
Unit tests for the herdbook endpoints.

isort:skip_file
"""
# Fairly lax pylint settings as we want to test a lot of things

# pylint: disable=too-many-public-methods
# pylint: disable=too-many-statements
# pylint: disable=wrong-import-position

import base64
import os
import unittest
from datetime import datetime, timedelta

import flask
import requests

# Set configuration file for external accounts
os.environ.setdefault(
    "AUTHCONFIGFILE", os.path.join(os.path.dirname(__file__), "auth.ini.test")
)

# pylint: disable=import-error
import utils.database as db  # noqa: E402
from herdbook import APP  # noqa: E402
from moto import mock_s3  # noqa: E402
from tests.database_test import DatabaseTest  # noqa: E402

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
        for test_user in [self.admin, self.manager, self.viewer, self.owner]:
            user_data = {
                "email": test_user.email,
                "fullname": test_user.fullname,
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
                self.assertEqual(flask.session["user_id"].hex, test_user.uuid.hex)
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
                    {
                        "id": u.id,
                        "email": u.email,
                        "name": u.username,
                        "fullname": u.fullname,
                    }
                    for u in [self.admin, self.viewer, self.manager, self.owner]
                ],
            ),
            (
                self.manager,
                [
                    {
                        "id": u.id,
                        "email": u.email,
                        "name": u.username,
                        "fullname": u.fullname,
                    }
                    for u in [self.viewer, self.manager, self.owner]
                ],
            ),
            (self.viewer, None),
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

        # jscpd:ignore-start
        with self.app as context:
            # login
            context.post(
                "/api/login", json={"username": self.admin.email, "password": "pass"}
            )
            # register a valid breeding event
            response = context.get("/api/breeding/%s" % self.herds[0].herd)

            breedings_dict = []
            for breedings in db.Breeding.select().where(
                db.Breeding.breeding_herd == self.herds[0]
            ):
                individuals_dict = []
                for data in (
                    db.Individual.select(
                        db.Individual.number,
                        db.Individual.name,
                        db.Individual.color,
                        db.Individual.sex,
                        db.Individual.id,
                        db.Individual.origin_herd,
                        db.Individual.certificate,
                        db.Individual.digital_certificate,
                    )
                    .where(db.Individual.breeding_id == breedings.id)
                    .order_by(db.Individual.number)
                ):
                    ind = dict()
                    if data:
                        ind["number"] = data.number
                        ind["name"] = data.name
                        ind["sex"] = data.sex
                        ind["color"] = data.color.name if data.color else None
                        ind["current_herd"] = data.current_herd.herd
                        ind["is_registerd"] = (
                            True
                            if data.certificate or data.digital_certificate
                            else False
                        )
                    individuals_dict.append(ind)
                b = breedings.as_dict()
                b["individuals"] = individuals_dict
                breedings_dict.append(b)

            expected = {"breedings": breedings_dict}
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.get_json(), expected)
        # jscpd:ignore-end

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

        breedings_dict = []
        for breedings in db.Breeding.select().where(
            db.Breeding.breeding_herd == self.herds[0]
        ):
            individuals_dict = []
            for data in (
                db.Individual.select(
                    db.Individual.number,
                    db.Individual.name,
                    db.Individual.color,
                    db.Individual.sex,
                    db.Individual.id,
                    db.Individual.origin_herd,
                    db.Individual.certificate,
                    db.Individual.digital_certificate,
                )
                .where(db.Individual.breeding_id == breedings.id)
                .order_by(db.Individual.number)
            ):
                ind = dict()
                if data:
                    ind["number"] = data.number
                    ind["name"] = data.name
                    ind["sex"] = data.sex
                    ind["color"] = data.color.name if data.color else None
                    ind["current_herd"] = data.current_herd.herd
                    ind["is_registerd"] = (
                        True if data.certificate or data.digital_certificate else False
                    )
                individuals_dict.append(ind)
            b = breedings.as_dict()
            b["individuals"] = individuals_dict
            breedings_dict.append(b)

        expected_breedings = {"breedings": breedings_dict}

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
            "breeding_herd": self.herds[0].herd,
            "date": datetime.today().strftime("%Y-%m-%d"),
        }

        # not logged in
        self.assertEqual(self.app.get("/api/breeding").get_json(), None)

        # jscpd:ignore-start
        with self.app as context:
            # login
            context.post(
                "/api/login", json={"username": self.admin.email, "password": "pass"}
            )
            # register a valid breeding event
            response = context.post("/api/breeding", json=valid_form)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(
                response.get_json(),
                {"breeding_id": 5, "status": "success"},
            )
        # jscpd:ignore-end

    def test_register_birth(self):
        """
        Checks that `herdbook.register_birth` works as intended.

        This will only do a subset of the checks that is done for the
        data_access.register_birth function, as to avoid too much redundancy.
        """

        valid_form = {
            "id": self.breeding[0].id,
            "date": datetime.today().strftime("%Y-%m-%d"),
            "litter_size": 4,
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

    def test_available_auth_methods(self):
        """
        Checks that `herdbook.external_login_handler` works as intended.
        """

        response = self.app.post("/api/login/available")
        self.assertEqual(response.status_code, 200)

        available_request = response.get_json()
        available_request.sort()
        self.assertEqual(available_request, ["google", "twitter"])

    def test_no_link_without_auth(self):
        """
        Checks that `herdbook.external_link_handler` does not run without
        the user being authenticated.
        """

        response = self.app.post("/api/link/somservice")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), None)

    def test_unlink_method(self):
        """
        Checks that `herdbook.external_unlink_handler` works as intended.
        """

        # jscpd:ignore-start
        with self.app as context:
            # login
            context.post(
                "/api/login", json={"username": self.admin.email, "password": "pass"}
            )

            admin_user = db.User.select().where(db.User.email == self.admin.email).get()
            print(admin_user.id)
            db.Authenticators(
                user=admin_user.id, auth="someservice", auth_data="data"
            ).save()

            response = context.get("/api/unlink/someservice")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data.strip(), b"1")
            # jscpd:ignore-end

            with self.assertRaises(type(db.Authenticators.DoesNotExist())):
                db.Authenticators.select().where(
                    db.Authenticators.user == admin_user.id,
                    db.Authenticators.auth == "someservice",
                ).get()

    def test_linked_method(self):
        """
        Checks that `herdbook.external_linked_accounts_handler` works as intended.
        """
        # jscpd:ignore-start
        with self.app as context:
            # login
            context.post(
                "/api/login", json={"username": self.admin.email, "password": "pass"}
            )

            admin_user = db.User.select().where(db.User.email == self.admin.email).get()
            print(admin_user.id)
            db.Authenticators(
                user=admin_user.id, auth="someservice", auth_data="data"
            ).save()

            response = context.get("/api/linked")
            # jscpd:ignore-end

            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.get_json(), ["someservice"])

            response = context.get("/api/unlink/someservice")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.data.strip(), b"1")

            response = context.get("/api/linked")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.get_json(), None)

    def test_certificate_ops(self):
        """
        Checks that certificate endpoints issuing, updating and verifying work as intended.
        """

        individual = self.individuals[3].number
        individual_2 = self.individuals[4].number

        valid_issue_form = {
            "color_id": 3,
            "birth_date": datetime.now() - timedelta(days=30),
            "litter_size": 5,
            "litter_size6w": 4,
        }
        valid_update_form = {
            "color_id": 2,
            "birth_date": datetime.now() - timedelta(days=30),
            "litter_size": 5,
            "litter_size6w": 4,
        }

        mock = mock_s3()
        mock.start()

        # not logged in
        self.assertEqual(
            self.app.post("/api/certificates/issue/{individual}").get_json(), None
        )
        self.assertEqual(
            self.app.patch("/api/certificates/update/{individual}").get_json(), None
        )

        with self.app as context:
            # login
            context.post(
                "/api/login", json={"username": self.admin.email, "password": "pass"}
            )

            # Issue a certificate
            first_pdf_response = context.post(
                f"/api/certificates/issue/{individual}", json=valid_issue_form
            )
            digital_certificate = db.Individual.get(
                self.individuals[3].id
            ).digital_certificate
            self.assertEqual(digital_certificate, 100000)
            self.assertEqual(
                first_pdf_response.headers["Content-Type"], "application/pdf"
            )
            self.assertEqual(first_pdf_response.status_code, 200)

            # Issue a second certificate
            pdf_response = context.post(
                f"/api/certificates/issue/{individual_2}", json=valid_issue_form
            )
            digital_certificate = db.Individual.get(
                self.individuals[4].id
            ).digital_certificate
            self.assertEqual(digital_certificate, 100001)
            self.assertEqual(pdf_response.headers["Content-Type"], "application/pdf")
            self.assertEqual(pdf_response.status_code, 200)

            # Issue a certificate again
            response = context.post(
                f"/api/certificates/issue/{individual_2}", json=valid_issue_form
            )
            self.assertEqual(response.status_code, 400)

            # Download a certificate
            download_response = context.get(f"/api/certificates/issue/{individual}")
            self.assertEqual(
                download_response.headers["Content-Type"], "application/pdf"
            )
            self.assertEqual(download_response.status_code, 200)
            self.assertEqual(download_response.data, first_pdf_response.data)

            # Download a certificate from a non-existing individual
            download_response = context.get("/api/certificates/issue/doesnotexist")
            self.assertEqual(download_response.status_code, 404)

            # Update a certificate
            pdf_response = context.patch(
                f"/api/certificates/update/{individual}", json=valid_update_form
            )
            self.assertEqual(pdf_response.status_code, 200)
            self.assertEqual(pdf_response.headers["Content-Type"], "application/pdf")
            color = db.Individual.get(self.individuals[0].id).color.id
            self.assertEqual(color, 1)

            # Get the preview of a unsigned certificate
            unsigned_response = context.get(f"/api/certificates/preview/{individual}")
            self.assertEqual(unsigned_response.status_code, 200)
            self.assertEqual(
                unsigned_response.headers["Content-Type"], "application/pdf"
            )

            unsigned_response = context.post(
                f"/api/certificates/preview/{individual}", json=valid_issue_form
            )
            self.assertEqual(unsigned_response.status_code, 200)
            self.assertEqual(
                unsigned_response.headers["Content-Type"], "application/pdf"
            )

            # Verify using an unsigned certificate
            response = context.post(
                f"/api/certificates/verify/{individual}", data=unsigned_response.data
            )
            self.assertEqual(response.status_code, 404)
            self.assertEqual(
                response.get_json(),
                {"response": "The uploaded certificate is not valid"},
            )

            # Verify using some random data
            response = context.post(
                f"/api/certificates/verify/{individual}", data=b"some random bytes"
            )
            self.assertEqual(response.status_code, 404)
            self.assertEqual(
                response.get_json(),
                {"response": "The uploaded certificate is not valid"},
            )

            # Verify an old certificate
            response = context.post(
                f"/api/certificates/verify/{individual}", data=first_pdf_response.data
            )
            self.assertEqual(response.status_code, 202)

            # Verify a valid certificate
            response = context.post(
                f"/api/certificates/verify/{individual}", data=pdf_response.data
            )
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.get_json(), {"response": "Certificate is valid"})
            mock.stop()


if __name__ == "__main__":
    unittest.main()
