#!/usr/bin/env python3
"""
Unit tests for the herdbook.
"""

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

class TestDatabaseMapping(unittest.TestCase):
    """
    Checks that the database mapping is valid.
    """
    def setUp(self):
        db.set_database("herdbook", "localhost", "5432", "herdbook", "insecure")

    def test_genebank(self):
        """
        Checks that the database tables exists and that SELECT queries work
        using the db.verify() function.
        """
        self.assertTrue(db.verify(False))

if __name__ == '__main__':
    unittest.main()
