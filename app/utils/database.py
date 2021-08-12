#!/usr/bin/env python3
"""
Database handler for 'the herdbook'.
"""
# pylint: disable=too-many-lines

import json
import logging
import re
import sys
from datetime import datetime, timedelta

import utils.settings as settings
from flask_login import UserMixin
from peewee import (
    AutoField,
    BooleanField,
    CharField,
    DateField,
    DateTimeField,
    DeferredForeignKey,
    DoesNotExist,
    FloatField,
    ForeignKeyField,
    IntegerField,
    Model,
    OperationalError,
    PostgresqlDatabase,
    Proxy,
    SqliteDatabase,
    TextField,
    UUIDField,
    fn,
)
from playhouse.migrate import PostgresqlMigrator, SqliteMigrator, migrate

CURRENT_SCHEMA_VERSION = 7
DB_PROXY = Proxy()
DATABASE = None
DATABASE_MIGRATOR = None


def set_test_database(name):
    """
    This function sets the database to a named sqlite3 database for testing.
    """
    global DATABASE, DATABASE_MIGRATOR  # pylint: disable=global-statement
    DATABASE = SqliteDatabase(name)

    # Assume Sqlite to be connected always.
    DB_PROXY.initialize(DATABASE)

    DATABASE_MIGRATOR = SqliteMigrator(DATABASE)


def set_database(name, host=None, port=None, user=None, password=None):
    """
    This function makes it possible to set the database manually when settings
    aren't loaded.
    """
    global DATABASE, DATABASE_MIGRATOR  # pylint: disable=global-statement
    DATABASE = PostgresqlDatabase(
        name, host=host, port=port, user=user, password=password
    )

    DB_PROXY.initialize(DATABASE)

    DATABASE_MIGRATOR = PostgresqlMigrator(DATABASE)


if "pytest" in sys.modules or "unittest" in sys.modules:
    logging.info("No settings for databse, using test database")
    set_test_database("herdbook")
else:
    logging.info("Using database per settings")

    set_database(
        settings.postgres.name,
        settings.postgres.host,
        settings.postgres.port,
        settings.postgres.user,
        settings.postgres.password,
    )


def connect():
    """
    Connects to the database if it isn't already connected.
    """
    if DATABASE and DATABASE.is_closed():
        try:
            DATABASE.connect()
            check_migrations()
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
        data = self.__dict__["__data__"].copy()
        for key, value in data.items():
            if value and key.endswith("_date"):
                data[key] = value.strftime("%Y-%m-%d")

        return data

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

    def short_info(self):
        """
        Returns the genebank data, including `id`, `name`, and a `herds` array
        including the `Herd.short_info()` data.
        """

        return {
            "id": self.id,
            "name": self.name,
            "herds": [
                h.short_info() for h in Herd.select().where(Herd.genebank == self)
            ],
        }

    def get_herds(self, user):
        """
        Returns all herds that the user identified by `user` has access to,
        with restricted fields filtered by access level.
        """
        if self.id not in user.accessible_genebanks:
            return None

        herds = []
        for herd in Herd.select().where(Herd.genebank == self):
            herds += [herd.filtered_dict(user)]
        return herds


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
    herd = CharField(10)
    herd_name = TextField(null=True)
    is_active = BooleanField(null=True)
    start_date = DateField(null=True)
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

    @property
    def individuals(self):
        """
        Returns a list of all individuals in the herd.
        """

        # Rank all herdtracking values by individual and date
        current_herd = HerdTracking.select(
            HerdTracking.herd.alias("herd"),
            HerdTracking.individual.alias("i_id"),
            fn.RANK()
            .over(
                order_by=[HerdTracking.herd_tracking_date.desc()],
                partition_by=[HerdTracking.individual],
            )
            .alias("rank"),
        )

        # Select all the individuals in the current herd
        i_query = (
            Individual.select()
            .join(current_herd, on=(Individual.id == current_herd.c.i_id))
            .where(current_herd.c.rank == 1)
            .where(current_herd.c.herd == self.id)
        )

        # return as a list
        # pylint: disable=unnecessary-comprehension
        return [i for i in i_query]

    def short_info(self):
        """
        Returns the `id`, `herd`, `genebank`, `herd_name`, and `is_active`
        fields as a dict.
        """
        return {
            "id": self.id,
            "herd": self.herd,
            "genebank": self.__dict__["__data__"]["genebank"],
            "herd_name": self.herd_name,
            "is_active": self.is_active,
        }

    def filtered_dict(self, user=None):
        """
        Returns the model data filtered by the access level of the given `user`.
        """

        access_level = "public"
        if user and user.is_admin:
            access_level = "private"
        elif user:
            for role in user.privileges:
                if role["level"] in ["specialist", "manager"]:
                    if role["genebank"] == self.genebank.id:
                        access_level = "private"
                        break
                elif role["level"] == "owner":
                    if role["herd"] == self.id:
                        access_level = "private"
                        break
                    access_level = "authenticated"

        data = self.as_dict()

        if "email_verified" in data:
            del data["email_verified"]

        return remove_fields_by_privacy(data, access_level)

    class Meta:  # pylint: disable=too-few-public-methods
        """
        Add a unique index to herd+genebank
        """

        indexes = ((("herd", "genebank"), True),)


