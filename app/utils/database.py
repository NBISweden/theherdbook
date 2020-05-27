#!/usr/bin/env python3
"""
Database handler for 'the herdbook'.
"""

import json
import uuid
import logging

from peewee import (PostgresqlDatabase,
                    Proxy,
                    Model,
                    DoesNotExist,
                    AutoField,
                    BooleanField,
                    CharField,
                    DateField,
                    ForeignKeyField,
                    FloatField,
                    IntegerField,
                    OperationalError,
                    TextField,
                    UUIDField,
                    )

from werkzeug.security import (
    check_password_hash,
    generate_password_hash,
)

DB_PROXY = Proxy()
DATABASE = None

def set_database(name, host, port, user, password):
    """
    This function makes it possible to set the database manually when settings
    aren't loaded.
    """
    global DATABASE #pylint: disable=global-statement
    DATABASE = PostgresqlDatabase(name,
                                  host=host,
                                  port=port,
                                  user=user,
                                  password=password)
    DB_PROXY.initialize(DATABASE)

try:
    import utils.settings as settings
    set_database(settings.postgres.name,
                 settings.postgres.host,
                 settings.postgres.port,
                 settings.postgres.user,
                 settings.postgres.password)
except ModuleNotFoundError:
    logging.warning("No settings file found. Database must be set manually")

def connect():
    """
    Connects to the database if it isn't already connected.
    """
    if DATABASE and DATABASE.is_closed():
        try:
            DATABASE.connect()
        except OperationalError as exception:
            logging.error(exception)

def disconnect():
    """
    Disconnects from the database if it isn't already disconnected,
    """
    if not DATABASE.is_closed():
        DATABASE.close()

def is_connected():
    """
    Wrapper around `DATABASE.is_connection_usable()`.
    """
    if not DATABASE:
        return False
    return DATABASE.is_connection_usable()


class BaseModel(Model):
    """
    Base model for the herdbook database.

    This class sets the database to use the postgres database.
    """

    def as_dict(self):
        """
        Returns the objects key/value pair as a dictionary.
        """
        return self.__dict__['__data__']

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


