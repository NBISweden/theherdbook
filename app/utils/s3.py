"""
S3 client handler.
"""
from pathlib import Path
import logging
import boto3
import botocore
import utils.settings as settings


class S3Handler:  # pylint: disable=too-many-instance-attributes
    """
    Encapsulates the R/W logic from/to a S3 endpoint.
    """

    def __init__(
        self,
        bucket,
        endpoint,
        region,
        secret_key,
        access_key,
        verify,
        cert,
        private_key,
    ):  # pylint: disable=too-many-arguments
        """
        Constructor for initialising a S3 client.
        """
        assert isinstance(bucket, str)
        self.bucket = bucket
        assert isinstance(endpoint, (str, type(None)))
        self.endpoint = endpoint
        assert isinstance(region, str)
        self.region = region
        assert isinstance(access_key, str)
        self.access_key = access_key
        assert isinstance(secret_key, str)
        self.secret_key = secret_key
        assert isinstance(verify, (bool, Path))
        self.verify = verify
        assert isinstance(cert, (Path, type(None)))
        self.cert = cert
        assert isinstance(private_key, (Path, type(None)))
        self.private_key = private_key

        config_params = {
            "connect_timeout": 40,
        }

        use_ssl = False

        if cert and private_key:
            config_params["client_cert"] = (cert, private_key)
            use_ssl = True

        config = botocore.client.Config(**config_params)
        self.s3_client = boto3.client(
            "s3",
            endpoint_url=self.endpoint,
            region_name=region,
            use_ssl=use_ssl,
            verify=verify,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            config=config,
        )

        try:
            logging.debug("Creating %s bucket", str(bucket))
            self.s3_client.create_bucket(Bucket=self.bucket)
        except self.s3_client.exceptions.BucketAlreadyOwnedByYou as ex:
            logging.debug("Bucket already exists: %s", str(ex))

    def get_object(self, bucket_object_name):
        """
        Returns the bytes of a S3 object.
        """
        try:
            obj_res = self.s3_client.get_object(
                Bucket=self.bucket, Key=bucket_object_name
            )
            obj_data = obj_res["Body"].read()
        except Exception as ex:
            raise ex

        return obj_data

    def put_object(self, file_name=None, file_data=None):
        """
        Uploads bytes to a S3 object.
        """
        if file_name is None or not isinstance(file_name, str):
            return False
        try:
            self.s3_client.put_object(Body=file_data, Bucket=self.bucket, Key=file_name)
        except Exception as ex:
            raise ex

        return True

    def head_object(self, object_name):
        """
        Returns whether an object exists in a bucket or not.
        """
        try:
            self.s3_client.head_object(Bucket=self.bucket, Key=object_name)
        except Exception as ex:
            raise ex

        return True


def get_s3_client():
    """
    Returns a S3 client instance.
    """
    s3_client = S3Handler(
        bucket=settings.s3.bucket,
        endpoint=settings.s3.endpoint,
        region=settings.s3.region,
        secret_key=settings.s3.secret_key,
        access_key=settings.s3.access_key,
        verify=settings.s3.verify,
        cert=settings.s3.cert,
        private_key=settings.s3.private_key,
    )
    return s3_client
