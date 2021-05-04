"""
S3 client handler.
"""
from pathlib import Path
import boto3
import botocore


class S3Handler:  # pylint: disable=too-many-instance-attributes
    """
    Encapsulates the R/W logic from/to a S3 endpoint.
    """

    def __init__(  # pylint: disable=too-many-arguments
        self,
        bucket,
        endpoint,
        region,
        secret_key,
        access_key,
        verify,
        cert,
        private_key,
    ):
        """
        Constructor for initialising a S3 client.
        """
        assert isinstance(bucket, str)
        self.bucket = bucket
        assert isinstance(endpoint, str)
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

        if cert and private_key:
            config_params["client_cert"] = (cert, private_key)

        config = botocore.client.Config(**config_params)
        self.s3_client = boto3.client(
            "s3",
            endpoint_url=self.endpoint,
            region_name=region,
            use_ssl=self.endpoint.startswith("https"),
            verify=verify,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            config=config,
        )

        print(vars(self))

        try:
            print("Creating %s bucket" % bucket)
            self.s3_client.create_bucket(Bucket=self.bucket)
        except self.s3_client.exceptions.BucketAlreadyOwnedByYou as ex:
            print("Bucket already exists: %s" % ex)

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

    def put_object(self, bucket_file_name=None, file_data=None):
        """
        Uploads bytes to a S3 object.
        """
        if bucket_file_name is None or not isinstance(bucket_file_name, str):
            return False
        try:
            self.s3_client.put_object(
                Body=file_data, Bucket=self.bucket, Key=bucket_file_name
            )
        except Exception as ex:
            raise ex

        return True

    def list_object_checksums(self, prefix):
        """
        Returns a list with all checksums of objects inside a bucket.
        """
        objects = []

        try:
            bucket_list = self.s3_client.list_objects_v2(
                Bucket=self.bucket, Prefix=prefix
            )

            for obj in bucket_list["Contents"]:
                objects.append(obj["ETag"])
        except Exception as ex:
            raise ex

        return objects

    def head_object(self, object_name):
        """
        Returns whether an object exists in a bucket or not.
        """
        try:
            self.s3_client.get_object(Bucket=self.bucket, Key=object_name)
        except Exception as ex:
            raise ex

        return True


@staticmethod()
def get_s3_client():
    """
    Returns a S3 client instance.
    """
    s3_client = S3Handler(
        bucket="test",
        endpoint="http://127.0.0.1:9000",
        region="us-east-1",
        secret_key="secretkeytest",
        access_key="accesskeytest",
        verify=None,
        cert=None,
        private_key=None,
    )
    return s3_client