def remove_fields_by_privacy(data, access_level):
    """
    Removes fields according to a given access level (private, authenticated
    or public) by looking at the _privacy fields in the data.

    >>> test_data = {
    ...     'high': 3,
    ...     'high_privacy': 'private',
    ...     'mid': 4,
    ...     'mid_privacy': 'authenticated',
    ...     'low': 5,
    ...     'low_privacy': 'public',
    ... }
    >>> remove_fields_by_privacy(test_data, 'private') == test_data
    True
    >>> remove_fields_by_privacy(test_data, 'authenticated')
    {'mid': 4, 'low': 5}
    >>> remove_fields_by_privacy(test_data, 'public')
    {'low': 5}

    The privacy level of the fields 'latitude' and 'longitude' are
    under 'coordinates_privacy'.

    >>> test_data = {
    ...     'coordinates_privacy': 'authenticated',
    ...     'latitude': 59,
    ...     'longitude': 17,
    ... }
    >>> remove_fields_by_privacy(test_data, 'authenticated')
    {'latitude': 59, 'longitude': 17}
    >>> remove_fields_by_privacy(test_data, 'public')
    {}

    """

    data = {**data}

    levels = ["public", "authenticated", "private"]
    # prune data according to access level
    for field in [f for f in data.keys() if f.endswith("_privacy")]:
        # remove values if access_level is less than required
        field_level = data[field] or "private"
        if levels.index(access_level) < levels.index(field_level):
            if field == "coordinates_privacy":
                del data["latitude"]
                del data["longitude"]
            else:
                target_field = field[: -len("_privacy")]
                del data[target_field]
        # remove the access level value if the user doesn't have private
        # access
        if access_level != "private":
            del data[field]

    return data


class Color(BaseModel):
    """
    Table for colors.

    This table keep tracks of the available color types of animals.
    """

    id = AutoField(primary_key=True, column_name="color_id")
    name = CharField(50)
    comment = CharField(50, null=True)
    genebank = ForeignKeyField(Genebank)


class Breeding(BaseModel):
    """
    Table for breeding and birth.
    """

    id = AutoField(primary_key=True, column_name="breeding_id")
    breed_date = DateField(null=True)
    breed_notes = TextField(null=True)
    father = DeferredForeignKey("Individual", null=True)
    mother = DeferredForeignKey("Individual", null=True)
    birth_date = DateField(null=True)
    birth_notes = TextField(null=True)
    litter_size = IntegerField(null=True)

    def as_dict(self):
        """
        Returns the objects key/value pair as a dictionary.

        The parent foreign keys are also replaced by parent numbers, as they
        frontend uses parent numbers instead of database id's.
        """
        data = super().as_dict()
        # pylint: disable=no-member
        data["mother"] = self.mother.number
        data["father"] = self.father.number
        return data

    class Meta:  # pylint: disable=too-few-public-methods
        """
        Add a unique index to mother+father+birth_date
        """

        indexes = ((("mother", "father", "birth_date"), True),)

    @staticmethod
    def next_individual_number(herd, birth_date, breeding_event):
        """
        Returns the number for the next individual in a litter for a given year and herd.
        """
        if isinstance(birth_date, str):
            birth_date = datetime.strptime(birth_date, "%Y-%m-%d")
            assert isinstance(birth_date, datetime)

        try:
            events = (
                Breeding.select(Breeding)
                .join(Individual, on=(Breeding.id == Individual.breeding))
                .join(Herd, on=(Herd.id == Individual.origin_herd))
                .where((Herd.herd == herd))
                .order_by(Breeding.breed_date.desc())
            ).execute()

            print("Last litter number is: %s " % len(events))

            for ev in events:
                print("ev: ", ev.id, ev.breed_date)

            # last_event_id = events[0]
            # print("Last event id is: %s " % last_event_id)

            next_litter = len(events)

            individuals = (
                Individual.select(Individual).where(
                    Individual.breeding == str(breeding_event)
                )
            ).execute()

            for ind in individuals:
                print("ind: ", ind.id, ind.breeding.id)

            litter_size = len(individuals)
            print("Litter size is: %s " % litter_size)

            ind_number = (
                f"{herd}-{str(birth_date.year)[2:4]}{next_litter}{litter_size + 1}"
            )
            print("Indiv nummer : %s " % ind_number)

            return ind_number

        except DoesNotExist:
            pass
        return None


