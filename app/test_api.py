#!/usr/bin/env python3
"""
Unit tests for the herdbook.
"""

import os
import unittest

import flask

import utils.database as db
import utils.data_access as da
from copy import copy
from datetime import datetime, timedelta
from werkzeug.security import check_password_hash
from herdbook import APP

HOST = "http://localhost:4200"

class TestEndpoints(unittest.TestCase):
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

        self.colors = [
            db.Colour.get_or_create(name="bleighe", genebank=self.genebanks[0])[0],
            db.Colour.get_or_create(name="stgröhn", genebank=self.genebanks[0])[0],
            db.Colour.get_or_create(name="bläåh", genebank=self.genebanks[1])[0],
        ]
        for color in self.colors:
            color.save()

        self.herds = [
            db.Herd.get_or_create(genebank=self.genebanks[0],
                                  herd='H1', herd_name="herd1",
                                  name='o1', name_privacy = 'private',
                                  email = 'o@h1', email_privacy = 'authenticated',
                                  www = 'www1', www_privacy = 'public')[0],
            db.Herd.get_or_create(genebank=self.genebanks[0],
                                  herd='H2', herd_name="herd2",
                                  name='o2', name_privacy = 'authenticated',
                                  email = 'o@h2', email_privacy = 'public',
                                  www = 'www2', www_privacy = 'private')[0],
            db.Herd.get_or_create(genebank=self.genebanks[1],
                                  herd='H3', herd_name="herd3",
                                  name='o3', name_privacy = 'public',
                                  email = 'o@h3', email_privacy = 'private',
                                  www = 'www3', www_privacy = 'authenticated')[0],
        ]
        for herd in self.herds:
            herd.save()

        parent_breeding = db.Breeding.get_or_create(breed_date="2019-01-01", litter_size=2)[0]

        self.parents = [
            db.Individual.get_or_create(origin_herd=self.herds[0], breeding=parent_breeding, number='P1')[0],
            db.Individual.get_or_create(origin_herd=self.herds[0], breeding=parent_breeding, number='P2')[0],
        ]
        for parent in self.parents:
            parent.save()

        self.breeding = [
            db.Breeding.get_or_create(breed_date="2020-01-01", mother=self.parents[0], father=self.parents[1], litter_size=2)[0],
            db.Breeding.get_or_create(breed_date="2020-01-01", mother=self.parents[0], father=self.parents[1], litter_size=1)[0],
        ]
        for breeding in self.breeding:
            breeding.save()

        self.individuals = [
            db.Individual.get_or_create(origin_herd=self.herds[0], breeding=self.breeding[0], colour=self.colors[0], number="H1-1")[0],
            db.Individual.get_or_create(origin_herd=self.herds[1], breeding=self.breeding[0], number="H2-2")[0],
            db.Individual.get_or_create(origin_herd=self.herds[2], breeding=self.breeding[1], number="H3-3")[0],
        ]
        for individual in self.individuals:
            individual.save()

        self.weights = [
            db.Weight.get_or_create(individual=self.individuals[0], weight=2.1, weight_date=datetime(2020,2,2))[0],
        ]
        for weight in self.weights:
            weight.save()

        self.bodyfat = [
            db.Bodyfat.get_or_create(individual=self.individuals[0], bodyfat='low', bodyfat_date=datetime(2020,2,2))[0],
        ]
        for bodyfat in self.bodyfat:
            bodyfat.save()

        self.admin = da.register_user("admin", "pass")
        self.specialist = da.register_user("spec", "pass")
        self.manager = da.register_user("man", "pass")
        self.owner = da.register_user("owner", "pass")
        self.admin.add_role("admin", None)
        self.specialist.add_role("specialist", self.genebanks[0].id)
        self.manager.add_role("manager", self.genebanks[0].id)
        self.owner.add_role("owner", self.herds[0].id)

        self.herd_tracking = [
            db.HerdTracking.get_or_create(herd=self.herds[0], signature=self.manager, individual=self.individuals[0], herd_tracking_date=datetime.now())[0],
            db.HerdTracking.get_or_create(herd=self.herds[1], signature=self.manager, individual=self.individuals[1], herd_tracking_date=datetime.now())[0],
            db.HerdTracking.get_or_create(herd=self.herds[0], signature=self.manager, individual=self.individuals[2], herd_tracking_date=datetime.now() - timedelta(days=1))[0],
            db.HerdTracking.get_or_create(from_herd=self.herds[0], herd=self.herds[2], signature=self.manager, individual=self.individuals[2], herd_tracking_date=datetime.now())[0],
        ]


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

    def test_can_edit(self):
        """
        Checks that `utils.database.User.can_edit` performs correctly for all
        permissions.
        """
        # Admin
        for genebank in self.genebanks:
            self.assertEqual(self.admin.can_edit(genebank.name), True)
        for herd in self.herds:
            self.assertEqual(self.admin.can_edit(herd.herd), True)
        for individual in self.individuals:
            self.assertEqual(self.admin.can_edit(individual.number), True)

        # Manager
        self.assertEqual(self.manager.can_edit(self.genebanks[0].name), True)
        self.assertEqual(self.manager.can_edit(self.genebanks[1].name), False)

        self.assertEqual(self.manager.can_edit(self.herds[0].herd), True)
        self.assertEqual(self.manager.can_edit(self.herds[1].herd), True)
        self.assertEqual(self.manager.can_edit(self.herds[2].herd), False)

        self.assertEqual(self.manager.can_edit(self.individuals[0].number), True)
        self.assertEqual(self.manager.can_edit(self.individuals[1].number), True)
        self.assertEqual(self.manager.can_edit(self.individuals[2].number), False)

        # Specialist
        self.assertEqual(self.specialist.can_edit(self.genebanks[0].name), False)
        self.assertEqual(self.specialist.can_edit(self.genebanks[1].name), False)

        self.assertEqual(self.specialist.can_edit(self.herds[0].herd), False)
        self.assertEqual(self.specialist.can_edit(self.herds[1].herd), False)
        self.assertEqual(self.specialist.can_edit(self.herds[2].herd), False)

        self.assertEqual(self.specialist.can_edit(self.individuals[0].number), False)
        self.assertEqual(self.specialist.can_edit(self.individuals[1].number), False)
        self.assertEqual(self.specialist.can_edit(self.individuals[2].number), False)

        # Owner
        self.assertEqual(self.owner.can_edit(self.genebanks[0].name), False)
        self.assertEqual(self.owner.can_edit(self.genebanks[1].name), False)

        self.assertEqual(self.owner.can_edit(self.herds[0].herd), True)
        self.assertEqual(self.owner.can_edit(self.herds[1].herd), False)
        self.assertEqual(self.owner.can_edit(self.herds[2].herd), False)

        self.assertEqual(self.owner.can_edit(self.individuals[0].number), True)
        self.assertEqual(self.owner.can_edit(self.individuals[1].number), False)
        self.assertEqual(self.owner.can_edit(self.individuals[2].number), False)


