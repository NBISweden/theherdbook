#!/usr/bin/env python3
"""
Unit tests for the herdbook endpoints.

isort:skip_file
"""
# Fairly lax pylint settings as we want to test a lot of things

# pylint: disable=too-many-public-methods
# pylint: disable=too-many-statements

import os
import unittest
from datetime import datetime, timedelta

import utils.data_access as da

# pylint: disable=import-error
import utils.database as db


class DatabaseTest(unittest.TestCase):
    """
    Database test wrapper that sets up the database connection.
    """

    # pylint: disable=too-many-instance-attributes

    TEST_DATABASE = "test_database.sqlite3"
    # Uncomment this line to get get full diff
    # maxDiff = None

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
            db.Genebank.get_or_create(name="Gotland")[0],
            db.Genebank.get_or_create(name="Mellerud")[0],
        ]
        for genebank in self.genebanks:
            genebank.save()

        self.colors = [
            db.Color.get_or_create(name="bleighe", genebank=self.genebanks[0])[0],
            db.Color.get_or_create(name="stgröhn", genebank=self.genebanks[0])[0],
            db.Color.get_or_create(name="bläåh", genebank=self.genebanks[1])[0],
        ]
        for color in self.colors:
            color.save()

        self.herds = [
            db.Herd.get_or_create(
                genebank=self.genebanks[0],
                herd="G1",
                herd_name="Gotlandsherd1",
                name="owner1",
                name_privacy="private",
                email="o@h1",
                email_privacy="authenticated",
                www="www1",
                www_privacy="public",
            )[0],
            db.Herd.get_or_create(
                genebank=self.genebanks[0],
                herd="G2",
                herd_name="Gotlandsherd2",
                name="owner2",
                name_privacy="authenticated",
                email="o@h2",
                email_privacy="public",
                www="www2",
                www_privacy="private",
            )[0],
            db.Herd.get_or_create(
                genebank=self.genebanks[1],
                herd="M3",
                herd_name="Mellerudherd3",
                name="Owner3",
                name_privacy="public",
                email="o@h3",
                email_privacy="private",
                www="www3",
                www_privacy="authenticated",
            )[0],
        ]
        for herd in self.herds:
            herd.save()

        parent_breeding = db.Breeding.get_or_create(
            breed_date=datetime(2019, 1, 1),
            birth_date=datetime(2019, 2, 1),
            litter_size=2,
            litter_size6w=2,
            breeding_herd_id=self.herds[0],
        )[0]

        parent_breeding2 = db.Breeding.get_or_create(
            breed_date=datetime(2017, 1, 1),
            birth_date=datetime(2017, 2, 1),
            litter_size=2,
            litter_size6w=2,
            breeding_herd_id=self.herds[1],
        )[0]

        parent_breeding3 = db.Breeding.get_or_create(
            breed_date=datetime(2019, 1, 1),
            birth_date=datetime(2019, 2, 1),
            litter_size=2,
            litter_size6w=2,
            breeding_herd_id=self.herds[2],
        )[0]

        parent_breeding4 = db.Breeding.get_or_create(
            breed_date=datetime(2018, 1, 1),
            birth_date=datetime(2018, 2, 1),
            litter_size=2,
            litter_size6w=2,
            breeding_herd_id=self.herds[2],
        )[0]

        self.parents = [
            db.Individual.get_or_create(
                origin_herd=self.herds[0], breeding=parent_breeding, number="G1-1911"
            )[0],
            db.Individual.get_or_create(
                origin_herd=self.herds[1], breeding=parent_breeding2, number="G2-1711"
            )[0],
            db.Individual.get_or_create(
                origin_herd=self.herds[2], breeding=parent_breeding3, number="M3-1911"
            )[0],
            db.Individual.get_or_create(
                origin_herd=self.herds[2], breeding=parent_breeding4, number="M3-1811"
            )[0],
        ]
        for parent in self.parents:
            parent.save()

        parenttracking = db.HerdTracking.get_or_create(
            herd=self.herds[0],
            individual=self.parents[0],
            herd_tracking_date=datetime(2019, 2, 1),
        )[0]
        parenttracking.save()

        self.breeding = [
            db.Breeding.get_or_create(
                breed_date=datetime(2021, 1, 1),
                birth_date=datetime(2021, 2, 1),
                mother=self.parents[0],
                father=self.parents[1],
                litter_size=2,
                litter_size6w=2,
                breeding_herd_id=self.herds[0],
            )[0],
            db.Breeding.get_or_create(
                breed_date=datetime(2021, 1, 1),
                birth_date=datetime(2021, 2, 1),
                mother=self.parents[2],
                father=self.parents[3],
                litter_size=2,
                litter_size6w=2,
                breeding_herd_id=self.herds[2],
            )[0],
            db.Breeding.get_or_create(
                breed_date=datetime(2020, 1, 1),
                birth_date=datetime(2020, 2, 1),
                mother=self.parents[0],
                father=self.parents[1],
                litter_size=2,
                litter_size6w=2,
                breeding_herd_id=self.herds[1],
            )[0],
            db.Breeding.get_or_create(
                breed_date=datetime(2022, 1, 1),
                #       birth_date=datetime(2021, 2, 1),
                mother=self.parents[2],
                father=self.parents[3],
                breeding_herd_id=self.herds[2],
            )[0],
        ]
        for breeding in self.breeding:
            breeding.save()

        self.individuals = [
            db.Individual.get_or_create(
                origin_herd=self.herds[0],
                breeding=self.breeding[0],
                color=self.colors[0],
                certificate="12",
                number="G1-2111",
            )[0],
            db.Individual.get_or_create(
                origin_herd=self.herds[1],
                breeding=self.breeding[2],
                color=self.colors[0],
                certificate="13",
                number="G2-2011",
            )[0],
            db.Individual.get_or_create(
                origin_herd=self.herds[2], breeding=self.breeding[1], number="M3-2122"
            )[0],
            db.Individual.get_or_create(
                origin_herd=self.herds[0],
                breeding=self.breeding[0],
                color=self.colors[0],
                number="G1-2112",
            )[0],
            db.Individual.get_or_create(
                origin_herd=self.herds[2],
                breeding=self.breeding[1],
                color=self.colors[0],
                number="M3-2111",
            )[0],
        ]
        for individual in self.individuals:
            individual.save()

        # additional breeding between regular individuals
        self.breeding += [
            db.Breeding.get_or_create(
                breed_date=datetime(2020, 6, 1),
                mother=self.individuals[0],
                father=self.individuals[1],
                litter_size=3,
                litter_size6w=2,
                breeding_herd_id=self.herds[0],
            )[0],
        ]
        self.breeding[-1].save()

        self.weights = [
            db.Weight.get_or_create(
                individual=self.individuals[0],
                weight=2.1,
                weight_date=datetime(2020, 2, 2),
            )[0],
        ]
        for weight in self.weights:
            weight.save()

        self.bodyfat = [
            db.Bodyfat.get_or_create(
                individual=self.individuals[0],
                bodyfat="low",
                bodyfat_date=datetime(2020, 2, 2),
            )[0],
        ]
        for bodyfat in self.bodyfat:
            bodyfat.save()

        self.admin = da.register_user("admin", "pass")
        self.viewer = da.register_user("spec", "pass")
        self.manager = da.register_user("man", "pass")
        self.owner = da.register_user("owner", "pass")
        self.admin.add_role("admin", None)
        self.viewer.add_role("viewer", self.genebanks[0].id)
        self.manager.add_role("manager", self.genebanks[0].id)
        self.owner.add_role("owner", self.herds[0].id)

        self.herd_tracking = [
            db.HerdTracking.get_or_create(
                herd=self.herds[0],
                signature=self.manager,
                individual=self.individuals[0],
                herd_tracking_date=datetime(2021, 2, 1),
            )[0],
            db.HerdTracking.get_or_create(
                herd=self.herds[1],
                signature=self.manager,
                individual=self.individuals[1],
                herd_tracking_date=datetime(2021, 2, 1),
            )[0],
            db.HerdTracking.get_or_create(
                herd=self.herds[0],
                signature=self.manager,
                individual=self.individuals[2],
                herd_tracking_date=datetime(2021, 2, 1),
            )[0],
            db.HerdTracking.get_or_create(
                herd=self.herds[0],
                signature=self.manager,
                individual=self.individuals[3],
                herd_tracking_date=datetime(2021, 2, 1),
            )[0],
            db.HerdTracking.get_or_create(
                herd=self.herds[2],
                signature=self.manager,
                individual=self.individuals[4],
                herd_tracking_date=datetime(2021, 2, 1),
            )[0],
            db.HerdTracking.get_or_create(
                from_herd=self.herds[0],
                herd=self.herds[2],
                signature=self.manager,
                individual=self.individuals[2],
                herd_tracking_date=datetime.now() - timedelta(days=30),
            )[0],
        ]
