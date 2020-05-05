#!/usr/bin/env python3
"""
Database handler for 'the herdbook'.
"""

import logging

from peewee import (PostgresqlDatabase,
                    Proxy,
                    Model,
                    AutoField,
                    CharField,
                    DateField,
                    ForeignKeyField,
                    FloatField,
                    IntegerField,
                    TextField,
                    )


DB_PROXY = Proxy()

def set_database(name, host, port, user, password):
    """
    This function makes it possible to set the database manually when settings
    aren't loaded.
    """
    DB_PROXY.initialize(
        PostgresqlDatabase(name,
                           host=host,
                           port=port,
                           user=user,
                           password=password))

try:
    import settings
    set_database(settings.postgres.name,
                 settings.postgres.host,
                 settings.postgres.port,
                 settings.postgres.user,
                 settings.postgres.password)
except ModuleNotFoundError:
    logging.warning("No settings file found. Database must be set manually")


class BaseModel(Model):
    """
    Base model for the herdbook database.

    This class sets the database to use the postgres database.
    """

    class Meta:  # pylint: disable=too-few-public-methods
        """
        The Meta class is read automatically for Model information.
        """
        database = DB_PROXY


class Genebank(BaseModel):
    """
    Table for Genebanks.

    This table keep tracks of the names of genebanks.
    A genebank is comprised of several herds of animals.
    """
    id = AutoField(primary_key=True, column_name="genebank_id")
    name = CharField(100, unique=True)


class Colour(BaseModel):
    """
    Table for colors.

    This table keep tracks of the available color types of animals.
    """
    id = AutoField(primary_key=True, column_name="colour_id")
    name = CharField(50)
    comment = CharField(50, null=True)

class Individual(BaseModel):
    """
    Table for individual animals.

    The sex is an enum with the values 'male', 'female', and 'eunuch'.
    """
    id = AutoField(primary_key=True, column_name="individual_id")
    genebank = ForeignKeyField(Genebank)
    name = CharField(50, null=True)
    certificate = CharField(20, unique=True)
    number = CharField(20)
    sex = CharField(15, null=True)
    birth_date = DateField(null=True)
    mother = ForeignKeyField('self', null=True)
    father = ForeignKeyField('self', null=True)
    colour = ForeignKeyField(Colour, null=True)
    colour_note = CharField(100, null=True)
    death_date = DateField(null=True)
    death_note = CharField(50, null=True)
    weight_young = FloatField(null=True)
    litter = IntegerField(null=True)
    notes = CharField(100, null=True)

    class Meta:  # pylint: disable=too-few-public-methods
        """
        Add a unique index to number+genebank
        """
        indexes = (
            (('number', 'genebank'), True)
        )

class Weight(BaseModel):
    """
    Table for tracking animal weights.
    """
    id = AutoField(primary_key=True, column_name="weight_id")
    individual = ForeignKeyField(Individual)
    weight = FloatField()
    weight_date = DateField()


class Bodyfat(BaseModel):
    """
    Table for keeping track of animal body fat types.
    The available types are: 'low', 'normal', and 'high'
    """
    id = AutoField(primary_key=True, column_name="bodyfat_id")
    individual = ForeignKeyField(Individual)
    bodyfat = CharField(6, null=True)
    bodyfat_date = DateField()


class Herd(BaseModel):
    """
    Table for keeping track of herds

    The herd table only holds herd information.
    Tracking of individuals over time is done in
    the herd_tracking table.

    Latitude/longitude in WGS84.
    Location should be a place name.

    *_privacy fields are enums with the values 'private', 'authenticated', and
    'public'.
    """
    id = AutoField(primary_key=True, column_name="herd_id")
    herd = IntegerField(unique=True)
    name = TextField(null=True)
    name_privacy = CharField(15, null=True)
    physical_address = TextField(null=True)
    physical_address_privacy = CharField(15, null=True)
    location = TextField(null=True)
    location_privacy = CharField(15, null=True)
    email = TextField(null=True)
    email_privacy = CharField(15, null=True)
    email_verified = DateField(null=True)
    www = TextField(null=True)
    www_privacy = CharField(15, null=True)
    mobile_phone = TextField(null=True)
    mobile_phone_privacy = CharField(15, null=True)
    wire_phone = TextField(null=True)
    wire_phone_privacy = CharField(15, null=True)
    latitude = FloatField(null=True)
    longitude = FloatField(null=True)
    coordinates_privacy = CharField(15, null=True)


class HerdTracking(BaseModel):
    """
    The herd_tracking table represents documented instances of an
    individual belonging to a particular herd.  It connects the two
    tables individual and herd in a N:M fashion.
    """
    id = AutoField(primary_key=True, column_name="herd_tracking_id")
    herd = ForeignKeyField(Herd)
    individual = ForeignKeyField(Individual)
    herd_tracking_date = DateField()

    class Meta: # pylint: disable=too-few-public-methods
        """
        The Meta class is read automatically for Model information, and is used
        here to set the table name, as the table name is in snake case, which
        didn't fit the camel case class names.
        """
        table_name = "herd_tracking"


class User(BaseModel):
    """
    Table keeping track of system users.
    """
    id = AutoField(primary_key=True, column_name="user_id")
    email = TextField()
    privileges = TextField(null=True)

    class Meta: # pylint: disable=too-few-public-methods
        """
        The Meta class is read automatically for Model information, and is used
        here to set the table name, as 'User' is a clearer system user name than
        the table name 'hbuser.
        """
        table_name = "hbuser"

class Authenticators(BaseModel):
    """
    Authentication information for a user.
    """
    id = AutoField(primary_key=True, column_name="auth_id")
    user = ForeignKeyField(User)
    auth = CharField(9)
    auth_data = TextField(null=True)