class Individual(BaseModel):
    """
    Table for individual animals.

    The sex is an enum with the values 'male', 'female', and 'eunuch'.
    """

    id = AutoField(primary_key=True, column_name="individual_id")
    origin_herd = ForeignKeyField(Herd)
    name = CharField(50, null=True)
    certificate = CharField(20, null=True)
    digital_certificate = IntegerField(unique=True, null=True)
    number = CharField(20, unique=True)
    sex = CharField(15, null=True)
    color = ForeignKeyField(Color, null=True)
    color_note = CharField(100, null=True)
    death_date = DateField(null=True)
    death_note = CharField(50, null=True)
    notes = CharField(100, null=True)
    breeding = ForeignKeyField(Breeding, null=True)
    eye_color = CharField(null=True)
    claw_color = CharField(null=True)
    belly_color = CharField(null=True)
    hair_notes = CharField(null=True)
    is_active = BooleanField(null=True, default=True)
    butchered = BooleanField(null=True, default=False)
    castration_date = DateField(null=True, default=None)

    @property
    def current_herd(self):
        """
        Returns the current herd of the individual by querying the HerdTracking
        table.
        """

        latest_ht_entry = self.latest_herdtracking_entry
        if latest_ht_entry:
            return latest_ht_entry.herd

        # Individual not found in HerdTracking!
        return self.origin_herd

    @property
    def latest_herdtracking_entry(self):
        """
        Returns the latest entry for the individual in HerdTracking, if any.
        """

        try:
            ht_history = (
                HerdTracking.select()
                .where(HerdTracking.individual == self.id)
                .order_by(HerdTracking.herd_tracking_date.desc())
            ).execute()

            if len(ht_history):
                return ht_history[0]

        except DoesNotExist:
            pass
        return None

    @property
    def children(self):
        """
        Returns a list of the individuals registered children.
        """
        # use a list comprehension to execute the query and return the result
        # as a list.
        # pylint: disable=unnecessary-comprehension
        return [
            i
            for i in Individual.select()
            .join(Breeding)
            .where((Breeding.mother == self) | (Breeding.father == self))
        ]

    def as_dict(self):
        """
        Returns the objects key/value pair as a dictionary, including data from
        the weight, color, and bodyfat tables.
        """
        data = super().as_dict()
        data["genebank_id"] = self.current_herd.genebank.id
        data["genebank"] = self.current_herd.genebank.name
        data["origin_herd"] = {
            "id": self.origin_herd.id,
            "herd": self.origin_herd.herd,
            "herd_name": self.origin_herd.herd_name,
        }
        data["herd"] = {
            "id": self.current_herd.id,
            "herd": self.current_herd.herd,
            "herd_name": self.current_herd.herd_name,
        }

        data["birth_date"] = self.breeding.birth_date if self.breeding else None
        data["litter"] = self.breeding.litter_size if self.breeding else None

        data["mother"] = (
            {
                "id": self.breeding.mother.id,
                "name": self.breeding.mother.name,
                "number": self.breeding.mother.number,
            }
            if self.breeding and self.breeding.mother
            else None
        )
        data["father"] = (
            {
                "id": self.breeding.father.id,
                "name": self.breeding.father.name,
                "number": self.breeding.father.number,
            }
            if self.breeding and self.breeding.father
            else None
        )
        data["color"] = self.color.name if self.color else None
        data["weights"] = [
            {"weight": w.weight, "date": w.weight_date.strftime("%Y-%m-%d")}
            for w in self.weight_set
        ]  # pylint: disable=no-member
        data["bodyfat"] = [
            {"bodyfat": b.bodyfat, "date": b.bodyfat_date.strftime("%Y-%m-%d")}
            for b in self.bodyfat_set
        ]

        ht_history = (
            HerdTracking.select()
            .where(HerdTracking.individual == self.id)
            .order_by(HerdTracking.herd_tracking_date.desc())
        )

        try:
            data["herd_tracking"] = [
                {
                    "herd_id": h.herd.id,
                    "herd": h.herd.herd,
                    "herd_name": h.herd.herd_name,
                    "date": h.herd_tracking_date.strftime("%Y-%m-%d")
                    if h.herd_tracking_date
                    else None,
                }
                for h in ht_history
            ]
        except DoesNotExist:
            data["herd_tracking"] = []

        return data

    def list_info(self):
        """
        Returns the information that is to be viewed in the main individuals
        table.
        """
        data = super().as_dict()
        return data

    def short_info(self):
        """
        Returns a dictionary with a subset of fields so that all data doesn't
        have to be sent when rendering tables.
        Included fields.
            - id
            - name
            - number
            - sex
            - father
            - mother
        """
        father = (
            {"id": self.breeding.father.id, "number": self.breeding.father.number}
            if self.breeding and self.breeding.father
            else None
        )
        mother = (
            {"id": self.breeding.mother.id, "number": self.breeding.mother.number}
            if self.breeding and self.breeding.mother
            else None
        )

        is_active = (
            self.is_active
            and not self.death_date
            and not self.death_note
            and self.latest_herdtracking_entry
            and (
                self.latest_herdtracking_entry.herd_tracking_date
                > (datetime.now() - timedelta(days=366)).date()
            )
        )

        return {
            "id": self.id,
            "name": self.name,
            "number": self.number,
            "sex": self.sex,
            "father": father,
            "mother": mother,
            "is_active": is_active,
        }

    class Meta:  # pylint: disable=too-few-public-methods
        """
        Add a unique index to number+genebank
        """

        indexes = ((("number", "origin_herd"), True),)