class TestDatabase(DatabaseTest):
    """
    Checks that the functions and classes in database.py are working as
    intended.
    """

    def test_genebank(self):
        """
        Checks the database.Genebank class.
        """
        # .short_info()
        gb0_info = self.genebanks[0].short_info()
        gb0_expected = {'id': self.genebanks[0].id,
                        'name': self.genebanks[0].name,
                        'herds': [
                            {'id': self.herds[0].id,
                             'herd': self.herds[0].herd,
                             'genebank': self.genebanks[0].id,
                             'herd_name': self.herds[0].herd_name,
                             'is_active': self.herds[0].is_active},
                            {'id': self.herds[1].id,
                             'herd': self.herds[1].herd,
                             'genebank': self.genebanks[0].id,
                             'herd_name': self.herds[1].herd_name,
                             'is_active': self.herds[1].is_active},
                        ]}
        self.assertDictEqual(gb0_info, gb0_expected)

        gb1_info = self.genebanks[1].short_info()
        gb1_expected = {'id': self.genebanks[1].id,
                        'name': self.genebanks[1].name,
                        'herds': [
                            {'id': self.herds[2].id,
                             'herd': self.herds[2].herd,
                             'genebank': self.genebanks[1].id,
                             'herd_name': self.herds[2].herd_name,
                             'is_active': self.herds[2].is_active},
                        ]}
        self.assertDictEqual(gb1_info, gb1_expected)

        # .get_herds()
        # This function is permission dependent, so it needs to be tested for
        # each user. We just test this with genebank0 for now, as I'm lazy.

        def all_herd_fields(index):
            """
            Returns a dict with all herd fields except 'email_validated'.
            We can't use the as_dict() function here, as it doesn't return
            fields where the value is None.
            """
            return {'id': self.herds[index].id,
                    'genebank': self.herds[index].__dict__['__data__']['genebank'],
                    'herd': self.herds[index].herd,
                    'herd_name': self.herds[index].herd_name,
                    'is_active': self.herds[index].is_active,
                    'start_date': self.herds[index].start_date,
                    'name': self.herds[index].name,
                    'name_privacy': self.herds[index].name_privacy,
                    'physical_address': self.herds[index].physical_address,
                    'physical_address_privacy': self.herds[index].physical_address_privacy,
                    'location': self.herds[index].location,
                    'location_privacy': self.herds[index].location_privacy,
                    'email': self.herds[index].email,
                    'email_privacy': self.herds[index].email_privacy,
                    'www': self.herds[index].www,
                    'www_privacy': self.herds[index].www_privacy,
                    'mobile_phone': self.herds[index].mobile_phone,
                    'mobile_phone_privacy': self.herds[index].mobile_phone_privacy,
                    'wire_phone': self.herds[index].wire_phone,
                    'wire_phone_privacy': self.herds[index].wire_phone_privacy,
                    'latitude': self.herds[index].latitude,
                    'longitude': self.herds[index].longitude,
                    'coordinates_privacy': self.herds[index].coordinates_privacy
                    }

        # admin
        gb0_herds = self.genebanks[0].get_herds(self.admin)
        gb0_expected = [all_herd_fields(0), all_herd_fields(1)]

        self.assertDictEqual(gb0_herds[0], gb0_expected[0])
        self.assertDictEqual(gb0_herds[1], gb0_expected[1])

        # manager
        gb0_herds = self.genebanks[0].get_herds(self.manager)
        self.assertDictEqual(gb0_herds[0], gb0_expected[0])
        self.assertDictEqual(gb0_herds[1], gb0_expected[1])

        # specialist
        gb0_herds = self.genebanks[0].get_herds(self.specialist)
        self.assertDictEqual(gb0_herds[0], gb0_expected[0])
        self.assertDictEqual(gb0_herds[1], gb0_expected[1])

        # owner / authenticated
        gb0_herds = self.genebanks[0].get_herds(self.owner)

        del gb0_expected[1]['name_privacy']
        del gb0_expected[1]['physical_address']
        del gb0_expected[1]['physical_address_privacy']
        del gb0_expected[1]['location']
        del gb0_expected[1]['location_privacy']
        del gb0_expected[1]['www']
        del gb0_expected[1]['www_privacy']
        del gb0_expected[1]['mobile_phone']
        del gb0_expected[1]['mobile_phone_privacy']
        del gb0_expected[1]['wire_phone']
        del gb0_expected[1]['wire_phone_privacy']
        del gb0_expected[1]['latitude']
        del gb0_expected[1]['longitude']
        del gb0_expected[1]['coordinates_privacy']
        del gb0_expected[1]['email_privacy']

        self.assertDictEqual(gb0_herds[0], gb0_expected[0])
        self.assertDictEqual(gb0_herds[1], gb0_expected[1])

    def test_herd(self):
        """
        Checks the database.Herd class.
        """
        # .individuals()
        h0_expected = [self.individuals[0]]
        h1_expected = [self.individuals[1]]
        h2_expected = [self.individuals[2]]
        self.assertListEqual(self.herds[0].individuals, h0_expected)
        self.assertListEqual(self.herds[1].individuals, h1_expected)
        self.assertListEqual(self.herds[2].individuals, h2_expected)

        # .short_info()
        for herd in self.herds:
            expected = {"id": herd.id,
                        "herd": herd.herd,
                        "genebank": herd.__dict__['__data__']['genebank'],
                        "herd_name": herd.herd_name,
                        "is_active": herd.is_active,
                        }
            self.assertDictEqual(herd.short_info(), expected)

        # .filtered_dict()

        # admin
        h0_result = self.herds[0].filtered_dict(self.admin)
        h1_result = self.herds[1].filtered_dict(self.admin)
        h0_expected = self.herds[0].as_dict()
        h1_expected = self.herds[1].as_dict()

        self.assertDictEqual(h0_result, h0_expected)
        self.assertDictEqual(h1_result, h1_expected)

        # manager
        h0_result = self.herds[0].filtered_dict(self.manager)
        h1_result = self.herds[1].filtered_dict(self.manager)
        self.assertDictEqual(h0_result, h0_expected)
        self.assertDictEqual(h1_result, h1_expected)

        # specialist
        h0_result = self.herds[0].filtered_dict(self.specialist)
        h1_result = self.herds[1].filtered_dict(self.specialist)
        self.assertDictEqual(h0_result, h0_expected)
        self.assertDictEqual(h1_result, h1_expected)

        # owner / authenticated
        h0_result = self.herds[0].filtered_dict(self.owner)
        h1_result = self.herds[1].filtered_dict(self.owner)

        filtered_fields = ['name_privacy', 'physical_address',
                           'physical_address_privacy', 'location',
                           'location_privacy', 'www', 'www_privacy',
                           'mobile_phone', 'mobile_phone_privacy', 'wire_phone',
                           'wire_phone_privacy', 'latitude', 'longitude',
                           'coordinates_privacy', 'email_privacy']

        # remove fields that non-owners can't access
        for field in filtered_fields:
            if field in h1_expected:
                del h1_expected[field]

        self.assertDictEqual(h0_result, h0_expected)
        self.assertDictEqual(h1_result, h1_expected)

    def test_colour(self):
        """
        Checks the database.Colour class.

        Currently there are no functions on this class to test, so we stick to
        verifying the table.
        """
        self.assertTrue(db.Colour.table_exists())

    def test_breeding(self):
        """
        Checks the database.Breeding class.

        Currently there are no functions on this class to test, so we stick to
        verifying the table.
        """
        self.assertTrue(db.Breeding.table_exists())

    def test_individual(self):
        """
        Checks the database.Individual class.
        """
        self.assertTrue(db.Individual.table_exists())

        # .current_herd
        self.assertEqual(self.individuals[0].current_herd.id, self.herds[0].id)
        self.assertEqual(self.individuals[1].current_herd.id, self.herds[1].id)
        self.assertEqual(self.individuals[2].current_herd.id, self.herds[2].id)

        # .as_dict()
        mother = {"id": self.parents[0].id, "name": self.parents[0].name, "number": self.parents[0].number}
        father = {"id": self.parents[1].id, "name": self.parents[1].name, "number": self.parents[1].number}
        data = super(db.Individual, self.individuals[0]).as_dict()
        data["genebank_id"] = self.genebanks[0].id
        data["genebank"] = self.genebanks[0].name
        data["origin_herd"] = {"id": self.herds[0].id,
                               "herd":  self.herds[0].herd,
                               "herd_name": self.herds[0].herd_name}
        data["herd"] = {"id": self.herds[0].id,
                        "herd":  self.herds[0].herd,
                        "herd_name": self.herds[0].herd_name}

        data["birth_date"] = self.breeding[0].birth_date
        data["litter"] = self.breeding[0].litter_size

        data["mother"] = mother
        data["father"] = father
        data["colour"] = self.colors[0].name
        data["weights"] = [
             {"weight": self.weights[0].weight,
              "date": self.weights[0].weight_date.strftime('%Y-%m-%d')
              }
        ]
        data["bodyfat"] = [
            {"bodyfat": self.bodyfat[0].bodyfat,
             "date": self.bodyfat[0].bodyfat_date.strftime('%Y-%m-%d')
             }
        ]
        data["herd_tracking"] = [
            {
                "herd_id": self.herd_tracking[0].herd.id,
                "herd": self.herd_tracking[0].herd.herd,
                "herd_name": self.herd_tracking[0].herd.herd_name,
                "date": self.herd_tracking[0].herd_tracking_date.strftime("%Y-%m-%d")
            }
        ]

        self.assertDictEqual(self.individuals[0].as_dict(), data)


        # .list_info()
        for individual in self.individuals:
            self.assertDictEqual(individual.list_info(),
                                 super(db.Individual, individual).as_dict())

        # .short_info()
        for individual in self.individuals:

            mother = {"id": self.parents[0].id, "number": self.parents[0].number}
            father = {"id": self.parents[1].id, "number": self.parents[1].number}

            is_active = individual.is_active \
                        and not individual.death_date \
                        and not individual.death_note \
                        and individual.herdtracking_set.select() \
                                .where(db.HerdTracking.herd_tracking_date >
                                    datetime.now() - timedelta(days=366)
                                    ).count() > 0

            self.assertDictEqual(individual.short_info(),
                                 {"id": individual.id,
                                  "name": individual.name,
                                  "is_active": is_active,
                                  "number": individual.number,
                                  "sex": individual.sex,
                                  "father": father,
                                  "mother": mother})

    def test_individual_file(self):
        """
        Checks the database.IndividualFile class.

        Currently there are no functions on this class to test, so we stick to
        verifying the table.
        """
        self.assertTrue(db.IndividualFile.table_exists())

    def test_disease(self):
        """
        Checks the database.Disease class.

        Currently there are no functions on this class to test, so we stick to
        verifying the table.
        """
        self.assertTrue(db.Disease.table_exists())

    def test_individual_disease(self):
        """
        Checks the database.IndividualDisease class.

        Currently there are no functions on this class to test, so we stick to
        verifying the table.
        """
        self.assertTrue(db.IndividualDisease.table_exists())

    def test_weight(self):
        """
        Checks the database.Weight class.

        Currently there are no functions on this class to test, so we stick to
        verifying the table.
        """
        self.assertTrue(db.Weight.table_exists())

    def test_bodyfat(self):
        """
        Checks the database.Bodyfat class.

        Currently there are no functions on this class to test, so we stick to
        verifying the table.
        """
        self.assertTrue(db.Bodyfat.table_exists())

    def test_user(self):
        """
        Tests the functions of the database.User class.
        """
        # .privileges (getter and setter is tested through other functions)
        self.assertListEqual(self.admin.privileges, [{'level': 'admin'}])
        self.assertListEqual(self.manager.privileges, [{'level': 'manager', 'genebank': self.genebanks[0].id}])
        self.assertListEqual(self.specialist.privileges, [{'level': 'specialist', 'genebank': self.genebanks[0].id}])
        self.assertListEqual(self.owner.privileges, [{'level': 'owner', 'herd': self.herds[0].id}])

        # .has_role()
        self.assertEqual(self.admin.has_role('admin'), True)
        self.assertEqual(self.manager.has_role('admin'), False)
        self.assertEqual(self.specialist.has_role('admin'), False)
        self.assertEqual(self.owner.has_role('admin'), False)

        self.assertEqual(self.admin.has_role('manager', self.genebanks[0].id), False)
        self.assertEqual(self.manager.has_role('manager', self.genebanks[0].id), True)
        self.assertEqual(self.specialist.has_role('manager', self.genebanks[0].id), False)
        self.assertEqual(self.owner.has_role('manager', self.genebanks[0].id), False)
        self.assertEqual(self.admin.has_role('manager', self.genebanks[1].id), False)
        self.assertEqual(self.manager.has_role('manager', self.genebanks[1].id), False)
        self.assertEqual(self.specialist.has_role('manager', self.genebanks[1].id), False)
        self.assertEqual(self.owner.has_role('manager', self.genebanks[1].id), False)

        self.assertEqual(self.admin.has_role('specialist', self.genebanks[0].id), False)
        self.assertEqual(self.manager.has_role('specialist', self.genebanks[0].id), False)
        self.assertEqual(self.specialist.has_role('specialist', self.genebanks[0].id), True)
        self.assertEqual(self.owner.has_role('specialist', self.genebanks[0].id), False)
        self.assertEqual(self.admin.has_role('specialist', self.genebanks[1].id), False)
        self.assertEqual(self.manager.has_role('specialist', self.genebanks[1].id), False)
        self.assertEqual(self.specialist.has_role('specialist', self.genebanks[1].id), False)
        self.assertEqual(self.owner.has_role('specialist', self.genebanks[1].id), False)

        self.assertEqual(self.admin.has_role('owner', self.herds[0].id), False)
        self.assertEqual(self.manager.has_role('owner', self.herds[0].id), False)
        self.assertEqual(self.specialist.has_role('owner', self.herds[0].id), False)
        self.assertEqual(self.owner.has_role('owner', self.herds[0].id), True)
        self.assertEqual(self.admin.has_role('owner', self.herds[1].id), False)
        self.assertEqual(self.manager.has_role('owner', self.herds[1].id), False)
        self.assertEqual(self.specialist.has_role('owner', self.herds[1].id), False)
        self.assertEqual(self.owner.has_role('owner', self.herds[1].id), False)

        # .add_role
        user = da.register_user("test", "pass")
        user.add_role('admin')
        self.assertEqual(user.has_role('admin'), True)
        self.assertEqual(user.has_role('manager', self.genebanks[0].id), False)
        self.assertEqual(user.has_role('manager', self.genebanks[1].id), False)
        self.assertEqual(user.has_role('specialist', self.genebanks[0].id), False)
        self.assertEqual(user.has_role('specialist', self.genebanks[1].id), False)
        self.assertEqual(user.has_role('owner', self.herds[0].id), False)
        self.assertEqual(user.has_role('owner', self.herds[1].id), False)

        user.add_role('manager', self.genebanks[0].id)
        self.assertEqual(user.has_role('admin'), True)
        self.assertEqual(user.has_role('manager', self.genebanks[0].id), True)
        self.assertEqual(user.has_role('manager', self.genebanks[1].id), False)
        self.assertEqual(user.has_role('specialist', self.genebanks[0].id), False)
        self.assertEqual(user.has_role('specialist', self.genebanks[1].id), False)
        self.assertEqual(user.has_role('owner', self.herds[0].id), False)
        self.assertEqual(user.has_role('owner', self.herds[1].id), False)

        user.add_role('specialist', self.genebanks[1].id)
        self.assertEqual(user.has_role('admin'), True)
        self.assertEqual(user.has_role('manager', self.genebanks[0].id), True)
        self.assertEqual(user.has_role('manager', self.genebanks[1].id), False)
        self.assertEqual(user.has_role('specialist', self.genebanks[0].id), False)
        self.assertEqual(user.has_role('specialist', self.genebanks[1].id), True)
        self.assertEqual(user.has_role('owner', self.herds[0].id), False)
        self.assertEqual(user.has_role('owner', self.herds[1].id), False)

        user.add_role('owner', self.herds[1].id)
        self.assertEqual(user.has_role('admin'), True)
        self.assertEqual(user.has_role('manager', self.genebanks[0].id), True)
        self.assertEqual(user.has_role('manager', self.genebanks[1].id), False)
        self.assertEqual(user.has_role('specialist', self.genebanks[0].id), False)
        self.assertEqual(user.has_role('specialist', self.genebanks[1].id), True)
        self.assertEqual(user.has_role('owner', self.herds[0].id), False)
        self.assertEqual(user.has_role('owner', self.herds[1].id), True)

        # remove roles
        user.remove_role('owner', self.herds[1].id)
        self.assertEqual(user.has_role('admin'), True)
        self.assertEqual(user.has_role('manager', self.genebanks[0].id), True)
        self.assertEqual(user.has_role('manager', self.genebanks[1].id), False)
        self.assertEqual(user.has_role('specialist', self.genebanks[0].id), False)
        self.assertEqual(user.has_role('specialist', self.genebanks[1].id), True)
        self.assertEqual(user.has_role('owner', self.herds[0].id), False)
        self.assertEqual(user.has_role('owner', self.herds[1].id), False)
        user.remove_role('manager', self.genebanks[0].id)
        self.assertEqual(user.has_role('admin'), True)
        self.assertEqual(user.has_role('manager', self.genebanks[0].id), False)
        self.assertEqual(user.has_role('manager', self.genebanks[1].id), False)
        self.assertEqual(user.has_role('specialist', self.genebanks[0].id), False)
        self.assertEqual(user.has_role('specialist', self.genebanks[1].id), True)
        self.assertEqual(user.has_role('owner', self.herds[0].id), False)
        self.assertEqual(user.has_role('owner', self.herds[1].id), False)
        user.remove_role('specialist', self.genebanks[1].id)
        self.assertEqual(user.has_role('admin'), True)
        self.assertEqual(user.has_role('manager', self.genebanks[0].id), False)
        self.assertEqual(user.has_role('manager', self.genebanks[1].id), False)
        self.assertEqual(user.has_role('specialist', self.genebanks[0].id), False)
        self.assertEqual(user.has_role('specialist', self.genebanks[1].id), False)
        self.assertEqual(user.has_role('owner', self.herds[0].id), False)
        self.assertEqual(user.has_role('owner', self.herds[1].id), False)
        user.remove_role('admin')
        self.assertEqual(user.has_role('admin'), False)
        self.assertEqual(user.has_role('manager', self.genebanks[0].id), False)
        self.assertEqual(user.has_role('manager', self.genebanks[1].id), False)
        self.assertEqual(user.has_role('specialist', self.genebanks[0].id), False)
        self.assertEqual(user.has_role('specialist', self.genebanks[1].id), False)
        self.assertEqual(user.has_role('owner', self.herds[0].id), False)
        self.assertEqual(user.has_role('owner', self.herds[1].id), False)

        # is_admin
        self.assertEqual(self.admin.is_admin, True)
        self.assertEqual(self.manager.is_admin, False)
        self.assertEqual(self.specialist.is_admin, False)
        self.assertEqual(self.owner.is_admin, False)

        # is_manager
        self.assertEqual(self.admin.is_manager, None)
        self.assertEqual(self.manager.is_manager, [self.genebanks[0].id])
        self.assertEqual(self.specialist.is_manager, None)
        self.assertEqual(self.owner.is_manager, None)

        # is_owner
        self.assertEqual(self.admin.is_owner, None)
        self.assertEqual(self.manager.is_owner, None)
        self.assertEqual(self.specialist.is_owner, None)
        self.assertEqual(self.owner.is_owner, [self.herds[0].herd])

        # accessible_genebanks
        self.assertEqual(self.admin.accessible_genebanks, [self.genebanks[0].id, self.genebanks[1].id])
        self.assertEqual(self.manager.accessible_genebanks, [self.genebanks[0].id])
        self.assertEqual(self.specialist.accessible_genebanks, [self.genebanks[0].id])
        self.assertEqual(self.owner.accessible_genebanks, [self.genebanks[0].id])

        # frontend_data
        self.assertDictEqual(self.admin.frontend_data(),
                             {'email': 'admin', 'username': None,
                              'validated': False, 'is_admin': True,
                              'is_manager': None, 'is_owner': None})
        self.assertDictEqual(self.manager.frontend_data(),
                             {'email': 'man', 'username': None,
                              'validated': False, 'is_admin': False,
                              'is_manager': [self.genebanks[0].id], 'is_owner': None})
        self.assertDictEqual(self.specialist.frontend_data(),
                             {'email': 'spec', 'username': None,
                              'validated': False, 'is_admin': False,
                              'is_manager': None, 'is_owner': None})
        self.assertDictEqual(self.owner.frontend_data(),
                             {'email': 'owner', 'username': None,
                              'validated': False, 'is_admin': False,
                              'is_manager': None, 'is_owner': [self.herds[0].herd]})

        # get_genebanks

        # object reference comparison is intentional here
        self.assertListEqual(self.admin.get_genebanks(), self.genebanks)
        self.assertListEqual(self.manager.get_genebanks(), [self.genebanks[0]])
        self.assertListEqual(self.specialist.get_genebanks(), [self.genebanks[0]])
        self.assertListEqual(self.owner.get_genebanks(), [self.genebanks[0]])

        # get_genebank
        g0 = self.genebanks[0].as_dict()
        g1 = self.genebanks[1].as_dict()
        # we trust genebank.get_herds() as we tested it
        g0['herds'] = self.genebanks[0].get_herds(self.admin)
        g1['herds'] = self.genebanks[1].get_herds(self.admin)
        self.assertDictEqual(self.admin.get_genebank(self.genebanks[0].id), g0)
        self.assertDictEqual(self.admin.get_genebank(self.genebanks[1].id), g1)
        g0['herds'] = self.genebanks[0].get_herds(self.manager)
        self.assertDictEqual(self.manager.get_genebank(self.genebanks[0].id), g0)
        self.assertEqual(self.manager.get_genebank(self.genebanks[1].id), None)
        g0['herds'] = self.genebanks[0].get_herds(self.specialist)
        self.assertDictEqual(self.specialist.get_genebank(self.genebanks[0].id), g0)
        self.assertEqual(self.specialist.get_genebank(self.genebanks[1].id), None)
        g0['herds'] = self.genebanks[0].get_herds(self.owner)
        self.assertDictEqual(self.owner.get_genebank(self.genebanks[0].id), g0)
        self.assertEqual(self.owner.get_genebank(self.genebanks[1].id), None)

        # can_edit
        self.assertEqual(self.admin.can_edit('genebank1'), True)
        self.assertEqual(self.admin.can_edit('genebank2'), True)
        self.assertEqual(self.admin.can_edit('H1'), True)
        self.assertEqual(self.admin.can_edit('H2'), True)
        self.assertEqual(self.admin.can_edit('H3'), True)
        self.assertEqual(self.admin.can_edit('H1-1'), True)
        self.assertEqual(self.admin.can_edit('H2-2'), True)
        self.assertEqual(self.admin.can_edit('H3-3'), True)

        self.assertEqual(self.manager.can_edit('genebank1'), True)
        self.assertEqual(self.manager.can_edit('genebank2'), False)
        self.assertEqual(self.manager.can_edit('H1'), True)
        self.assertEqual(self.manager.can_edit('H2'), True)
        self.assertEqual(self.manager.can_edit('H3'), False)
        self.assertEqual(self.manager.can_edit('H1-1'), True)
        self.assertEqual(self.manager.can_edit('H2-2'), True)
        self.assertEqual(self.manager.can_edit('H3-3'), False)

        self.assertEqual(self.specialist.can_edit('genebank1'), False)
        self.assertEqual(self.specialist.can_edit('genebank2'), False)
        self.assertEqual(self.specialist.can_edit('H1'), False)
        self.assertEqual(self.specialist.can_edit('H2'), False)
        self.assertEqual(self.specialist.can_edit('H3'), False)
        self.assertEqual(self.specialist.can_edit('H1-1'), False)
        self.assertEqual(self.specialist.can_edit('H2-2'), False)
        self.assertEqual(self.specialist.can_edit('H3-3'), False)

        self.assertEqual(self.owner.can_edit('genebank1'), False)
        self.assertEqual(self.owner.can_edit('genebank2'), False)
        self.assertEqual(self.owner.can_edit('H1'), True)
        self.assertEqual(self.owner.can_edit('H2'), False)
        self.assertEqual(self.owner.can_edit('H3'), False)
        self.assertEqual(self.owner.can_edit('H1-1'), True)
        self.assertEqual(self.owner.can_edit('H2-2'), False)
        self.assertEqual(self.owner.can_edit('H3-3'), False)

    def test_user_message(self):
        """
        Checks the database.UserMessage class.

        Currently there are no functions on this class to test, so we stick to
        verifying the table.
        """
        self.assertTrue(db.UserMessage.table_exists())

    def test_yearly_herd_report(self):
        """
        Checks the database.YearlyHerdReport class.

        Currently there are no functions on this class to test, so we stick to
        verifying the table.
        """
        self.assertTrue(db.YearlyHerdReport.table_exists())

    def test_genebank_report(self):
        """
        Checks the database.GenebankReport class.

        Currently there are no functions on this class to test, so we stick to
        verifying the table.
        """
        self.assertTrue(db.GenebankReport.table_exists())

    def test_herd_tracking(self):
        """
        Checks the database.HerdTracking class.

        Currently there are no functions on this class to test, so we stick to
        verifying the table.
        """
        self.assertTrue(db.HerdTracking.table_exists())


