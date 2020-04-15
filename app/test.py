#!/usr/bin/env python3
"""
Unit tests for the herdbook.
"""

import unittest
from unittest import TestCase
import requests

HOST = "http://localhost:4200"

class TestEndpoints(TestCase):
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

    def test_get_herds(self):
        """
        Checks that the herds endpoint (/api/herds) is available.
        """
        self.assertEqual(
            requests.get(HOST + '/api/herds').status_code,
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

if __name__ == '__main__':
    unittest.main()
