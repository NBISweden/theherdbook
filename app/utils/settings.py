"""
Instance specific settings for the herdbook.
"""

import logging
import os
import json
from argparse import Namespace
from pathlib import Path

logging.info("Reading Environment")

postgres = Namespace()  # pylint: disable=C0103
rapi = Namespace()  # pylint: disable=C0103
s3 = Namespace()  # pylint: disable=C0103
certs = Namespace()  # pylint: disable=C0103
service = Namespace()  # pylint: disable=C0103
# Read configuration from environment variable

certs.private_key = Path("certs/key.pem")
certs.ca = Path("certs/ca.pem")
certs.template = Path("template.pdf")

postgres.name = os.environ.get("POSTGRES_DB", "herdbook")
postgres.host = os.environ.get("POSTGRES_HOST", "herdbook-db")
postgres.port = os.environ.get("POSTGRES_PORT", "5432")
postgres.user = os.environ.get("POSTGRES_USER", "herdbook")
postgres.password = os.environ.get("POSTGRES_PASSWORD", "insecure")

rapi.host = os.environ.get("RAPI_HOST", "r-api")
rapi.port = os.environ.get("RAPI_PORT", "31113")

service.host = os.environ.get("HERDBOOK_HOST", "https://127.0.0.1:8443")

s3.bucket = os.environ.get("S3_BUCKET", "test")
s3.endpoint = os.environ.get("S3_ENDPOINT", None)
s3.region = os.environ.get("S3_REGION", "us-east-1")
s3.secret_key = os.environ.get("S3_SECRETKEY", "secretkeytest")
s3.access_key = os.environ.get("S3_ACCESSKEY", "accesskeytest")
s3.verify = json.loads(os.environ.get("S3_VERIFY", "True").lower())
s3.cert = None
s3.private_key = None
