#!/usr/bin/env python3
"""
Unit tests for the herdbook endpoints.

isort:skip_file
"""
# Fairly lax pylint settings as we want to test a lot of things

# pylint: disable=too-many-public-methods
# pylint: disable=too-many-statements

from datetime import datetime, timedelta

import utils.data_access as da

# pylint: disable=import-error
import utils.database as db

# pylint: disable=import-error
from tests.database_test import DatabaseTest


# jscpd:ignore-start
# pylint: disable=too-few-public-methods
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
        gb0_expected = {
            "id": self.genebanks[0].id,
            "name": self.genebanks[0].name,
            "herds": [
                {
                    "id": self.herds[0].id,
                    "herd": self.herds[0].herd,
                    "genebank": self.genebanks[0].id,
                    "herd_name": self.herds[0].herd_name,
                    "is_active": self.herds[0].is_active,
                },
                {
                    "id": self.herds[1].id,
                    "herd": self.herds[1].herd,
                    "genebank": self.genebanks[0].id,
                    "herd_name": self.herds[1].herd_name,
                    "is_active": self.herds[1].is_active,
                },
            ],
        }
        self.assertDictEqual(gb0_info, gb0_expected)

        gb1_info = self.genebanks[1].short_info()
        gb1_expected = {
            "id": self.genebanks[1].id,
            "name": self.genebanks[1].name,
            "herds": [
                {
                    "id": self.herds[2].id,
                    "herd": self.herds[2].herd,
                    "genebank": self.genebanks[1].id,
                    "herd_name": self.herds[2].herd_name,
                    "is_active": self.herds[2].is_active,
                },
            ],
        }
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
            return {
                "id": self.herds[index].id,
                "genebank": self.herds[index].__dict__["__data__"]["genebank"],
                "herd": self.herds[index].herd,
                "herd_name": self.herds[index].herd_name,
                "is_active": self.herds[index].is_active,
                "start_date": self.herds[index].start_date,
                "name": self.herds[index].name,
                "name_privacy": self.herds[index].name_privacy,
                "physical_address": self.herds[index].physical_address,
                "physical_address_privacy": self.herds[index].physical_address_privacy,
                "location": self.herds[index].location,
                "location_privacy": self.herds[index].location_privacy,
                "email": self.herds[index].email,
                "email_privacy": self.herds[index].email_privacy,
                "www": self.herds[index].www,
                "www_privacy": self.herds[index].www_privacy,
                "mobile_phone": self.herds[index].mobile_phone,
                "mobile_phone_privacy": self.herds[index].mobile_phone_privacy,
                "wire_phone": self.herds[index].wire_phone,
                "wire_phone_privacy": self.herds[index].wire_phone_privacy,
                "latitude": self.herds[index].latitude,
                "longitude": self.herds[index].longitude,
                "coordinates_privacy": self.herds[index].coordinates_privacy,
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

        # viewer
        gb0_herds = self.genebanks[0].get_herds(self.viewer)
        self.assertDictEqual(gb0_herds[0], gb0_expected[0])
        self.assertDictEqual(gb0_herds[1], gb0_expected[1])

        # owner / authenticated
        gb0_herds = self.genebanks[0].get_herds(self.owner)

        del gb0_expected[1]["name_privacy"]
        del gb0_expected[1]["physical_address"]
        del gb0_expected[1]["physical_address_privacy"]
        del gb0_expected[1]["location"]
        del gb0_expected[1]["location_privacy"]
        del gb0_expected[1]["www"]
        del gb0_expected[1]["www_privacy"]
        del gb0_expected[1]["mobile_phone"]
        del gb0_expected[1]["mobile_phone_privacy"]
        del gb0_expected[1]["wire_phone"]
        del gb0_expected[1]["wire_phone_privacy"]
        del gb0_expected[1]["latitude"]
        del gb0_expected[1]["longitude"]
        del gb0_expected[1]["coordinates_privacy"]
        del gb0_expected[1]["email_privacy"]

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
            expected = {
                "id": herd.id,
                "herd": herd.herd,
                "genebank": herd.__dict__["__data__"]["genebank"],
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

        # viewer
        h0_result = self.herds[0].filtered_dict(self.viewer)
        h1_result = self.herds[1].filtered_dict(self.viewer)
        self.assertDictEqual(h0_result, h0_expected)
        self.assertDictEqual(h1_result, h1_expected)

        # owner / authenticated
        h0_result = self.herds[0].filtered_dict(self.owner)
        h1_result = self.herds[1].filtered_dict(self.owner)

        filtered_fields = [
            "name_privacy",
            "physical_address",
            "physical_address_privacy",
            "location",
            "location_privacy",
            "www",
            "www_privacy",
            "mobile_phone",
            "mobile_phone_privacy",
            "wire_phone",
            "wire_phone_privacy",
            "latitude",
            "longitude",
            "coordinates_privacy",
            "email_privacy",
        ]

        # remove fields that non-owners can't access
        for field in filtered_fields:
            if field in h1_expected:
                del h1_expected[field]

        self.assertDictEqual(h0_result, h0_expected)
        self.assertDictEqual(h1_result, h1_expected)

    def test_color(self):
        """
        Checks the database.Color class.

        Currently there are no functions on this class to test, so we stick to
        verifying the table.
        """
        self.assertTrue(db.Color.table_exists())

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

        # .children
        self.assertListEqual(
            self.parents[0].children, [self.individuals[0], self.individuals[1]]
        )
        self.assertListEqual(
            self.parents[1].children, [self.individuals[0], self.individuals[1]]
        )
        self.assertListEqual(self.parents[2].children, [self.individuals[2]])
        self.assertListEqual(self.parents[3].children, [self.individuals[2]])

        # .as_dict()
        mother = {
            "id": self.parents[0].id,
            "name": self.parents[0].name,
            "number": self.parents[0].number,
        }
        father = {
            "id": self.parents[1].id,
            "name": self.parents[1].name,
            "number": self.parents[1].number,
        }

        # pylint: disable=bad-super-call
        data = super(db.Individual, self.individuals[0]).as_dict()
        data["genebank_id"] = self.genebanks[0].id
        data["genebank"] = self.genebanks[0].name
        data["origin_herd"] = {
            "id": self.herds[0].id,
            "herd": self.herds[0].herd,
            "herd_name": self.herds[0].herd_name,
        }
        data["herd"] = {
            "id": self.herds[0].id,
            "herd": self.herds[0].herd,
            "herd_name": self.herds[0].herd_name,
        }

        data["birth_date"] = self.breeding[0].birth_date
        data["litter_size"] = self.breeding[0].litter_size
        data["litter_size6w"] = self.breeding[0].litter_size6w

        data["mother"] = mother
        data["father"] = father
        data["color"] = self.colors[0].name
        data["alive"] = (
            not self.individuals[0].death_date and not self.individuals[0].death_note
        )
        data["is_active"] = False
        data["is_registered"] = bool(
            self.individuals[0].certificate or self.individuals[0].digital_certificate
        )
        data["weights"] = [
            {
                "weight": self.weights[0].weight,
                "date": self.weights[0].weight_date.strftime("%Y-%m-%d"),
            }
        ]
        data["bodyfat"] = [
            {
                "bodyfat": self.bodyfat[0].bodyfat,
                "date": self.bodyfat[0].bodyfat_date.strftime("%Y-%m-%d"),
            }
        ]
        data["herd_tracking"] = [
            {
                "herd_id": self.herd_tracking[0].herd.id,
                "herd": self.herd_tracking[0].herd.herd,
                "herd_name": self.herd_tracking[0].herd.herd_name,
                "date": self.herd_tracking[0].herd_tracking_date.strftime("%Y-%m-%d"),
            }
        ]

        self.assertDictEqual(self.individuals[0].as_dict(), data)

        # .list_info()
        for individual in self.individuals:
            self.assertDictEqual(
                individual.list_info(), super(db.Individual, individual).as_dict()
            )

        # .short_info()
        for individual in self.individuals:

            mother = {
                "id": individual.breeding.mother.id,
                "number": individual.breeding.mother.number,
            }
            father = {
                "id": individual.breeding.father.id,
                "number": individual.breeding.father.number,
            }

            is_active = (
                individual.current_herd.is_active
                and not individual.castration_date
                and not individual.death_date
                and not individual.death_note
                and (
                    db.HerdTracking.select()
                    .where(db.HerdTracking.individual == individual)
                    .order_by(db.HerdTracking.herd_tracking_date.desc())[0]
                    .herd_tracking_date
                    > datetime.date(datetime.now() - timedelta(days=366))
                    if db.HerdTracking.select()
                    .where(db.HerdTracking.individual == individual)
                    .count()
                    else False
                )
            )

            self.assertDictEqual(
                individual.short_info(),
                {
                    "id": individual.id,
                    "name": individual.name,
                    "is_active": is_active,
                    "number": individual.number,
                    "sex": individual.sex,
                    "father": father,
                    "mother": mother,
                },
            )

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

    # user has a lot of things to test, so it's split in several tests
    def test_user_privileges(self):
        """
        Tests the database.User.privileges function.
        """
        # .privileges (getter and setter is tested through other functions)
        self.assertListEqual(self.admin.privileges, [{"level": "admin"}])
        self.assertListEqual(
            self.manager.privileges,
            [{"level": "manager", "genebank": self.genebanks[0].id}],
        )
        self.assertListEqual(
            self.viewer.privileges,
            [{"level": "viewer", "genebank": self.genebanks[0].id}],
        )
        self.assertListEqual(
            self.owner.privileges, [{"level": "owner", "herd": self.herds[0].id}]
        )

    def test_user_has_role(self):
        """
        Tests the database.User.has_role function.
        """
        self.assertEqual(self.admin.has_role("admin"), True)
        self.assertEqual(self.manager.has_role("admin"), False)
        self.assertEqual(self.viewer.has_role("admin"), False)
        self.assertEqual(self.owner.has_role("admin"), False)

        self.assertEqual(self.admin.has_role("manager", self.genebanks[0].id), False)
        self.assertEqual(self.manager.has_role("manager", self.genebanks[0].id), True)
        self.assertEqual(self.viewer.has_role("manager", self.genebanks[0].id), False)
        self.assertEqual(self.owner.has_role("manager", self.genebanks[0].id), False)
        self.assertEqual(self.admin.has_role("manager", self.genebanks[1].id), False)
        self.assertEqual(self.manager.has_role("manager", self.genebanks[1].id), False)
        self.assertEqual(self.viewer.has_role("manager", self.genebanks[1].id), False)
        self.assertEqual(self.owner.has_role("manager", self.genebanks[1].id), False)

        self.assertEqual(self.admin.has_role("viewer", self.genebanks[0].id), False)
        self.assertEqual(self.manager.has_role("viewer", self.genebanks[0].id), False)
        self.assertEqual(self.viewer.has_role("viewer", self.genebanks[0].id), True)
        self.assertEqual(self.owner.has_role("viewer", self.genebanks[0].id), False)
        self.assertEqual(self.admin.has_role("viewer", self.genebanks[1].id), False)
        self.assertEqual(self.manager.has_role("viewer", self.genebanks[1].id), False)
        self.assertEqual(self.viewer.has_role("viewer", self.genebanks[1].id), False)
        self.assertEqual(self.owner.has_role("viewer", self.genebanks[1].id), False)

        self.assertEqual(self.admin.has_role("owner", self.herds[0].id), False)
        self.assertEqual(self.manager.has_role("owner", self.herds[0].id), False)
        self.assertEqual(self.viewer.has_role("owner", self.herds[0].id), False)
        self.assertEqual(self.owner.has_role("owner", self.herds[0].id), True)
        self.assertEqual(self.admin.has_role("owner", self.herds[1].id), False)
        self.assertEqual(self.manager.has_role("owner", self.herds[1].id), False)
        self.assertEqual(self.viewer.has_role("owner", self.herds[1].id), False)
        self.assertEqual(self.owner.has_role("owner", self.herds[1].id), False)

    def test_user_change_roles(self):
        """
        Tests the database.User.add_role and remove_role functions.
        """
        user = da.register_user("test", "pass")
        user.add_role("admin")
        self.assertEqual(user.has_role("admin"), True)
        self.assertEqual(user.has_role("manager", self.genebanks[0].id), False)
        self.assertEqual(user.has_role("manager", self.genebanks[1].id), False)
        self.assertEqual(user.has_role("viewer", self.genebanks[0].id), False)
        self.assertEqual(user.has_role("viewer", self.genebanks[1].id), False)
        self.assertEqual(user.has_role("owner", self.herds[0].id), False)
        self.assertEqual(user.has_role("owner", self.herds[1].id), False)

        user.add_role("manager", self.genebanks[0].id)
        self.assertEqual(user.has_role("admin"), True)
        self.assertEqual(user.has_role("manager", self.genebanks[0].id), True)
        self.assertEqual(user.has_role("manager", self.genebanks[1].id), False)
        self.assertEqual(user.has_role("viewer", self.genebanks[0].id), False)
        self.assertEqual(user.has_role("viewer", self.genebanks[1].id), False)
        self.assertEqual(user.has_role("owner", self.herds[0].id), False)
        self.assertEqual(user.has_role("owner", self.herds[1].id), False)

        user.add_role("viewer", self.genebanks[1].id)
        self.assertEqual(user.has_role("admin"), True)
        self.assertEqual(user.has_role("manager", self.genebanks[0].id), True)
        self.assertEqual(user.has_role("manager", self.genebanks[1].id), False)
        self.assertEqual(user.has_role("viewer", self.genebanks[0].id), False)
        self.assertEqual(user.has_role("viewer", self.genebanks[1].id), True)
        self.assertEqual(user.has_role("owner", self.herds[0].id), False)
        self.assertEqual(user.has_role("owner", self.herds[1].id), False)

        user.add_role("owner", self.herds[1].id)
        self.assertEqual(user.has_role("admin"), True)
        self.assertEqual(user.has_role("manager", self.genebanks[0].id), True)
        self.assertEqual(user.has_role("manager", self.genebanks[1].id), False)
        self.assertEqual(user.has_role("viewer", self.genebanks[0].id), False)
        self.assertEqual(user.has_role("viewer", self.genebanks[1].id), True)
        self.assertEqual(user.has_role("owner", self.herds[0].id), False)
        self.assertEqual(user.has_role("owner", self.herds[1].id), True)

        # remove roles
        user.remove_role("owner", self.herds[1].id)
        self.assertEqual(user.has_role("admin"), True)
        self.assertEqual(user.has_role("manager", self.genebanks[0].id), True)
        self.assertEqual(user.has_role("manager", self.genebanks[1].id), False)
        self.assertEqual(user.has_role("viewer", self.genebanks[0].id), False)
        self.assertEqual(user.has_role("viewer", self.genebanks[1].id), True)
        self.assertEqual(user.has_role("owner", self.herds[0].id), False)
        self.assertEqual(user.has_role("owner", self.herds[1].id), False)
        user.remove_role("manager", self.genebanks[0].id)
        self.assertEqual(user.has_role("admin"), True)
        self.assertEqual(user.has_role("manager", self.genebanks[0].id), False)
        self.assertEqual(user.has_role("manager", self.genebanks[1].id), False)
        self.assertEqual(user.has_role("viewer", self.genebanks[0].id), False)
        self.assertEqual(user.has_role("viewer", self.genebanks[1].id), True)
        self.assertEqual(user.has_role("owner", self.herds[0].id), False)
        self.assertEqual(user.has_role("owner", self.herds[1].id), False)
        user.remove_role("viewer", self.genebanks[1].id)
        self.assertEqual(user.has_role("admin"), True)
        self.assertEqual(user.has_role("manager", self.genebanks[0].id), False)
        self.assertEqual(user.has_role("manager", self.genebanks[1].id), False)
        self.assertEqual(user.has_role("viewer", self.genebanks[0].id), False)
        self.assertEqual(user.has_role("viewer", self.genebanks[1].id), False)
        self.assertEqual(user.has_role("owner", self.herds[0].id), False)
        self.assertEqual(user.has_role("owner", self.herds[1].id), False)
        user.remove_role("admin")
        self.assertEqual(user.has_role("admin"), False)
        self.assertEqual(user.has_role("manager", self.genebanks[0].id), False)
        self.assertEqual(user.has_role("manager", self.genebanks[1].id), False)
        self.assertEqual(user.has_role("viewer", self.genebanks[0].id), False)
        self.assertEqual(user.has_role("viewer", self.genebanks[1].id), False)
        self.assertEqual(user.has_role("owner", self.herds[0].id), False)
        self.assertEqual(user.has_role("owner", self.herds[1].id), False)

    def test_user_is_admin(self):
        """
        Tests the database.User.is_admin property.
        """
        self.assertEqual(self.admin.is_admin, True)
        self.assertEqual(self.manager.is_admin, False)
        self.assertEqual(self.viewer.is_admin, False)
        self.assertEqual(self.owner.is_admin, False)

    def test_user_is_manager(self):
        """
        Tests the database.User.is_manager property.
        """
        self.assertEqual(self.admin.is_manager, None)
        self.assertEqual(self.manager.is_manager, [self.genebanks[0].id])
        self.assertEqual(self.viewer.is_manager, None)
        self.assertEqual(self.owner.is_manager, None)

    def test_user_is_owner(self):
        """
        Tests the database.User.is_owner property.
        """
        self.assertEqual(self.admin.is_owner, None)
        self.assertEqual(self.manager.is_owner, None)
        self.assertEqual(self.viewer.is_owner, None)
        self.assertEqual(self.owner.is_owner, [self.herds[0].herd])

    def test_user_accessible_genebanks(self):
        """
        Tests the database.User.accessible_genebanks property.
        """
        self.assertEqual(
            self.admin.accessible_genebanks,
            [self.genebanks[0].id, self.genebanks[1].id],
        )
        self.assertEqual(self.manager.accessible_genebanks, [self.genebanks[0].id])
        self.assertEqual(self.viewer.accessible_genebanks, [self.genebanks[0].id])
        self.assertEqual(self.owner.accessible_genebanks, [self.genebanks[0].id])

    def test_user_frontend_data(self):
        """
        Tests the database.User.frontend_data function.
        """
        self.assertDictEqual(
            self.admin.frontend_data(),
            {
                "email": "admin",
                "username": None,
                "fullname": None,
                "validated": False,
                "is_admin": True,
                "is_manager": None,
                "is_owner": None,
            },
        )
        self.assertDictEqual(
            self.manager.frontend_data(),
            {
                "email": "man",
                "username": None,
                "fullname": None,
                "validated": False,
                "is_admin": False,
                "is_manager": [self.genebanks[0].id],
                "is_owner": None,
            },
        )
        self.assertDictEqual(
            self.viewer.frontend_data(),
            {
                "email": "spec",
                "username": None,
                "fullname": None,
                "validated": False,
                "is_admin": False,
                "is_manager": None,
                "is_owner": None,
            },
        )
        self.assertDictEqual(
            self.owner.frontend_data(),
            {
                "email": "owner",
                "username": None,
                "fullname": None,
                "validated": False,
                "is_admin": False,
                "is_manager": None,
                "is_owner": [self.herds[0].herd],
            },
        )

    def test_user_get_genebanks(self):
        """
        Tests the database.User.get_genebanks function.
        """
        # object reference comparison is intentional here
        self.assertListEqual(self.admin.get_genebanks(), self.genebanks)
        self.assertListEqual(self.manager.get_genebanks(), [self.genebanks[0]])
        self.assertListEqual(self.viewer.get_genebanks(), [self.genebanks[0]])
        self.assertListEqual(self.owner.get_genebanks(), [self.genebanks[0]])

    def test_user_get_genebank(self):
        """
        Tests the database.User.get_genebank function.
        """
        g_0 = self.genebanks[0].as_dict()
        g_1 = self.genebanks[1].as_dict()
        # we trust genebank.get_herds() as we tested it
        g_0["herds"] = self.genebanks[0].get_herds(self.admin)
        g_1["herds"] = self.genebanks[1].get_herds(self.admin)
        self.assertDictEqual(self.admin.get_genebank(self.genebanks[0].id), g_0)
        self.assertDictEqual(self.admin.get_genebank(self.genebanks[1].id), g_1)
        g_0["herds"] = self.genebanks[0].get_herds(self.manager)
        self.assertDictEqual(self.manager.get_genebank(self.genebanks[0].id), g_0)
        self.assertEqual(self.manager.get_genebank(self.genebanks[1].id), None)
        g_0["herds"] = self.genebanks[0].get_herds(self.viewer)
        self.assertDictEqual(self.viewer.get_genebank(self.genebanks[0].id), g_0)
        self.assertEqual(self.viewer.get_genebank(self.genebanks[1].id), None)
        g_0["herds"] = self.genebanks[0].get_herds(self.owner)
        self.assertDictEqual(self.owner.get_genebank(self.genebanks[0].id), g_0)
        self.assertEqual(self.owner.get_genebank(self.genebanks[1].id), None)

    def test_user_can_edit(self):
        """
        Tests the database.User.can_edit function.
        """
        self.assertEqual(self.admin.can_edit("genebank1"), True)
        self.assertEqual(self.admin.can_edit("genebank2"), True)
        self.assertEqual(self.admin.can_edit("H1"), True)
        self.assertEqual(self.admin.can_edit("H2"), True)
        self.assertEqual(self.admin.can_edit("H3"), True)
        self.assertEqual(self.admin.can_edit("H1-1"), True)
        self.assertEqual(self.admin.can_edit("H2-2"), True)
        self.assertEqual(self.admin.can_edit("H3-3"), True)

        self.assertEqual(self.manager.can_edit("genebank1"), True)
        self.assertEqual(self.manager.can_edit("genebank2"), False)
        self.assertEqual(self.manager.can_edit("H1"), True)
        self.assertEqual(self.manager.can_edit("H2"), True)
        self.assertEqual(self.manager.can_edit("H3"), False)
        self.assertEqual(self.manager.can_edit("H1-1"), True)
        self.assertEqual(self.manager.can_edit("H2-2"), True)
        self.assertEqual(self.manager.can_edit("H3-3"), False)

        self.assertEqual(self.viewer.can_edit("genebank1"), False)
        self.assertEqual(self.viewer.can_edit("genebank2"), False)
        self.assertEqual(self.viewer.can_edit("H1"), False)
        self.assertEqual(self.viewer.can_edit("H2"), False)
        self.assertEqual(self.viewer.can_edit("H3"), False)
        self.assertEqual(self.viewer.can_edit("H1-1"), False)
        self.assertEqual(self.viewer.can_edit("H2-2"), False)
        self.assertEqual(self.viewer.can_edit("H3-3"), False)

        self.assertEqual(self.owner.can_edit("genebank1"), False)
        self.assertEqual(self.owner.can_edit("genebank2"), False)
        self.assertEqual(self.owner.can_edit("H1"), True)
        self.assertEqual(self.owner.can_edit("H2"), False)
        self.assertEqual(self.owner.can_edit("H3"), False)
        self.assertEqual(self.owner.can_edit("H1-1"), True)
        self.assertEqual(self.owner.can_edit("H2-2"), False)
        self.assertEqual(self.owner.can_edit("H3-3"), False)

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


# pylint: disable=too-few-public-methods
class TestDatabaseMigration(DatabaseTest):
    """
    Checks that the database migrations works
    """

    def test_no_table(self):
        """
        Checks that the schema migration works from very old version.
        Will also run through all migrations.
        """
        if db.SchemaHistory.table_exists():
            db.SchemaHistory.drop_table()

        db.check_migrations()
        self.assertTrue(db.SchemaHistory.table_exists())
        self.assertEqual(
            db.SchemaHistory.select(  # pylint: disable=E1120
                db.fn.MAX(db.SchemaHistory.version)
            ).scalar(),
            db.CURRENT_SCHEMA_VERSION,
        )

    def test_last_migration(self):
        """
        Replays the last migration
        """

        db.SchemaHistory.delete().where(
            db.SchemaHistory.version == db.CURRENT_SCHEMA_VERSION
        ).execute()

        db.check_migrations()
        self.assertTrue(db.SchemaHistory.table_exists())
        self.assertEqual(
            db.SchemaHistory.select(  # pylint: disable=E1120
                db.fn.MAX(db.SchemaHistory.version)
            ).scalar(),
            db.CURRENT_SCHEMA_VERSION,
        )

    def test_migration_replays(self):
        """
        Run migrations sereral times to verify that all migrations work even
        if they have been applied already.
        """
        db.check_migrations()

        if db.SchemaHistory.table_exists():
            db.SchemaHistory.drop_table()

        db.check_migrations()

        if db.SchemaHistory.table_exists():
            db.SchemaHistory.drop_table()

        db.check_migrations()

        self.assertTrue(db.SchemaHistory.table_exists())
        self.assertEqual(
            db.SchemaHistory()
            .select(db.fn.MAX(db.SchemaHistory.version))  # pylint: disable=E1120
            .scalar(),
            db.CURRENT_SCHEMA_VERSION,
        )


# jscpd:ignore-end