class TestDataAccess(DatabaseTest):
    """
    Checks that data access functions return the correct data.
    """

    def test_add_user(self):
        """
        Checks that `utils.data_access.get_colors` is working as intended.
        """
        valid_form = {'email': 'test@user.com',
                      'username': 'test',
                      'validated': True,
                      'password': 'pass'}
        no_email = copy(valid_form)
        del no_email['email']
        no_pass = copy(valid_form)
        del no_pass['password']

        self.assertDictEqual(da.add_user(valid_form, None),
                             {"status": "error", "message": "forbidden"})
        self.assertDictEqual(da.add_user(valid_form, self.owner.uuid),
                             {"status": "error", "message": "forbidden"})
        self.assertDictEqual(da.add_user(valid_form, self.specialist.uuid),
                             {"status": "error", "message": "forbidden"})

        self.assertDictEqual(da.add_user(no_email, self.admin.uuid),
                             {"status": "error", "message": "missing data"})
        self.assertDictEqual(da.add_user(no_pass, self.admin.uuid),
                             {"status": "error", "message": "missing data"})

        result = da.add_user(valid_form, self.manager.uuid)
        self.assertEqual(result['status'], "created")

        self.assertDictEqual(da.add_user(valid_form, self.admin.uuid),
                             {"status": "error", "message": "already exists"})

    def test_register_user(self):
        """
        Checks that `utils.data_access.register_user` is working as intended.
        """
        email = 'test_user@site'
        password = 'pass'
        username = 'test user'
        validated = True
        privileges = [{'level': 'owner', 'herd': self.herds[0].herd}]

        user = da.register_user(email, password, username, validated, privileges)

        self.assertEqual(user.email, email)
        self.assertTrue(check_password_hash(user.password_hash, password))
        self.assertEqual(user.username, username)
        self.assertEqual(user.validated, validated)
        self.assertEqual(user.privileges, privileges)

    def test_authenticate_user(self):
        """
        Checks that `utils.data_access.authenticate_user` is working as intended.
        """
        email = 'test_authenticate'
        password = 'pass'

        da.register_user(email, password)
        self.assertIsNone(da.authenticate_user(email, "!%s!" % password))
        user = da.authenticate_user(email, password)
        self.assertEqual(user.email, email)

    def test_fetch_user_info(self):
        """
        Checks that `utils.data_access.fetch_user_info` return the correct
        information.
        """
        self.assertIsNone(da.fetch_user_info('invalid-uuid'))
        user = da.fetch_user_info(self.admin.uuid)
        self.assertEqual(user.email, self.admin.email)
        self.assertEqual(user.id, self.admin.id)

    def test_get_colors(self):
        """
        Checks that `utils.data_access.get_colors` return the correct
        information.
        """
        expected = {g.name: [{'id': c.id, 'name': c.name}
                             for c in self.colors if c.genebank == g]
                    for g in self.genebanks}

        colors = da.get_colors()
        self.assertDictEqual(colors, expected)

    def test_get_genebank(self):
        """
        Checks that `utils.data_access.get_genebank` return the correct
        information.

        The permission dependent behavior of this function is tested in the
        database functions, so in the interest of time it's not tested here.
        """
        self.assertIsNone(da.get_genebank(self.genebanks[0].id, 'invalid-uuid'))
        genebank = da.get_genebank(self.genebanks[0].id, self.admin.uuid)
        self.assertEqual(genebank['id'], self.genebanks[0].id)

    def test_get_genebanks(self):
        """
        Checks that `utils.data_access.get_genebanks` return the correct
        information.

        The permission dependent behavior of this function is tested in the
        database functions, so in the interest of time it's not tested here.
        """
        self.assertIsNone(da.get_genebanks('invalid-uuid'))
        genebanks = da.get_genebanks(self.admin.uuid)
        self.assertListEqual([g['id'] for g in genebanks],
                             [g.id for g in self.genebanks])

    def test_get_herd(self):
        """
        Checks that `utils.data_access.get_herd` return the correct
        information.
        """
        self.maxDiff = None
        self.assertIsNone(da.get_genebanks('invalid-uuid'))

        for user in [self.admin, self.manager, self.specialist, self.owner]:
            for herd in self.herds:
                value = da.get_herd(herd.herd, user.uuid)
                target = db.Herd.get(db.Herd.herd == herd.herd).filtered_dict(user)
                if target['genebank'] not in user.accessible_genebanks:
                    target = None
                else:
                    target["individuals"] = [i.short_info() for i in herd.individuals]

                if value is None or target is None:
                    self.assertEqual(value, target)
                else:
                    self.assertDictEqual(value, target)


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
