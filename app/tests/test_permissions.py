#!/usr/bin/env python3
"""
Unit tests for the herdbook endpoints.

isort:skip_file
"""
# Fairly lax pylint settings as we want to test a lot of things

# pylint: disable=too-many-public-methods
# pylint: disable=too-many-statements

import utils.data_access as da

# pylint: disable=import-error
import utils.database as db
from tests.database_test import DatabaseTest


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

    def test_viewer(self):
        """
        Checks that the viewer role has the correct permissions.
        """
        self.assertFalse(self.viewer.is_admin)
        self.assertEqual(self.viewer.accessible_genebanks, [1])

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

    def test_get_genebanks(self):
        """
        Checks that `utils.data_access.get_genebanks` returns the correct
        information for all test users.
        """
        # admin
        genebank_ids = [g["id"] for g in da.get_genebanks(self.admin.uuid)]
        self.assertTrue(self.genebanks[0].id in genebank_ids)
        self.assertTrue(self.genebanks[1].id in genebank_ids)
        # viewer
        genebank_ids = [g["id"] for g in da.get_genebanks(self.viewer.uuid)]
        self.assertTrue(self.genebanks[0].id in genebank_ids)
        self.assertTrue(self.genebanks[1].id not in genebank_ids)
        # manager
        genebank_ids = [g["id"] for g in da.get_genebanks(self.manager.uuid)]
        self.assertTrue(self.genebanks[0].id in genebank_ids)
        self.assertTrue(self.genebanks[1].id not in genebank_ids)
        # owner
        genebank_ids = [g["id"] for g in da.get_genebanks(self.owner.uuid)]
        self.assertTrue(self.genebanks[0].id in genebank_ids)
        self.assertTrue(self.genebanks[1].id not in genebank_ids)

    def test_get_genebank(self):
        """
        Checks that `utils.data_access.get_genebank` returns the correct
        information for all test users.
        """
        # admin
        self.assertTrue(da.get_genebank(self.genebanks[0].id, self.admin.uuid))
        self.assertTrue(da.get_genebank(self.genebanks[1].id, self.admin.uuid))
        # viewer
        self.assertTrue(da.get_genebank(self.genebanks[0].id, self.viewer.uuid))
        self.assertFalse(da.get_genebank(self.genebanks[1].id, self.viewer.uuid))
        # manager
        self.assertTrue(da.get_genebank(self.genebanks[0].id, self.manager.uuid))
        self.assertFalse(da.get_genebank(self.genebanks[1].id, self.manager.uuid))
        # owner
        self.assertTrue(da.get_genebank(self.genebanks[0].id, self.owner.uuid))
        self.assertFalse(da.get_genebank(self.genebanks[1].id, self.owner.uuid))

    def test_get_herd(self):
        """
        Checks that `utils.data_access.get_herd` returns the correct information
        for all test users.
        """

        for user in [self.admin, self.manager, self.viewer, self.owner]:
            for herd in db.Herd.select():

                value = da.get_herd(herd.herd, user.uuid)

                expected = herd.filtered_dict(user)
                if expected["genebank"] not in user.accessible_genebanks:
                    self.assertIsNone(value)
                else:
                    expected["individuals"] = [i.as_dict() for i in herd.individuals]
                    self.assertDictEqual(expected, value)

    def test_add_herd(self):
        """
        Checks that `utils.data_access._herd` returns the correct information
        for all test users.
        """
        # admin
        self.assertEqual(
            da.add_herd(
                {"genebank": self.genebanks[0].id, "herd": "test1"}, self.admin.uuid
            ),
            {"status": "success"},
        )
        self.assertEqual(
            da.add_herd(
                {"genebank": self.genebanks[1].id, "herd": "test2"}, self.admin.uuid
            ),
            {"status": "success"},
        )
        # viewer
        self.assertNotEqual(
            da.add_herd(
                {"genebank": self.genebanks[0].id, "herd": "test3"},
                self.viewer.uuid,
            ),
            {"status": "success"},
        )
        self.assertNotEqual(
            da.add_herd(
                {"genebank": self.genebanks[1].id, "herd": "test4"},
                self.viewer.uuid,
            ),
            {"status": "success"},
        )
        # manager
        self.assertEqual(
            da.add_herd(
                {"genebank": self.genebanks[0].id, "herd": "test5"}, self.manager.uuid
            ),
            {"status": "success"},
        )
        self.assertNotEqual(
            da.add_herd(
                {"genebank": self.genebanks[1].id, "herd": "test6"}, self.manager.uuid
            ),
            {"status": "success"},
        )
        # owner
        self.assertNotEqual(
            da.add_herd(
                {"genebank": self.genebanks[0].id, "herd": "test7"}, self.owner.uuid
            ),
            {"status": "success"},
        )
        self.assertNotEqual(
            da.add_herd(
                {"genebank": self.genebanks[1].id, "herd": "test8"}, self.owner.uuid
            ),
            {"status": "success"},
        )

    def test_get_individual(self):
        """
        Checks that `utils.data_access.get_individual` return the correct
        information for all test users.
        """
        # admin
        self.assertTrue(da.get_individual(self.individuals[0].number, self.admin.uuid))
        self.assertTrue(da.get_individual(self.individuals[1].number, self.admin.uuid))
        self.assertTrue(da.get_individual(self.individuals[2].number, self.admin.uuid))
        # viewer
        self.assertTrue(da.get_individual(self.individuals[0].number, self.viewer.uuid))
        self.assertTrue(da.get_individual(self.individuals[1].number, self.viewer.uuid))
        self.assertFalse(
            da.get_individual(self.individuals[2].number, self.viewer.uuid)
        )
        # manager
        self.assertTrue(
            da.get_individual(self.individuals[0].number, self.manager.uuid)
        )
        self.assertTrue(
            da.get_individual(self.individuals[1].number, self.manager.uuid)
        )
        self.assertFalse(
            da.get_individual(self.individuals[2].number, self.manager.uuid)
        )
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
        # viewer
        user_ids = da.get_users(self.viewer.uuid)
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
        self.assertFalse(self.admin.has_role("viewer", 1))
        self.assertFalse(self.admin.has_role("owner", 1))
        # viewer
        self.assertFalse(self.viewer.has_role("admin"))
        self.assertFalse(self.viewer.has_role("manager", 1))
        self.assertTrue(self.viewer.has_role("viewer", 1))
        self.assertFalse(self.viewer.has_role("owner", 1))
        # manager
        self.assertFalse(self.manager.has_role("admin"))
        self.assertTrue(self.manager.has_role("manager", 1))
        self.assertFalse(self.manager.has_role("viewer", 1))
        self.assertFalse(self.manager.has_role("owner", 1))
        # owner
        self.assertFalse(self.owner.has_role("admin"))
        self.assertFalse(self.owner.has_role("manager", 1))
        self.assertFalse(self.owner.has_role("viewer", 1))
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
        self.assertEqual(da.update_role(operation, self.viewer.uuid)["status"], "error")
        operation["genebank"] = 2
        self.assertEqual(
            da.update_role(operation, self.manager.uuid)["status"], "error"
        )

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
        self.assertEqual(
            da.update_role(operation, self.admin.uuid)["status"], "updated"
        )

        # unnecessary remove
        self.assertEqual(
            da.update_role(operation, self.admin.uuid)["status"], "unchanged"
        )

        # successful insert
        operation["action"] = "add"
        operation["user"] = str(operation["user"])
        self.assertEqual(
            da.update_role(operation, self.admin.uuid)["status"], "updated"
        )

        # unnecessary insert
        self.assertEqual(
            da.update_role(operation, self.admin.uuid)["status"], "unchanged"
        )

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

        # viewer
        self.assertEqual(self.viewer.can_edit(self.genebanks[0].name), False)
        self.assertEqual(self.viewer.can_edit(self.genebanks[1].name), False)

        self.assertEqual(self.viewer.can_edit(self.herds[0].herd), False)
        self.assertEqual(self.viewer.can_edit(self.herds[1].herd), False)
        self.assertEqual(self.viewer.can_edit(self.herds[2].herd), False)

        self.assertEqual(self.viewer.can_edit(self.individuals[0].number), False)
        self.assertEqual(self.viewer.can_edit(self.individuals[1].number), False)
        self.assertEqual(self.viewer.can_edit(self.individuals[2].number), False)

        # Owner
        self.assertEqual(self.owner.can_edit(self.genebanks[0].name), False)
        self.assertEqual(self.owner.can_edit(self.genebanks[1].name), False)

        self.assertEqual(self.owner.can_edit(self.herds[0].herd), True)
        self.assertEqual(self.owner.can_edit(self.herds[1].herd), False)
        self.assertEqual(self.owner.can_edit(self.herds[2].herd), False)

        self.assertEqual(self.owner.can_edit(self.individuals[0].number), True)
        self.assertEqual(self.owner.can_edit(self.individuals[1].number), False)
        self.assertEqual(self.owner.can_edit(self.individuals[2].number), False)