class IndividualFile(BaseModel):
    """
    Table for referencing files connected to individuals
    """

    id = AutoField(primary_key=True, column_name="breeding_id")
    individual = ForeignKeyField(Individual)
    filepath = CharField(32)
    upload_name = CharField(128)
    notes = TextField()


class Disease(BaseModel):
    """
    Lists user defined diseases, and keeps track of wheather they should be
    included in the yearly report.
    """

    id = AutoField(primary_key=True, column_name="disease_id")
    name = CharField()
    include_in_reports = BooleanField(default=False)


class IndividualDisease(BaseModel):
    """
    Kepps track of disease periods for individuals.
    """

    id = AutoField(primary_key=True, column_name="individual_disease_id")
    individual = ForeignKeyField(Individual)
    disease = ForeignKeyField(Disease)
    diagnosis_date = DateField()
    healthy_date = DateField()
    notes = TextField()


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


class User(BaseModel, UserMixin):
    """
    Table keeping track of system users.
    """

    id = AutoField(primary_key=True, column_name="user_id")
    username = TextField(unique=True, null=True)
    email = TextField()
    fullname = TextField(null=True)
    uuid = UUIDField()
    validated = BooleanField(default=False)
    _privileges = TextField(column_name="privileges", default="[]")

    @property
    def privileges(self):
        """
        Wrapper property to convert a json text string to a python object.
        The privileges are a list of roles, formatted as:
        [
            {'level': 'admin'} |
            {'level': 'specialist' | 'manager', 'genebank': id} |
            {'level': 'owner', 'herd': id}
        ]
        """
        try:
            return json.loads(self._privileges)
        except json.JSONDecodeError:
            logging.error("Couldn't load user privileges. Defaulting to None")
            return []

    @privileges.setter
    def privileges(self, value):
        """
        Set the _privileges field to a json string from a python object.
        """
        try:
            self._privileges = json.dumps(value)
        except json.JSONDecodeError:
            logging.error("Couldn't encode '%s' as json string", value)

    @privileges.deleter
    def privileges(self):
        """
        Resets the _privilege field to a list of empty roles.
        """
        self._privileges = json.dumps([])

    def add_role(self, level, target_id=None):
        """
        Add `level` with `target_id` to the user privilege list. Allowed
        level/target_id combinations are:
            - level: admin, (no target)
            - level: specialist, genebank: target_id
            - level: manager, genebank: target_id
            - level: owner, herd: target_id
        """

        privs = self.privileges
        if level not in ["admin", "specialist", "manager", "owner"]:
            logging.error("Unknown role level %s", level)
            return
        role = {"level": level}
        if level in ["specialist", "manager"]:
            role["genebank"] = target_id
        elif level == "owner":
            role["herd"] = target_id
        privs += [role]
        self.privileges = privs
        self.save()

    def has_role(self, level, target_id=None):
        """
        Check if role `level` with target `target_id` is in the user privilege
        list. Returns `True` or `False`.

        Allowed level/target_id combinations are:
            - level: admin, (no target)
            - level: specialist, genebank: target_id
            - level: manager, genebank: target_id
            - level: owner, herd: target_id
        """
        for role in self.privileges:
            if role["level"] == level:
                if level == "admin":
                    return True
                if level in ["specialist", "manager"] and target_id == role["genebank"]:
                    return True
                if level == "owner" and target_id == role["herd"]:
                    return True
        return False

    def remove_role(self, level, target_id=None):
        """
        Check if role `level` with target `target_id` is in the user privilege
        list, and remove it if it is present.

        Allowed level/target_id combinations are:
            - level: admin, (no target)
            - level: specialist, genebank: target_id
            - level: manager, genebank: target_id
            - level: owner, herd: target_id
        """
        new_privs = []
        for role in self.privileges:
            if role["level"] == level:
                if level == "admin":
                    continue
                if level in ["specialist", "manager"] and target_id == role["genebank"]:
                    continue
                if level == "owner" and target_id == role["herd"]:
                    continue
            new_privs += [role]
        self.privileges = new_privs
        self.save()

    @property
    def is_admin(self):
        """
        Returns `True` if the admin permission is in the user privileges, false
        otherwise.
        """
        return "admin" in [p["level"] for p in self.privileges]

    @property
    def is_manager(self):
        """
        Returns a list of id's of the genebanks that the user is manager of, or
        `None`.
        """
        genebanks = []
        for role in self.privileges:
            if role["level"] == "manager":
                genebanks += [role["genebank"]]
        return genebanks or None

    @property
    def is_owner(self):
        """
        Returns a list of id's of the herds that the user is owner of, or
        `None`.
        """
        herds = []
        for role in self.privileges:
            if role["level"] == "owner":
                herds += [Herd.get(role["herd"]).herd]
        return herds or None

    @property
    def accessible_genebanks(self):
        """
        Returns a list of all genebank id's that the user has access to.
        """
        if self.is_admin:
            return [g.id for g in Genebank(database=DATABASE).select()]
        has_access = []
        for role in self.privileges:
            if role["level"] in ["specialist", "manager"]:
                has_access += [role["genebank"]]
            elif role["level"] == "owner":
                herd = Herd.get(role["herd"])
                has_access += [herd.genebank.id]
        return has_access

    def frontend_data(self):
        """
        Returns the information that is needed in the frontend.
        """

        return {
            "email": self.email,
            "fullname": self.fullname,
            "username": self.username,
            "validated": self.validated if self.validated else False,
            "is_admin": self.is_admin,
            "is_manager": self.is_manager,
            "is_owner": self.is_owner,
        }

    def get_genebanks(self):
        """
        Returns a list of all genebanks that the user has access to.
        """
        query = Genebank(database=DATABASE).select()

        if not self.is_admin:
            query = query.where(Genebank.id.in_(self.accessible_genebanks))

        # Using a list comprehension here will turn the iterator into a list
        return [g for g in query.execute()]  # pylint: disable=unnecessary-comprehension

    def get_genebank(self, genebank_id):
        """
        Returns all information for the given genebank that the user has access
        to, returning `None` if the user doesn't have genebank access.
        """
        if genebank_id not in self.accessible_genebanks:
            return None

        try:
            genebank = Genebank.get(genebank_id)
        except DoesNotExist:
            return None

        # No limit to viewing herds at this point. If you can view the genebank
        # you can view all the herds.
        herds = genebank.get_herds(user=self)
        genebank = genebank.as_dict()
        genebank["herds"] = herds
        return genebank

    def can_edit(self, identifier):
        """
        Returns `true` if the user is allowed to edit the database item
        identified by `identifier`. `identifier` can be an `Individual.number`,
        a `Herd.herd` or a `Genebank.name`.

        `identifier` will be parsed as:

        `^([a-zA-Z][0-9]+-[0-9]+)$`: individual
        `^([a-zA-Z][0-9]+)$`: herd
        and genebank otherwise.
        """
        # admins can edit anything
        if self.is_admin:
            return True

        if re.match("^([a-zA-Z][0-9]+-[0-9]+)$", identifier):
            try:
                with DATABASE.atomic():
                    individual = Individual.get(Individual.number == identifier)
                    if (
                        self.is_owner
                        and individual.current_herd.herd in self.is_owner
                        or self.is_manager
                        and individual.current_herd.genebank_id in self.is_manager
                    ):
                        return True
            except DoesNotExist:
                pass

        elif re.match("^([a-zA-Z][0-9]+)$", identifier):
            try:
                with DATABASE.atomic():
                    herd = Herd.get(Herd.herd == identifier)
                    if (
                        self.is_owner
                        and herd.herd in self.is_owner
                        or self.is_manager
                        and herd.genebank_id in self.is_manager
                    ):
                        return True
            except DoesNotExist:
                pass
        else:
            try:
                with DATABASE.atomic():
                    genebank = Genebank.get(Genebank.name == identifier)
                    if self.is_manager and genebank.id in self.is_manager:
                        return True
            except DoesNotExist:
                pass

        return False

    class Meta:  # pylint: disable=too-few-public-methods
        """
        The Meta class is read automatically for Model information, and is used
        here to set the table name, as 'User' is a clearer system user name than
        the table name 'hbuser.
        """

        table_name = "hbuser"


