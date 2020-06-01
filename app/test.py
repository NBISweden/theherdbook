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
    TEST_DATABASE='test_database.sql'

    def setUp(self):
        """
        Initializes a sqlite3 test database with some data needed for testing.
        """
        db.set_database(self.TEST_DATABASE, test=True)
        db.init()

    def tearDown(self):
        """
        Removes the sqlite3 test database file.
        """
        try:
            os.stat(self.TEST_DATABASE)
            os.remove(self.TEST_DATABASE)
        except FileNotFoundError:
            pass


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

if __name__ == '__main__':
    unittest.main()
