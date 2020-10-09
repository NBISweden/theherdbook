"""
Instance specific settings for the herdbook.
"""

import os
import logging
from argparse import Namespace

logging.info("Reading Environemt")

postgres = Namespace()  # pylint: disable=C0103

#Read configuration from environment variable

postgres.name = os.environ.get("POSTGRES_DB", "herdbook")
postgres.host = os.environ.get("POSTGRES_HOST", "herdbook-db")
postgres.port = os.environ.get("POSTGRES_PORT", "5432")
postgres.user = os.environ.get("POSTGRES_USER", "herdbook")
postgres.password = os.environ.get("POSTGRES_PASSWORD", "insecure")
