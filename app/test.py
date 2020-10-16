#!/usr/bin/env python3
"""
Unit tests for the herdbook.
"""

import os
import unittest

import flask

import utils.database as db
import utils.data_access as da
from herdbook import APP


class DatabaseTest(unittest.TestCase):
    """
    Database test wrapper that sets up the database connection.
    """

    TEST_DATABASE = "test_database.sqlite3"

    def setUp(self):
        """
        Initializes a sqlite3 test database with some data needed for testing.
        """
        db.set_test_database(self.TEST_DATABASE)
        db.init()

        self.insert_default()

    def tearDown(self):
        """
        Removes the sqlite3 test database file.
        """
        try:
            os.stat(self.TEST_DATABASE)
            os.remove(self.TEST_DATABASE)
        except FileNotFoundError:
            pass

    def insert_default(self):
        """
        This function saves all variables to be easily accessible later.
        """
        self.genebanks = [
            db.Genebank.get_or_create(name="genebank1")[0],
            db.Genebank.get_or_create(name="genebank2")[0],
        ]
        for genebank in self.genebanks:
            genebank.save()

        self.herds = [
            db.Herd.get_or_create(genebank=self.genebanks[0], herd=1, name="herd1")[0],
            db.Herd.get_or_create(genebank=self.genebanks[0], herd=2, name="herd2")[0],
            db.Herd.get_or_create(genebank=self.genebanks[1], herd=3, name="herd3")[0],
        ]
        for herd in self.herds:
            herd.save()

        self.individuals = [
            db.Individual.get_or_create(origin_herd=self.herds[0], number="ind-1")[0],
            db.Individual.get_or_create(origin_herd=self.herds[1], number="ind-2")[0],
            db.Individual.get_or_create(origin_herd=self.herds[2], number="ind-3")[0],
        ]
        for individual in self.individuals:
            individual.save()

        self.admin = da.register_user("admin", "pass")
        self.specialist = da.register_user("spec", "pass")
        self.manager = da.register_user("man", "pass")
        self.owner = da.register_user("owner", "pass")
        self.admin.add_role("admin", None)
        self.specialist.add_role("specialist", self.genebanks[0].id)
        self.manager.add_role("manager", self.genebanks[0].id)
        self.owner.add_role("owner", self.herds[0].id)


class TestDatabaseMapping(DatabaseTest):
    """
    Checks that the database mapping is valid.
    """

    def test_genebank(self):
        """
        Checks that the database tables exists and that SELECT queries work
        using the db.verify() function.
        """
        self.assertTrue(db.verify(False))


