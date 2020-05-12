#!/usr/bin/env python3
"""
Unit tests for the herdbook.
"""

import unittest
import requests

import db

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

    def test_get_genebanks(self):
        """
        Checks that the genebanks endpoint (/api/genebanks) is available.
        """
        self.assertEqual(
            requests.get(HOST + '/api/genebanks').status_code,
            200
        )

    def test_get_individual(self):
        """
        Checks that the individuals endpoint (/api/individual/:id) is available.
        """
        self.assertEqual(
            requests.get(HOST + '/api/individual/23').status_code,
            200
        )


class TestDatabaseMapping(unittest.TestCase):
    """
    Checks that the database mapping is valid.
    """
    def setUp(self):
        db.set_database("herdbook", "localhost", "5432", "herdbook", "insecure")

    def test_genebank(self):
        """
        Checks that the genebank table exists and that all the fields in the
        mapping exists in the database.
        """
        self.assertTrue(db.Genebank.table_exists())
        db.Genebank.select().execute()


    def test_colour(self):
        """
        Checks that the colour table exists and that all the fields in the
        mapping exists in the database.
        """
        self.assertTrue(db.Colour.table_exists())
        db.Colour.select().execute()

    def test_individual(self):
        """
        Checks that the "individual" table exists and that all the fields in the
        mapping exists in the database.
        """
        self.assertTrue(db.Individual.table_exists())
        db.Individual.select().execute()

    def test_weight(self):
        """
        Checks that the weight table exists and that all the fields in the
        mapping exists in the database.
        """
        self.assertTrue(db.Weight.table_exists())
        db.Weight.select().execute()

    def test_bodyfat(self):
        """
        Checks that the bodyfat table exists and that all the fields in the
        mapping exists in the database.
        """
        self.assertTrue(db.Bodyfat.table_exists())
        db.Bodyfat.select().execute()

    def test_herd(self):
        """
        Checks that the herd table exists and that all the fields in the
        mapping exists in the database.
        """
        self.assertTrue(db.Herd.table_exists())
        db.Herd.select().execute()

    def test_herd_tracking(self):
        """
        Checks that the herd_tracking table exists and that all the fields in the
        mapping exists in the database.
        """
        self.assertTrue(db.HerdTracking.table_exists())
        db.HerdTracking.select().execute()

    def test_user(self):
        """
        Checks that the user table exists and that all the fields in the
        mapping exists in the database.
        """
        self.assertTrue(db.User.table_exists())
        db.User.select().execute()

    def test_authenticators(self):
        """
        Checks that the authenticators table exists and that all the fields in the
        mapping exists in the database.
        """
        self.assertTrue(db.Authenticators.table_exists())
        db.Authenticators.select().execute()

if __name__ == '__main__':
    unittest.main()
