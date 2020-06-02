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
    TEST_DATABASE='test_database.sqlite3'

    def setUp(self):
        """
        Initializes a sqlite3 test database with some data needed for testing.
        """
        db.set_database(self.TEST_DATABASE, test=True)
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
        self.gb1 = db.Genebank(name="genebank1")
        self.gb1.save()
        self.gb2 = db.Genebank(name="genebank2")
        self.gb2.save()
        self.h1 = db.Herd(genebank=self.gb1, herd=1, name="herd1")
        self.h1.save()
        self.h2 = db.Herd(genebank=self.gb1, herd=2, name="herd2")
        self.h2.save()
        self.h3 = db.Herd(genebank=self.gb2, herd=3, name="herd3")
        self.h3.save()
        self.i1 = db.Individual(herd=self.h1, number="ind-1")
        self.i1.save()
        self.i2 = db.Individual(herd=self.h1, number="ind-2")
        self.i2.save()
        self.i3 = db.Individual(herd=self.h3, number="ind-3")
        self.i3.save()
        self.adm = db.register_user("admin", "pass")
        self.spec = db.register_user("spec", "pass")
        self.man = db.register_user("man", "pass")
        self.own = db.register_user("owner", "pass")
        self.adm.add_role("admin", None)
        self.spec.add_role("specialist", self.gb1.id)
        self.man.add_role("manager", self.gb1.id)
        self.own.add_role("owner", self.h1.id)

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
        self.assertEqual(self.adm.genebank_permission(self.gb1.id), "private")
        self.assertEqual(self.adm.genebank_permission(self.gb2.id), "private")
        self.assertEqual(self.adm.herd_permission(self.h1.id), "private")
        self.assertEqual(self.adm.herd_permission(self.h2.id), "private")
        self.assertEqual(self.adm.herd_permission(self.h3.id), "private")

    def test_specialist(self):
        """
        Checks that the specialist role has the correct permissions.
        """
        self.assertEqual(self.spec.genebank_permission(self.gb1.id), "private")
        self.assertEqual(self.spec.genebank_permission(self.gb2.id), "public")
        self.assertEqual(self.spec.herd_permission(self.h1.id), "private")
        self.assertEqual(self.spec.herd_permission(self.h2.id), "private")
        self.assertEqual(self.spec.herd_permission(self.h3.id), "public")

    def test_manager(self):
        """
        Checks that the manager role has the correct permissions.
        """
        self.assertEqual(self.man.genebank_permission(self.gb1.id), "private")
        self.assertEqual(self.man.genebank_permission(self.gb2.id), "public")
        self.assertEqual(self.man.herd_permission(self.h1.id), "private")
        self.assertEqual(self.man.herd_permission(self.h2.id), "private")
        self.assertEqual(self.man.herd_permission(self.h3.id), "public")

    def test_owner(self):
        """
        Checks that the manager role has the correct permissions.
        """
        self.assertEqual(self.own.genebank_permission(self.gb1.id), "authenticated")
        self.assertEqual(self.own.genebank_permission(self.gb2.id), "public")
        self.assertEqual(self.own.herd_permission(self.h1.id), "private")
        self.assertEqual(self.own.herd_permission(self.h2.id), "authenticated")
        self.assertEqual(self.own.herd_permission(self.h3.id), "public")

    def test_get_genebanks(self):
        """
        Checks that `utils.database.get_genebanks` returns the correct
        information for all test users.
        """
        # admin
        genebank_ids = [g['id'] for g in db.get_genebanks(self.adm.uuid)]
        self.assertTrue(self.gb1.id in genebank_ids)
        self.assertTrue(self.gb2.id in genebank_ids)
        # specialist
        genebank_ids = [g['id'] for g in db.get_genebanks(self.spec.uuid)]
        self.assertTrue(self.gb1.id in genebank_ids)
        self.assertTrue(self.gb2.id not in genebank_ids)
        # manager
        genebank_ids = [g['id'] for g in db.get_genebanks(self.man.uuid)]
        self.assertTrue(self.gb1.id in genebank_ids)
        self.assertTrue(self.gb2.id not in genebank_ids)
        # owner
        genebank_ids = [g['id'] for g in db.get_genebanks(self.own.uuid)]
        self.assertTrue(self.gb1.id in genebank_ids)
        self.assertTrue(self.gb2.id not in genebank_ids)

    def test_get_genebank(self):
        """
        Checks that `utils.database.get_genebank` returns the correct
        information for all test users.
        """
        # admin
        self.assertTrue(db.get_genebank(self.gb1.id, self.adm.uuid))
        self.assertTrue(db.get_genebank(self.gb2.id, self.adm.uuid))
        # specialist
        self.assertTrue(db.get_genebank(self.gb1.id, self.spec.uuid))
        self.assertFalse(db.get_genebank(self.gb2.id, self.spec.uuid))
        # manager
        self.assertTrue(db.get_genebank(self.gb1.id, self.man.uuid))
        self.assertFalse(db.get_genebank(self.gb2.id, self.man.uuid))
        # owner
        self.assertTrue(db.get_genebank(self.gb1.id, self.own.uuid))
        self.assertFalse(db.get_genebank(self.gb2.id, self.own.uuid))

    def test_get_herd(self):
        """
        Checks that `utils.database.get_herd` returns the correct information
        for all test users.
        """
        # admin
        self.assertTrue(db.get_herd(self.h1.id, self.adm.uuid))
        self.assertTrue(db.get_herd(self.h2.id, self.adm.uuid))
        self.assertTrue(db.get_herd(self.h3.id, self.adm.uuid))
        # specialist
        self.assertTrue(db.get_herd(self.h1.id, self.spec.uuid))
        self.assertTrue(db.get_herd(self.h2.id, self.spec.uuid))
        self.assertFalse(db.get_herd(self.h3.id, self.spec.uuid))
        # manager
        self.assertTrue(db.get_herd(self.h1.id, self.man.uuid))
        self.assertTrue(db.get_herd(self.h2.id, self.man.uuid))
        self.assertFalse(db.get_herd(self.h3.id, self.man.uuid))
        # owner
        self.assertTrue(db.get_herd(self.h1.id, self.own.uuid))
        self.assertTrue(db.get_herd(self.h2.id, self.own.uuid))
        self.assertFalse(db.get_herd(self.h3.id, self.own.uuid))

    def test_get_individual(self):
        """
        Checks that `utils.database.get_individual` return the correct
        information for all test users.
        """
        # admin
        self.assertTrue(db.get_individual(self.i1.id, self.adm.uuid))
        self.assertTrue(db.get_individual(self.i2.id, self.adm.uuid))
        self.assertTrue(db.get_individual(self.i3.id, self.adm.uuid))
        # specialist
        self.assertTrue(db.get_individual(self.i1.id, self.spec.uuid))
        self.assertTrue(db.get_individual(self.i2.id, self.spec.uuid))
        self.assertFalse(db.get_individual(self.i3.id, self.spec.uuid))
        # manager
        self.assertTrue(db.get_individual(self.i1.id, self.man.uuid))
        self.assertTrue(db.get_individual(self.i2.id, self.man.uuid))
        self.assertFalse(db.get_individual(self.i3.id, self.man.uuid))
        # owner
        self.assertTrue(db.get_individual(self.i1.id, self.own.uuid))
        self.assertTrue(db.get_individual(self.i2.id, self.own.uuid))
        self.assertFalse(db.get_individual(self.i3.id, self.own.uuid))


if __name__ == '__main__':
    unittest.main()
