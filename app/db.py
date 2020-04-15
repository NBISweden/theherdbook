#!/usr/bin/env python3
"""
Database handler for 'the herdbook'.
"""

from peewee import (PostgresqlDatabase,
                    Model,
                    AutoField,
                    CharField,
                    DateField,
                    ForeignKeyField,
                    FloatField,
                    IntegerField,
                    TextField,
                    )

import settings


DATABASE = PostgresqlDatabase(settings.postgres.name,
                              host=settings.postgres.host,
                              port=settings.postgres.port,
                              user=settings.postgres.user,
                              password=settings.postgres.password)

class BaseModel(Model):
    """
    Base model for the herdbook database.

    This class sets the database to use the postgres database.
    """

    class Meta:  # pylint: disable=too-few-public-methods
        """
        The Meta class is read automatically for Model information.
        """
        database = DATABASE


class Herd(BaseModel):
    """
    Table for herds.

    This table keep tracks of the names of herds.
    """
    id = AutoField(primary_key=True, column_name="herd_id")
    name = CharField(100)

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
    herd = ForeignKeyField(Herd)
    name = CharField(50, null=True)
    certificate = CharField(20)
    number = CharField(20, unique=True)
    sex = CharField(15, null=True)
    birth_date = DateField()
    mother = ForeignKeyField('self', null=True)
    father = ForeignKeyField('self', null=True)
    colour = ForeignKeyField(Colour, null=True)
    colour_note = CharField(100, null=True)
    death_date = DateField(null=True)
    death_note = CharField(50, null=True)
    weight_young = FloatField(null=True)
    litter = IntegerField(null=True)
    notes = CharField(100, null=True)

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

class Genebank(BaseModel):
    """
    Table for keeping track of genebanks

    The genebank table only holds genebank information.
    Tracking of individuals over time is done in
    the genebank_tracking table.

    Latitude/longitude in WGS84.
    Location should be a place name.

    *_privacy fields are enums with the values 'private', 'authenticated', and
    'public'.
    """
    id = AutoField(primary_key=True, column_name="genebank_id")
    genebank = IntegerField(unique=True)
    name = TextField()
    name_privacy = CharField(15)
    physical_address = TextField()
    physical_address_privacy = CharField(15)
    email = TextField()
    email_privacy = CharField(15)
    www = TextField()
    www_privacy = CharField(15)
    mobile_phone = TextField()
    mobile_phone_privacy = CharField(15)
    wire_phone = TextField()
    wire_phone_privacy = CharField(15)
    latitude = FloatField()
    longitude = FloatField()
    coordinates_privacy = CharField(15)

class GenebankTracking(BaseModel):
    """
    The genebank_tracking table represents documented instances of an
    individual belonging to a particular genebank.  It connects the two
    tables individual and genebank in a N:M fashion.
    """
    id = AutoField(primary_key=True, column_name="genebank_tracking_id")
    genebank = ForeignKeyField(Genebank)
    individual = ForeignKeyField(Individual)
    genebank_tracking_date = DateField()

    class Meta: # pylint: disable=too-few-public-methods
        """
        The Meta class is read automatically for Model information, and is used
        here to set the table name, as the table name is in snake case, which
        didn't fit the camel case class names.
        """
        table_name = "genebank_tracking"


class User(BaseModel):
    """
    Table keeping track of system users.
    """
    id = AutoField(primary_key=True, column_name="user_id")
    email = TextField()
    privileges = TextField()

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
    auth_data = TextField()