class UserMessage(BaseModel):
    """
    Table storing messages to be displayed to users.
    """

    id = AutoField(primary_key=True, column_name="user_message_id")
    sender = ForeignKeyField(User, null=True)
    receiver = ForeignKeyField(User, null=False)
    level = CharField(12)
    message = TextField()
    send_time = DateTimeField()
    recieve_time = DateTimeField()


class YearlyHerdReport(BaseModel):
    """
    Stores yearly reports for herds.

    The data field stores the report data in json format, but we refrained from
    storing it in a JSONField so that we could still use sqlite for testing.
    """

    id = AutoField(primary_key=True, column_name="disease_id")
    herd = ForeignKeyField(Herd)
    report_date = DateField()
    generated_by = ForeignKeyField(User)
    name = CharField()
    data = TextField()
    publish = BooleanField()
    publish_tel = BooleanField()
    publish_email = BooleanField()
    publish_address = BooleanField()


class GenebankReport(BaseModel):
    """
    Stores yearly reports for genebanks.

    The data field stores the report data in json format, but we refrained from
    storing it in a JSONField so that we could still use sqlite for testing.
    """

    genebank = ForeignKeyField(Genebank)
    generated_by = ForeignKeyField(User)
    report_date = DateField()
    name = CharField()
    data = TextField()