class Herd(BaseModel):
    """
    Table for keeping track of herds.
    A herd is part of a genebank, and contains individuals.

    The herd table only holds herd information.
    Tracking of individuals over time is done in
    the herd_tracking table.

    Latitude/longitude in WGS84.
    Location should be a place name.

    *_privacy fields are enums with the values 'private', 'authenticated', and
    'public'.
    """
    id = AutoField(primary_key=True, column_name="herd_id")
    genebank = ForeignKeyField(Genebank)
    herd = IntegerField()
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

    class Meta:  #pylint: disable=too-few-public-methods
        """
        Add a unique index to herd+genebank
        """
        indexes = (
            (('herd', 'genebank'), True),
        )


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
    certificate = CharField(20, null=True)
    number = CharField(20)
    sex = CharField(15, null=True)
    birth_date = DateField(null=True)
    mother = ForeignKeyField('self', null=True)
    father = ForeignKeyField('self', null=True)
    colour = ForeignKeyField(Colour, null=True)
    colour_note = CharField(100, null=True)
    death_date = DateField(null=True)
    death_note = CharField(50, null=True)
    litter = IntegerField(null=True)
    notes = CharField(100, null=True)

    def as_dict(self):
        """
        Returns the objects key/value pair as a dictionary, including data from
        the weight, colour, and bodyfat tables.
        """
        data = super().as_dict()
        data['herd'] = {'id': self.herd.id, 'name':self.herd.name}
        data['mother'] = {'id': self.mother.id, 'name': self.mother.name} \
            if self.mother else None
        data['father'] = {'id': self.father.id, 'name': self.father.name} \
            if self.father else None
        data['colour'] = self.colour.name if self.colour else None
        data['weights'] = [{'weight':w.weight, 'date':w.weight_date}
            for w in self.weight_set]
        data['bodyfat'] = [{'bodyfat':b.bodyfat, 'date':b.bodyfat_date}
            for b in self.bodyfat_set]
        data['herd_tracking'] = [
            {
                'herd_id':h.herd.id,
                'herd':h.herd.name,
                'date':h.herd_tracking_date
            }
            for h in self.herdtracking_set
        ]

        return data

    def short_info(self):
        """
        Returns a dictionary with a subset of fields so that all data doesn't
        have to be sent when rendering tables.
        Included fields.
            - id
            - name
        """
        return {'id': self.id, 'name': self.name}

    class Meta:  #pylint: disable=too-few-public-methods
        """
        Add a unique index to number+genebank
        """
        indexes = (
            (('number', 'herd'), True),
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
    uuid = UUIDField()
    password_hash = CharField(128)
    validated = BooleanField(default=False)
    privileges = TextField(null=True)

    def frontend_data(self):
        """
        Returns the information that is needed in the frontend.
        """
        return {'email': self.email,
                'validated': self.validated if self.validated else False,
                }

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


MODELS = [Genebank, Herd, Colour, Individual, Weight, Bodyfat, HerdTracking,
          User, Authenticators]

def insert_data(filename='default_data.json'):
    """
    Takes a json file, `filename`, and inserts the data into the database. If
    the data contains id values, the data will be updated if already in the
    database.

    The json data should be formatted like:
    ```
    {
        "<table name>": [
            {
                "key-1": "value",
                "key-2": "value",
                "key-3": null,
                [... more key, value pairs]
            },
            [... more data rows]
        ],
        [... more table names with data lists]
    }
    ```
    """
    data = json.load(open(filename))

    for table, values in data.items():
        if table not in [m.__name__ for m in MODELS]:
            logging.error(
                "Unknown data table '%s' in file '%s'",
                table,
                filename
            )
            continue
        model = [m for m in MODELS if m.__name__ == table][0]
        logging.info("Inserting %s data from %s", model.__name__, filename)
        # insert one-by-one so that we can upsert
        for value in values:
            model(DATABASE).get_or_create(**value)
    DATABASE.commit()

def init():
    """
    Initializes all tables in the database, if they're not already available.
    """
    for model in MODELS:
        if not model.table_exists():
            logging.info(
                "Creating database table %s",
                model.__name__
            )
            model.create_table()

    logging.info("Inserting default data")
    insert_data('default_data.json')

def verify(try_init=True):
    """
    Initialize the database, verify the tables in the database, and verify that
    we can select on each table.
    """
    all_ok = True
    for model in MODELS:
        if model.table_exists():
            model(database=DATABASE).select().execute()
        else:
            all_ok = False
            break

    if not all_ok and try_init:
        logging.warning("Database has problems. Attempting re-initialization.")
        init()
        return verify(False)

    return all_ok

def register_user(email, password):
    """
    Creates a new user from an e-mail and password, returning the new user
    object.
    """
    print("inserting user %s, %s" % (email, password))
    user = User(email=email,
                uuid=uuid.uuid4().hex,
                password_hash=generate_password_hash(password),
                validated=False,
                privileges=""
                )
    user.save()

def authenticate_user(email, password):
    """
    Authenticates an email/password pair against the database. Returns the
    user info for the authenticated user on success, or None on failure.
    """
    try:
        user_info = User.get(User.email == email)
        if check_password_hash(user_info.password_hash, password):
            logging.info("Login from %s", email)
            return user_info
    except DoesNotExist:
        # Perform password check regardless of username to prevent timing
        # attacks
        check_password_hash("This-always-fails", password)
    logging.info("Failed login attempt for %s", email)
    return None

def fetch_user_info(user_id):
    """
    Fetches user information for a given user id.
    """
    try:
        return User.get(User.uuid == user_id)
    except DoesNotExist:
        logging.error("could not find user_id = %s", user_id)
        return None

def get_genebank(genebank_id):
    """
    Returns information on the genebank given by `genebank_id`.
    """
    try:
        genebank = Genebank.get(genebank_id).as_dict()
        herd_query = Herd(database=DATABASE).select() \
                                            .where(Herd.genebank == genebank_id)
        genebank['herds'] = [h.as_dict() for h in herd_query.execute()]
        return genebank
    except DoesNotExist:
        return None

def get_genebanks():
    """
    Returns all genebanks.
    """
    genebanks_query = Genebank(database=DATABASE).select()
    return [g.as_dict() for g in genebanks_query.execute()]

def get_herd(herd_id):
    """
    Returns information on the herd given by `herd_id`, including a list of all
    individuals belonging to that herd.
    """
    try:
        herd = Herd.get(herd_id).as_dict()
        individuals_query = Individual(database=DATABASE).select() \
                                .where(Individual.herd == herd_id)
        herd['individuals'] = [i.short_info() for i in individuals_query.execute()]
        return herd
    except DoesNotExist:
        return None

def get_individual(individual_id):
    """
    Returns information on a given individual id.
    """
    try:
        individual = Individual.get(individual_id)
        return individual.as_dict()
    except DoesNotExist:
        return None
