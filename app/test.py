#!/usr/bin/env python3
"""
Unit tests for the herdbook.
"""

import os
import unittest
import requests

import utils.database as db

HOST = "http://localhost:4200"

class TestEndpoints(unittest.TestCase):
    """
    Checks that all endpoints are valid.
    """

    def test_main(self):
        """
        Checks that the main endpoint (/) is available.
        """
        self.assertEqual(
            requests.get(HOST + '/').status_code,
            200
        )

class DatabaseTest(unittest.TestCase):
    """
    Database test wrapper that sets up the database connection.
    """
    TEST_DATABASE = 'test_database.sqlite3'

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
            db.Genebank(name="genebank1"),
            db.Genebank(name="genebank2"),
        ]
        for genebank in self.genebanks:
            genebank.save()

        self.herds = [
            db.Herd(genebank=self.genebanks[0], herd=1, name="herd1"),
            db.Herd(genebank=self.genebanks[0], herd=2, name="herd2"),
            db.Herd(genebank=self.genebanks[1], herd=3, name="herd3"),
        ]
        for herd in self.herds:
            herd.save()

        self.individuals = [
            db.Individual(herd=self.herds[0], number="ind-1"),
            db.Individual(herd=self.herds[1], number="ind-2"),
            db.Individual(herd=self.herds[2], number="ind-3")
        ]
        for individual in self.individuals:
            individual.save()

        self.admin = db.register_user("admin", "pass")
        self.specialist = db.register_user("spec", "pass")
        self.manager = db.register_user("man", "pass")
        self.owner = db.register_user("owner", "pass")
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
        self.assertEqual(self.admin.genebank_permission(self.genebanks[0].id), "private")
        self.assertEqual(self.admin.genebank_permission(self.genebanks[1].id), "private")
        self.assertEqual(self.admin.herd_permission(self.herds[0].id), "private")
        self.assertEqual(self.admin.herd_permission(self.herds[1].id), "private")
        self.assertEqual(self.admin.herd_permission(self.herds[2].id), "private")

    def test_specialist(self):
        """
        Checks that the specialist role has the correct permissions.
        """
        self.assertEqual(self.specialist.genebank_permission(self.genebanks[0].id), "private")
        self.assertEqual(self.specialist.genebank_permission(self.genebanks[1].id), "public")
        self.assertEqual(self.specialist.herd_permission(self.herds[0].id), "private")
        self.assertEqual(self.specialist.herd_permission(self.herds[1].id), "private")
        self.assertEqual(self.specialist.herd_permission(self.herds[2].id), "public")

    def test_manager(self):
        """
        Checks that the manager role has the correct permissions.
        """
        self.assertEqual(self.manager.genebank_permission(self.genebanks[0].id), "private")
        self.assertEqual(self.manager.genebank_permission(self.genebanks[1].id), "public")
        self.assertEqual(self.manager.herd_permission(self.herds[0].id), "private")
        self.assertEqual(self.manager.herd_permission(self.herds[1].id), "private")
        self.assertEqual(self.manager.herd_permission(self.herds[2].id), "public")

    def test_owner(self):
        """
        Checks that the manager role has the correct permissions.
        """
        self.assertEqual(self.owner.genebank_permission(self.genebanks[0].id), "authenticated")
        self.assertEqual(self.owner.genebank_permission(self.genebanks[1].id), "public")
        self.assertEqual(self.owner.herd_permission(self.herds[0].id), "private")
        self.assertEqual(self.owner.herd_permission(self.herds[1].id), "authenticated")
        self.assertEqual(self.owner.herd_permission(self.herds[2].id), "public")

    def test_get_genebanks(self):
        """
        Checks that `utils.database.get_genebanks` returns the correct
        information for all test users.
        """
        # admin
        genebank_ids = [g['id'] for g in db.get_genebanks(self.admin.uuid)]
        self.assertTrue(self.genebanks[0].id in genebank_ids)
        self.assertTrue(self.genebanks[1].id in genebank_ids)
        # specialist
        genebank_ids = [g['id'] for g in db.get_genebanks(self.specialist.uuid)]
        self.assertTrue(self.genebanks[0].id in genebank_ids)
        self.assertTrue(self.genebanks[1].id not in genebank_ids)
        # manager
        genebank_ids = [g['id'] for g in db.get_genebanks(self.manager.uuid)]
        self.assertTrue(self.genebanks[0].id in genebank_ids)
        self.assertTrue(self.genebanks[1].id not in genebank_ids)
        # owner
        genebank_ids = [g['id'] for g in db.get_genebanks(self.owner.uuid)]
        self.assertTrue(self.genebanks[0].id in genebank_ids)
        self.assertTrue(self.genebanks[1].id not in genebank_ids)

    def test_get_genebank(self):
        """
        Checks that `utils.database.get_genebank` returns the correct
        information for all test users.
        """
        # admin
        self.assertTrue(db.get_genebank(self.genebanks[0].id, self.admin.uuid))
        self.assertTrue(db.get_genebank(self.genebanks[1].id, self.admin.uuid))
        # specialist
        self.assertTrue(db.get_genebank(self.genebanks[0].id, self.specialist.uuid))
        self.assertFalse(db.get_genebank(self.genebanks[1].id, self.specialist.uuid))
        # manager
        self.assertTrue(db.get_genebank(self.genebanks[0].id, self.manager.uuid))
        self.assertFalse(db.get_genebank(self.genebanks[1].id, self.manager.uuid))
        # owner
        self.assertTrue(db.get_genebank(self.genebanks[0].id, self.owner.uuid))
        self.assertFalse(db.get_genebank(self.genebanks[1].id, self.owner.uuid))

    def test_get_herd(self):
        """
        Checks that `utils.database.get_herd` returns the correct information
        for all test users.
        """
        # admin
        self.assertTrue(db.get_herd(self.herds[0].id, self.admin.uuid))
        self.assertTrue(db.get_herd(self.herds[1].id, self.admin.uuid))
        self.assertTrue(db.get_herd(self.herds[2].id, self.admin.uuid))
        # specialist
        self.assertTrue(db.get_herd(self.herds[0].id, self.specialist.uuid))
        self.assertTrue(db.get_herd(self.herds[1].id, self.specialist.uuid))
        self.assertFalse(db.get_herd(self.herds[2].id, self.specialist.uuid))
        # manager
        self.assertTrue(db.get_herd(self.herds[0].id, self.manager.uuid))
        self.assertTrue(db.get_herd(self.herds[1].id, self.manager.uuid))
        self.assertFalse(db.get_herd(self.herds[2].id, self.manager.uuid))
        # owner
        self.assertTrue(db.get_herd(self.herds[0].id, self.owner.uuid))
        self.assertTrue(db.get_herd(self.herds[1].id, self.owner.uuid))
        self.assertFalse(db.get_herd(self.herds[2].id, self.owner.uuid))

    def test_get_individual(self):
        """
        Checks that `utils.database.get_individual` return the correct
        information for all test users.
        """
        # admin
        self.assertTrue(db.get_individual(self.individuals[0].id, self.admin.uuid))
        self.assertTrue(db.get_individual(self.individuals[1].id, self.admin.uuid))
        self.assertTrue(db.get_individual(self.individuals[2].id, self.admin.uuid))
        # specialist
        self.assertTrue(db.get_individual(self.individuals[0].id, self.specialist.uuid))
        self.assertTrue(db.get_individual(self.individuals[1].id, self.specialist.uuid))
        self.assertFalse(db.get_individual(self.individuals[2].id, self.specialist.uuid))
        # manager
        self.assertTrue(db.get_individual(self.individuals[0].id, self.manager.uuid))
        self.assertTrue(db.get_individual(self.individuals[1].id, self.manager.uuid))
        self.assertFalse(db.get_individual(self.individuals[2].id, self.manager.uuid))
        # owner
        self.assertTrue(db.get_individual(self.individuals[0].id, self.owner.uuid))
        self.assertTrue(db.get_individual(self.individuals[1].id, self.owner.uuid))
        self.assertFalse(db.get_individual(self.individuals[2].id, self.owner.uuid))


if __name__ == '__main__':
    unittest.main()