class HerdTracking(BaseModel):
    """
    The herd_tracking table represents documented instances of an
    individual belonging to a particular herd.  It connects the two
    tables individual and herd in a N:M fashion.
    """

    id = AutoField(primary_key=True, column_name="herd_tracking_id")
    from_herd = ForeignKeyField(Herd, null=True, default=None)
    herd = ForeignKeyField(Herd, null=True, default=None)
    signature = ForeignKeyField(User, null=True, default=None)
    individual = ForeignKeyField(Individual)
    herd_tracking_date = DateField()

    class Meta:  # pylint: disable=too-few-public-methods
        """
        The Meta class is read automatically for Model information, and is used
        here to set the table name, as the table name is in snake case, which
        didn't fit the camel case class names.
        """

        table_name = "herd_tracking"


class Authenticators(BaseModel):
    """
    Authentication information for a user.
    """

    id = AutoField(primary_key=True, column_name="auth_id")
    user = ForeignKeyField(User)
    auth = CharField(9)
    auth_data = TextField(null=True)


class SchemaHistory(BaseModel):
    """
    Contains schema migration history for the database.
    """

    version = IntegerField(primary_key=True)
    comment = TextField()
    applied = DateTimeField(null=True)


MODELS = [
    Genebank,
    Herd,
    Color,
    Breeding,
    Individual,
    IndividualFile,
    Disease,
    IndividualDisease,
    Weight,
    Bodyfat,
    User,
    UserMessage,
    YearlyHerdReport,
    GenebankReport,
    HerdTracking,
    Authenticators,
    SchemaHistory,
]


