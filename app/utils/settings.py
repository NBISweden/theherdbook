"""
Instance specific settings for the herdbook.
"""

import logging
import os
from argparse import Namespace

logging.info("Reading Environment")

postgres = Namespace()  # pylint: disable=C0103
rapi = Namespace()  # pylint: disable=C0103
s3 = Namespace()  # pylint: disable=C0103
# Read configuration from environment variable

postgres.name = os.environ.get("POSTGRES_DB", "herdbook")
postgres.host = os.environ.get("POSTGRES_HOST", "herdbook-db")
postgres.port = os.environ.get("POSTGRES_PORT", "5432")
postgres.user = os.environ.get("POSTGRES_USER", "herdbook")
postgres.password = os.environ.get("POSTGRES_PASSWORD", "insecure")

rapi.host = os.environ.get("RAPI_HOST", "r-api")
rapi.port = os.environ.get("RAPI_PORT", "31113")

s3.bucket = os.environ.get("S3_BUCKET", "test")
s3.endpoint = os.environ.get("S3_BUCKET", "http://s3backend:9000")
s3.region = os.environ.get("S3_REGION","us-east-1")
s3.secret_key = os.environ.get("S3_SECRETKEY", "secretkeytest")
s3.access_key = os.environ.get("S3_ACCESSKEY", "accesskeytest")
s3.verify = False
s3.cert = None
s3.private_key = None
