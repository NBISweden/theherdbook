#!/usr/bin/env python3
"""
Unit tests for the herdbook endpoints.
"""
# Fairly lax pylint settings as we want to test a lot of things

# pylint: disable=too-many-public-methods
# pylint: disable=too-many-statements

import os
import unittest

from datetime import datetime

# pylint: disable=import-error
import utils.database as db
import utils.data_access as da


class DatabaseTest(unittest.TestCase):
    """
    Database test wrapper that sets up the database connection.
    """

    # pylint: disable=too-many-instance-attributes

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
            db.Herd.get_or_create(
                genebank=self.genebanks[0],
                herd="H1",
                herd_name="herd1",
                name="o1",
                name_privacy="private",
                email="o@h1",
                email_privacy="authenticated",
                www="www1",
                www_privacy="public",
            )[0],
            db.Herd.get_or_create(
                genebank=self.genebanks[0],
                herd="H2",
                herd_name="herd2",
                name="o2",
                name_privacy="authenticated",
                email="o@h2",
                email_privacy="public",
                www="www2",
                www_privacy="private",
            )[0],
            db.Herd.get_or_create(
                genebank=self.genebanks[1],
                herd="H3",
                herd_name="herd3",
                name="o3",
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
            breed_date=datetime(2019, 1, 1), litter_size=2
        )[0]

        self.parents = [
            db.Individual.get_or_create(
                origin_herd=self.herds[0], breeding=parent_breeding, number="P1"
            )[0],
            db.Individual.get_or_create(
                origin_herd=self.herds[0], breeding=parent_breeding, number="P2"
            )[0],
            db.Individual.get_or_create(
                origin_herd=self.herds[1], breeding=parent_breeding, number="P3"
            )[0],
            db.Individual.get_or_create(
                origin_herd=self.herds[1], breeding=parent_breeding, number="P4"
            )[0],
        ]
        for parent in self.parents:
            parent.save()

        self.breeding = [
            db.Breeding.get_or_create(
                breed_date=datetime(2020, 1, 1),
                mother=self.parents[0],
                father=self.parents[1],
                litter_size=2,
            )[0],
            db.Breeding.get_or_create(
                breed_date=datetime(2020, 1, 1),
                mother=self.parents[2],
                father=self.parents[3],
                litter_size=1,
            )[0],
        ]
        for breeding in self.breeding:
            breeding.save()

        self.individuals = [
            db.Individual.get_or_create(
                origin_herd=self.herds[0],
                breeding=self.breeding[0],
                colour=self.colors[0],
                number="H1-1",
            )[0],
            db.Individual.get_or_create(
                origin_herd=self.herds[1], breeding=self.breeding[0], number="H2-2"
            )[0],
            db.Individual.get_or_create(
                origin_herd=self.herds[0], breeding=self.breeding[1], number="H3-3"
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
        self.specialist = da.register_user("spec", "pass")
        self.manager = da.register_user("man", "pass")
        self.owner = da.register_user("owner", "pass")
        self.admin.add_role("admin", None)
        self.specialist.add_role("specialist", self.genebanks[0].id)
        self.manager.add_role("manager", self.genebanks[0].id)
        self.owner.add_role("owner", self.herds[0].id)

        self.herd_tracking = [
            db.HerdTracking.get_or_create(
                herd=self.herds[0],
                signature=self.manager,
                individual=self.individuals[0],
                herd_tracking_date=datetime(2020, 10, 10),
            )[0],
            db.HerdTracking.get_or_create(
                herd=self.herds[1],
                signature=self.manager,
                individual=self.individuals[1],
                herd_tracking_date=datetime(2019, 1, 1),
            )[0],
            db.HerdTracking.get_or_create(
                herd=self.herds[0],
                signature=self.manager,
                individual=self.individuals[2],
                herd_tracking_date=datetime(2019, 12, 31),
            )[0],
            db.HerdTracking.get_or_create(
                from_herd=self.herds[0],
                herd=self.herds[2],
                signature=self.manager,
                individual=self.individuals[2],
                herd_tracking_date=datetime.now(),
            )[0],
        ]