def insert_data(filename="default_data.json"):
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
    infile = open(filename)
    data = json.load(infile)
    infile.close()

    for table, values in data.items():
        if table not in [m.__name__ for m in MODELS]:
            logging.error("Unknown data table '%s' in file '%s'", table, filename)
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

    We keep a special eye on the Breeding table, as i uses deferred foreign keys
    which need to be created once the individual table has been created.
    """

    # need to keep track of the breeding table
    logging.info("Initializing database")
    created_breeding = False
    for model in MODELS:
        if not model.table_exists():
            logging.info("Creating database table %s", model.__name__)
            if model.__name__ == "Breeding":
                created_breeding = True
            model.create_table()
    # sqlite can't add constraints after creation
    if created_breeding and not isinstance(DATABASE, SqliteDatabase):
        logging.info("Creating foreign keys for breeding table")
        # pylint: disable=protected-access
        Breeding._schema.create_foreign_key(Breeding.mother)
        Breeding._schema.create_foreign_key(Breeding.father)

    sh_bootstrap = SchemaHistory(version=CURRENT_SCHEMA_VERSION, comment="Bootstrapped")

    with DATABASE.atomic():
        sh_bootstrap.save()


def verify(try_init=True):
    """
    Initialize the database, verify the tables in the database, and verify that
    we can select on each table.
    """
    check_migrations()

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


#
# Templates for database migrations.
#
# Migrations should be expected to run incrementally, each function supporting going
# from schema version N to N+1.
#
# In case data changes are necessary, they should be included in the migration.
#
# Migrations should also support replays, i.e. on a repeated call to a migration
# that has already been applied, it should simply do nothing rather than fail.
#


def migrate_none_to_1():
    """
    Migrate between no schema version and version 1.
    """

    logging.info("Migrating to schema version 1")

    with DATABASE.atomic():
        SchemaHistory.create_table()
        SchemaHistory.insert(  # pylint: disable=E1120
            version=1, comment="Create schema history table"
        ).execute()


def migrate_1_to_2():
    """
    Migrate between schema version 1 and 2.
    """

    with DATABASE.atomic():

        cols = [x.name for x in DATABASE.get_columns("schemahistory")]

        if "applied" not in cols:
            migrate(
                DATABASE_MIGRATOR.add_column(
                    "schemahistory", "applied", DateTimeField(null=True)
                )
            )
        SchemaHistory.insert(  # pylint: disable=E1120
            version=2, comment="Fix schema history table", applied=datetime.now()
        ).execute()


def migrate_2_to_3():
    """
    Migrate between schema version 2 and 3.
    """

    with DATABASE.atomic():
        tables = DATABASE.get_tables()

        if "colour" in tables:
            migrate(DATABASE_MIGRATOR.rename_table("colour", "color"))
        SchemaHistory.insert(  # pylint: disable=E1120
            version=3, comment="colour is now color", applied=datetime.now()
        ).execute()


def migrate_3_to_4():
    """
    Migrate between schema version 3 and 4.
    """

    with DATABASE.atomic():

        if (
            "individual" not in DATABASE.get_tables()
            or "color" not in DATABASE.get_tables()
        ):
            # Can't run migration
            SchemaHistory.insert(  # pylint: disable=E1120
                version=4,
                comment="not yet bootstrapped, skipping",
                applied=datetime.now(),
            ).execute()

            return

        cols = [x.name for x in DATABASE.get_columns("individual")]

        if "colour_note" in cols:
            migrate(
                DATABASE_MIGRATOR.rename_column(
                    "individual", "colour_note", "color_note"
                )
            )
        if "colour_id" in cols:
            migrate(
                DATABASE_MIGRATOR.rename_column("individual", "colour_id", "color_id")
            )

        cols = [x.name for x in DATABASE.get_columns("color")]
        if "colour_id" in cols:
            migrate(DATABASE_MIGRATOR.rename_column("color", "colour_id", "color_id"))

        SchemaHistory.insert(  # pylint: disable=E1120
            version=4, comment="colour to color in fields", applied=datetime.now()
        ).execute()


def migrate_4_to_5():
    """
    Migrate between schema version 4 and 5.
    """
    with DATABASE.atomic():
        if "individual" not in DATABASE.get_tables():
            # Can't run migration
            SchemaHistory.insert(  # pylint: disable=E1120
                version=5,
                comment="not yet bootstrapped, skipping",
                applied=datetime.now(),
            ).execute()
            return

        cols = [x.name for x in DATABASE.get_columns("individual")]

        if "digital_certificate" not in cols:
            migrate(
                DATABASE_MIGRATOR.add_column(
                    "individual",
                    "digital_certificate",
                    IntegerField(null=True, unique=True),
                )
            )
        SchemaHistory.insert(  # pylint: disable=E1120
            version=5, comment="Set up digital certificate ids", applied=datetime.now()
        ).execute()


def migrate_5_to_6():
    """
    Migrate between schema version 5 and 6.
    """

    with DATABASE.atomic():
        if "hbuser" not in DATABASE.get_tables():
            # Can't run migration
            SchemaHistory.insert(  # pylint: disable=E1120
                version=6,
                comment="not yet bootstrapped, skipping",
                applied=datetime.now(),
            ).execute()
            return

        cols = [x.name for x in DATABASE.get_columns("hbuser")]

        if "password_hash" in cols:
            # Go through hbuser and fill in authenticators from the old data.
            pw_cursor = DATABASE.execute_sql("select user_id,password_hash from hbuser")

            for user_data in pw_cursor.fetchmany():
                auth = Authenticators(
                    user=user_data[0], auth="password", auth_data=user_data[1]
                )
                auth.save()
            migrate(DATABASE_MIGRATOR.drop_column("hbuser", "password_hash"))
        SchemaHistory.insert(  # pylint: disable=E1120
            version=6,
            comment="Remove password_hash from hbuser",
            applied=datetime.now(),
        ).execute()


def migrate_6_to_7():
    """
    Migrate between schema version 6 and 7.
    """

    with DATABASE.atomic():
        if "hbuser" not in DATABASE.get_tables():
            # Can't run migration
            SchemaHistory.insert(  # pylint: disable=E1120
                version=7,
                comment="not yet bootstrapped, skipping",
                applied=datetime.now(),
            ).execute()
            return

        cols = [x.name for x in DATABASE.get_columns("hbuser")]

        if "fullname" not in cols:
            # Go through hbuser and fill in authenticators from the old data.
            migrate(
                DATABASE_MIGRATOR.add_column("hbuser", "fullname", TextField(null=True))
            )
        SchemaHistory.insert(  # pylint: disable=E1120
            version=7,
            comment="Add fullname to hbuser",
            applied=datetime.now(),
        ).execute()


def check_migrations():
    """
    Check if the database needs any migrations run and run those if that's the case.
    """
    logging.debug("Checking for needed database migrations")

    current_version = None
    if SchemaHistory.table_exists():
        current_version = SchemaHistory.select(  # pylint: disable=E1120
            fn.MAX(SchemaHistory.version)
        ).scalar()

    logging.debug(
        "Doing (if any) needed migrations from %s to %s",
        current_version,
        CURRENT_SCHEMA_VERSION,
    )

    while current_version is None or current_version < CURRENT_SCHEMA_VERSION:
        next_version = (current_version if current_version else 0) + 1
        call = ("migrate_%s_to_%s" % (current_version, next_version)).lower()
        logging.info(
            "Calling %s to migrate from %s to %s", call, current_version, next_version
        )

        globals()[call]()
        current_version = SchemaHistory.select(  # pylint: disable=E1120
            fn.MAX(SchemaHistory.version)
        ).scalar()


if is_connected():
    check_migrations()