class TestPermissions(DatabaseTest):
    """
    Checks that users have correct permissions.
    """

    def test_admin(self):
        """
        Checks that the admin role has all permissions.
        """
        self.assertTrue(self.admin.is_admin)
        self.assertEqual(self.admin.accessible_genebanks, [1, 2])

    def test_specialist(self):
        """
        Checks that the specialist role has the correct permissions.
        """
        self.assertFalse(self.specialist.is_admin)
        self.assertEqual(self.specialist.accessible_genebanks, [1])

    def test_manager(self):
        """
        Checks that the manager role has the correct permissions.
        """
        self.assertFalse(self.manager.is_admin)
        self.assertEqual(self.manager.accessible_genebanks, [1])

    def test_owner(self):
        """
        Checks that the manager role has the correct permissions.
        """
        self.assertFalse(self.owner.is_admin)
        self.assertEqual(self.owner.accessible_genebanks, [1])

    # Test disabled as the current query doesn't work in sqlite
    # def test_get_genebanks(self):
    #     """
    #     Checks that `utils.data_access.get_genebanks` returns the correct
    #     information for all test users.
    #     """
    #     # admin
    #     genebank_ids = [g["id"] for g in da.get_genebanks(self.admin.uuid)]
    #     self.assertTrue(self.genebanks[0].id in genebank_ids)
    #     self.assertTrue(self.genebanks[1].id in genebank_ids)
    #     # specialist
    #     genebank_ids = [g["id"] for g in da.get_genebanks(self.specialist.uuid)]
    #     self.assertTrue(self.genebanks[0].id in genebank_ids)
    #     self.assertTrue(self.genebanks[1].id not in genebank_ids)
    #     # manager
    #     genebank_ids = [g["id"] for g in da.get_genebanks(self.manager.uuid)]
    #     self.assertTrue(self.genebanks[0].id in genebank_ids)
    #     self.assertTrue(self.genebanks[1].id not in genebank_ids)
    #     # owner
    #     genebank_ids = [g["id"] for g in da.get_genebanks(self.owner.uuid)]
    #     self.assertTrue(self.genebanks[0].id in genebank_ids)
    #     self.assertTrue(self.genebanks[1].id not in genebank_ids)

    def test_get_genebank(self):
        """
        Checks that `utils.data_access.get_genebank` returns the correct
        information for all test users.
        """
        # admin
        self.assertTrue(da.get_genebank(self.genebanks[0].id, self.admin.uuid))
        self.assertTrue(da.get_genebank(self.genebanks[1].id, self.admin.uuid))
        # specialist
        self.assertTrue(da.get_genebank(self.genebanks[0].id, self.specialist.uuid))
        self.assertFalse(da.get_genebank(self.genebanks[1].id, self.specialist.uuid))
        # manager
        self.assertTrue(da.get_genebank(self.genebanks[0].id, self.manager.uuid))
        self.assertFalse(da.get_genebank(self.genebanks[1].id, self.manager.uuid))
        # owner
        self.assertTrue(da.get_genebank(self.genebanks[0].id, self.owner.uuid))
        self.assertFalse(da.get_genebank(self.genebanks[1].id, self.owner.uuid))

    # Test disabled as the current query doesn't work in sqlite
    # def test_get_herd(self):
    #     """
    #     Checks that `utils.data_access.get_herd` returns the correct information
    #     for all test users.
    #     """
    #     # admin
    #     self.assertTrue(da.get_herd(self.herds[0].id, self.admin.uuid))
    #     self.assertTrue(da.get_herd(self.herds[1].id, self.admin.uuid))
    #     self.assertTrue(da.get_herd(self.herds[2].id, self.admin.uuid))
    #     # specialist
    #     self.assertTrue(da.get_herd(self.herds[0].id, self.specialist.uuid))
    #     self.assertTrue(da.get_herd(self.herds[1].id, self.specialist.uuid))
    #     self.assertFalse(da.get_herd(self.herds[2].id, self.specialist.uuid))
    #     # manager
    #     self.assertTrue(da.get_herd(self.herds[0].id, self.manager.uuid))
    #     self.assertTrue(da.get_herd(self.herds[1].id, self.manager.uuid))
    #     self.assertFalse(da.get_herd(self.herds[2].id, self.manager.uuid))
    #     # owner
    #     self.assertTrue(da.get_herd(self.herds[0].id, self.owner.uuid))
    #     self.assertTrue(da.get_herd(self.herds[1].id, self.owner.uuid))
    #     self.assertFalse(da.get_herd(self.herds[2].id, self.owner.uuid))

    def test_add_herd(self):
        """
        Checks that `utils.data_access._herd` returns the correct information
        for all test users.
        """
        # admin
        self.assertEqual(da.add_herd({'genebank':self.genebanks[0].id, 'herd':'test1'}, self.admin.uuid), {"status":"success"})
        self.assertEqual(da.add_herd({'genebank':self.genebanks[1].id, 'herd':'test2'}, self.admin.uuid), {"status":"success"})
        # specialist
        self.assertNotEqual(da.add_herd({'genebank':self.genebanks[0].id, 'herd':'test3'}, self.specialist.uuid), {"status":"success"})
        self.assertNotEqual(da.add_herd({'genebank':self.genebanks[1].id, 'herd':'test4'}, self.specialist.uuid), {"status":"success"})
        # manager
        self.assertEqual(da.add_herd({'genebank':self.genebanks[0].id, 'herd':'test5'}, self.manager.uuid), {"status":"success"})
        self.assertNotEqual(da.add_herd({'genebank':self.genebanks[1].id, 'herd':'test6'}, self.manager.uuid), {"status":"success"})
        # owner
        self.assertNotEqual(da.add_herd({'genebank':self.genebanks[0].id, 'herd':'test7'}, self.owner.uuid), {"status":"success"})
        self.assertNotEqual(da.add_herd({'genebank':self.genebanks[1].id, 'herd':'test8'}, self.owner.uuid), {"status":"success"})

    def test_get_individual(self):
        """
        Checks that `utils.data_access.get_individual` return the correct
        information for all test users.
        """
        # admin
        self.assertTrue(da.get_individual(self.individuals[0].number, self.admin.uuid))
        self.assertTrue(da.get_individual(self.individuals[1].number, self.admin.uuid))
        self.assertTrue(da.get_individual(self.individuals[2].number, self.admin.uuid))
        # specialist
        self.assertTrue(da.get_individual(self.individuals[0].number, self.specialist.uuid))
        self.assertTrue(da.get_individual(self.individuals[1].number, self.specialist.uuid))
        self.assertFalse(da.get_individual(self.individuals[2].number, self.specialist.uuid))
        # manager
        self.assertTrue(da.get_individual(self.individuals[0].number, self.manager.uuid))
        self.assertTrue(da.get_individual(self.individuals[1].number, self.manager.uuid))
        self.assertFalse(da.get_individual(self.individuals[2].number, self.manager.uuid))
        # owner
        self.assertTrue(da.get_individual(self.individuals[0].number, self.owner.uuid))
        self.assertTrue(da.get_individual(self.individuals[1].number, self.owner.uuid))
        self.assertFalse(da.get_individual(self.individuals[2].number, self.owner.uuid))

    def test_get_users(self):
        """
        Checks that `utils.data_access.get_users` return the correct information
        for all test users.
        """
        # admin
        user_ids = [u["id"] for u in da.get_users(self.admin.uuid)]
        self.assertEqual(user_ids, [1, 2, 3, 4])
        # specialist
        user_ids = da.get_users(self.specialist.uuid)
        self.assertEqual(user_ids, None)
        # manager
        user_ids = [u["id"] for u in da.get_users(self.manager.uuid)]
        self.assertEqual(user_ids, [2, 3, 4])
        # owner
        user_ids = da.get_users(self.owner.uuid)
        self.assertEqual(user_ids, None)

    def test_has_role(self):
        """
        Checks that `utils.data_access.User.has_role`return the correct information
        for all test users.
        """
        # admin
        self.assertTrue(self.admin.has_role("admin"))
        self.assertFalse(self.admin.has_role("manager", 1))
        self.assertFalse(self.admin.has_role("specialist", 1))
        self.assertFalse(self.admin.has_role("owner", 1))
        # specialist
        self.assertFalse(self.specialist.has_role("admin"))
        self.assertFalse(self.specialist.has_role("manager", 1))
        self.assertTrue(self.specialist.has_role("specialist", 1))
        self.assertFalse(self.specialist.has_role("owner", 1))
        # manager
        self.assertFalse(self.manager.has_role("admin"))
        self.assertTrue(self.manager.has_role("manager", 1))
        self.assertFalse(self.manager.has_role("specialist", 1))
        self.assertFalse(self.manager.has_role("owner", 1))
        # owner
        self.assertFalse(self.owner.has_role("admin"))
        self.assertFalse(self.owner.has_role("manager", 1))
        self.assertFalse(self.owner.has_role("specialist", 1))
        self.assertTrue(self.owner.has_role("owner", 1))

    def test_update_role(self):
        """
        Checks that `utils.data_access.update_role` performs correctly for all
        operations.
        """

        # malformed data
        self.assertEqual(da.update_role(None, self.admin.uuid)["status"], "error")
        operation = {"action": "dad", "role": "manager", "user": 1, "genebank": 1}
        self.assertEqual(da.update_role(operation, self.admin.uuid)["status"], "error")
        operation = {"action": "add", "role": "owner", "user": 1, "genebank": 1}
        self.assertEqual(da.update_role(operation, self.admin.uuid)["status"], "error")
        operation = {"action": "add", "role": "manager", "user": 1, "herd": 1}
        self.assertEqual(da.update_role(operation, self.admin.uuid)["status"], "error")

        # insufficient permissions
        operation = {"action": "add", "role": "manager", "user": 1, "genebank": 1}
        self.assertEqual(da.update_role(operation, self.owner.uuid)["status"], "error")
        self.assertEqual(da.update_role(operation, self.specialist.uuid)["status"], "error")
        operation["genebank"] = 2
        self.assertEqual(da.update_role(operation, self.manager.uuid)["status"], "error")

        # unknown target user
        operation = {"action": "add", "role": "manager", "user": -1, "genebank": 1}
        self.assertEqual(da.update_role(operation, self.admin.uuid)["status"], "error")

        # successful remove
        operation = {
            "action": "remove",
            "role": "manager",
            "user": self.manager.id,
            "genebank": 1,
        }
        self.assertEqual(da.update_role(operation, self.admin.uuid)["status"], "updated")

        # unnecessary remove
        self.assertEqual(da.update_role(operation, self.admin.uuid)["status"], "unchanged")

        # successful insert
        operation["action"] = "add"
        operation["user"] = str(operation["user"])
        self.assertEqual(da.update_role(operation, self.admin.uuid)["status"], "updated")

        # unnecessary insert
        self.assertEqual(da.update_role(operation, self.admin.uuid)["status"], "unchanged")


class FlaskTest(DatabaseTest):
    """
    Starts and stops the flask application so that endpoints can be tested.
    """

    def setUp(self):
        """
        Starts the flask APP on port `self.PORT`.
        """
        APP.config["TESTING"] = True
        APP.config["DEBUG"] = False
        APP.static_folder = "../frontend/"
        self.app = APP.test_client()
        super().setUp()


class EndpointTest(FlaskTest):
    """
    Tests flask endpoints.
    """

    # this test has been inactivated as the test runner don't have the index
    # file available in the current setup.
    # TODO: find some way to re-enable this test
    # def test_main(self):
    #     """
    #     Checks that the main endpoint (/) is available.
    #     """
    #     self.assertEqual(self.app.get("/").status_code, 200)

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


if __name__ == "__main__":
    unittest.main()
