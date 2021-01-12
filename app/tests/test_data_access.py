#!/usr/bin/env python3
"""
Unit tests for the herdbook endpoints.
"""
# Fairly lax pylint settings as we want to test a lot of things

#pylint: disable=too-many-public-methods
#pylint: disable=too-many-statements

from copy import copy
from datetime import datetime, timedelta

from werkzeug.security import check_password_hash

#pylint: disable=import-error
import utils.database as db
import utils.data_access as da

#pylint: disable=import-error
from tests.database_test import DatabaseTest

class TestDataAccess(DatabaseTest):
    """
    Checks that data access functions return the correct data.
    """

    def test_add_user(self):
        """
        Checks that `utils.data_access.get_colors` is working as intended.
        """
        valid_form = {'email': 'test@user.com',
                      'username': 'test',
                      'validated': True,
                      'password': 'pass'}
        no_email = copy(valid_form)
        del no_email['email']
        no_pass = copy(valid_form)
        del no_pass['password']

        self.assertDictEqual(da.add_user(valid_form, None),
                             {"status": "error", "message": "forbidden"})
        self.assertDictEqual(da.add_user(valid_form, self.owner.uuid),
                             {"status": "error", "message": "forbidden"})
        self.assertDictEqual(da.add_user(valid_form, self.specialist.uuid),
                             {"status": "error", "message": "forbidden"})

        self.assertDictEqual(da.add_user(no_email, self.admin.uuid),
                             {"status": "error", "message": "missing data"})
        self.assertDictEqual(da.add_user(no_pass, self.admin.uuid),
                             {"status": "error", "message": "missing data"})

        result = da.add_user(valid_form, self.manager.uuid)
        self.assertEqual(result['status'], "created")

        self.assertDictEqual(da.add_user(valid_form, self.admin.uuid),
                             {"status": "error", "message": "already exists"})

    def test_register_user(self):
        """
        Checks that `utils.data_access.register_user` is working as intended.
        """
        email = 'test_user@site'
        password = 'pass'
        username = 'test user'
        validated = True
        privileges = [{'level': 'owner', 'herd': self.herds[0].herd}]

        user = da.register_user(email, password, username, validated, privileges)

        self.assertEqual(user.email, email)
        self.assertEqual(user.username, username)
        self.assertEqual(user.validated, validated)
        self.assertEqual(user.privileges, privileges)

        auth = db.Authenticators.select().where((db.Authenticators.user == user.id) &
                                                (db.Authenticators.auth == 'password')).get()
        self.assertTrue(check_password_hash(auth.auth_data, password))


    def test_authenticate_user(self):
        """
        Checks that `utils.data_access.authenticate_user` is working as intended.
        """
        email = 'test_authenticate'
        password = 'pass'

        da.register_user(email, password)
        self.assertIsNone(da.authenticate_user(email, "!%s!" % password))
        user = da.authenticate_user(email, password)
        self.assertEqual(user.email, email)

    def test_fetch_user_info(self):
        """
        Checks that `utils.data_access.fetch_user_info` return the correct
        information.
        """
        self.assertIsNone(da.fetch_user_info('invalid-uuid'))
        user = da.fetch_user_info(self.admin.uuid)
        self.assertEqual(user.email, self.admin.email)
        self.assertEqual(user.id, self.admin.id)

    def test_get_colors(self):
        """
        Checks that `utils.data_access.get_colors` return the correct
        information.
        """
        expected = {g.name: [{'id': c.id, 'name': c.name}
                             for c in self.colors if c.genebank == g]
                    for g in self.genebanks}

        colors = da.get_colors()
        self.assertDictEqual(colors, expected)

    def test_get_genebank(self):
        """
        Checks that `utils.data_access.get_genebank` return the correct
        information.

        The permission dependent behavior of this function is tested in the
        database functions, so in the interest of time it's not tested here.
        """
        self.assertIsNone(da.get_genebank(self.genebanks[0].id, 'invalid-uuid'))
        genebank = da.get_genebank(self.genebanks[0].id, self.admin.uuid)
        self.assertEqual(genebank['id'], self.genebanks[0].id)

    def test_get_genebanks(self):
        """
        Checks that `utils.data_access.get_genebanks` return the correct
        information.

        The permission dependent behavior of this function is tested in the
        database functions, so in the interest of time it's not tested here.
        """
        self.assertIsNone(da.get_genebanks('invalid-uuid'))
        genebanks = da.get_genebanks(self.admin.uuid)
        self.assertListEqual([g['id'] for g in genebanks],
                             [g.id for g in self.genebanks])

    def test_get_herd(self):
        """
        Checks that `utils.data_access.get_herd` return the correct
        information.
        """
        self.assertIsNone(da.get_genebanks('invalid-uuid'))

        for user in [self.admin, self.manager, self.specialist, self.owner]:
            for herd in self.herds:
                value = da.get_herd(herd.herd, user.uuid)
                target = db.Herd.get(db.Herd.herd == herd.herd).filtered_dict(user)
                if target['genebank'] not in user.accessible_genebanks:
                    target = None
                else:
                    target["individuals"] = [i.short_info() for i in herd.individuals]

                if value is None or target is None:
                    self.assertEqual(value, target)
                else:
                    self.assertDictEqual(value, target)

    def test_add_herd(self):
        """
        Checks that `utils.data_access.add_herd` works as intended.
        """
        forms = {
            'valid': {'genebank': self.genebanks[0].id,
                      'herd': 'N001'},
            'invalid': {'genebank': self.genebanks[0].id,
                        'herd_name': 'N002'}
        }

        invalid_user = da.add_herd(forms['valid'], 'invalid-uuid')
        self.assertDictEqual(invalid_user,
                             {"status": "error", "message": "Not logged in"})

        not_permitted = da.add_herd(forms['valid'], self.owner.uuid)
        self.assertDictEqual(not_permitted,
                             {"status": "error", "message": "Forbidden"})

        missing_data = da.add_herd(forms['invalid'], self.admin.uuid)
        self.assertDictEqual(missing_data,
                             {"status": "error", "message": "missing data"})

        valid = da.add_herd(forms['valid'], self.admin.uuid)
        self.assertDictEqual(valid, {"status": "success"})
        self.assertIsNotNone(db.Herd.get(db.Herd.herd == forms['valid']['herd']))

        exists = da.add_herd(forms['valid'], self.manager.uuid)
        self.assertDictEqual(exists,
                             {"status": "error",
                              "message": "herd ID already exists"})

    def test_update_herd(self):
        """
        Checks that `utils.data_access.update_herd` works as intended.
        """
        forms = {
            'valid': {'id': self.herds[0].id,
                      'herd_name': 'test'
                      },
            'invalid': {'id': 'kaffe',
                        'herd_name': 'test'}
        }

        invalid_user = da.update_herd(forms['valid'], 'invalid-uuid')
        self.assertDictEqual(invalid_user,
                             {"status": "error", "message": "Not logged in"})

        not_permitted = da.update_herd(forms['valid'], self.specialist.uuid)
        self.assertDictEqual(not_permitted,
                             {"status": "error", "message": "Forbidden"})

        valid_owner = da.update_herd(forms['valid'], self.owner.uuid)
        self.assertDictEqual(valid_owner, {"status": "updated"})

        valid_manager = da.update_herd(forms['valid'], self.manager.uuid)
        self.assertDictEqual(valid_manager, {"status": "updated"})

        valid_admin = da.update_herd(forms['valid'], self.admin.uuid)
        self.assertDictEqual(valid_admin, {"status": "updated"})

        unknown = da.update_herd(forms['invalid'], self.admin.uuid)
        self.assertDictEqual(unknown,
                             {"status": "error", "message": "Unknown herd"})

    def test_get_individual(self):
        """
        Checks that `utils.data_access.get_individual` works as intended.
        """
        self.assertIsNone(da.get_individual(self.individuals[0].number, 'invalid-uuid'))
        self.assertIsNone(da.get_individual('does_not_exist', 'invalid-uuid'))
        for individual in self.individuals:
            value = da.get_individual(individual.number, self.admin.uuid)
            data = db.Individual.get(individual.id)
            expected = data.as_dict()
            self.assertDictEqual(value, expected)

    def test_form_to_individual(self):
        """
        Checks that `utils.data_access.form_to_individual` works as intended.
        """
        forms = {
            'invalid_number': {'number': self.individuals[0].number,
                               'id': self.individuals[1].id},
            'admin_update': {'number': self.individuals[0].number,
                             'certificate': 'new-cert'},
            'unknown_color': {'number': self.individuals[0].number,
                              'colour': 'ultra-beige'},
            'unknown_origin': {'number': self.individuals[0].number,
                               'origin_herd': {'herd': 'does-not-exist'}},
            'valid': {'number': self.individuals[0].number},

        }
        self.assertRaises(PermissionError, da.form_to_individual, forms['valid'], self.specialist)
        self.assertRaises(ValueError, da.form_to_individual, forms['invalid_number'], self.admin)
        self.assertRaises(ValueError, da.form_to_individual, forms['admin_update'], self.owner)
        self.assertRaises(ValueError, da.form_to_individual, forms['unknown_color'], self.owner)
        self.assertRaises(ValueError, da.form_to_individual, forms['unknown_origin'], self.owner)

        updated = da.form_to_individual(forms['admin_update'], self.admin)
        self.assertEqual(updated, self.individuals[0])

    def test_add_individual(self):
        """
        Checks that `utils.data_access.add_individual` works as intended.
        """
        forms = {
            'unknown_herd': {'herd': 'does-not-exist'},
            'valid': {'herd': self.herds[0].herd,
                      'origin_herd': {'herd': self.herds[1].herd},
                      'number': 'H1-4',},

        }
        self.assertEqual(da.add_individual(forms['valid'], 'invalid-uuid'),
                         {"status": "error", "message": "Not logged in"})

        self.assertEqual(da.add_individual(forms['unknown_herd'], self.admin.uuid),
                         {"status": "error", "message": "Individual must have a valid herd"})

        self.assertEqual(da.add_individual(forms['valid'], self.specialist.uuid),
                         {"status": "error", "message": "Forbidden"})

        status = da.add_individual(forms['valid'], self.admin.uuid)
        self.assertEqual(status, {"status": "success", "message": "Individual Created"})
        self.assertIsNotNone(da.get_individual(forms['valid']['number'], self.admin.uuid))

    def test_update_individual(self):
        """
        Checks that `utils.data_access.update_individual` works as intended.
        """
        forms = {
            'unknown_herd': {'herd': 'does-not-exist'},
            'valid': {'herd': self.herds[0].herd,
                      'id': self.individuals[0].id,
                      'number': self.individuals[0].number,
                      'name': 'new name'},

        }
        self.assertEqual(da.add_individual(forms['valid'], 'invalid-uuid'),
                         {"status": "error", "message": "Not logged in"})

        self.assertEqual(da.add_individual(forms['valid'], self.specialist.uuid),
                         {"status": "error", "message": "Forbidden"})

        self.assertEqual(da.add_individual(forms['unknown_herd'], self.admin.uuid),
                         {"status": "error", "message": "Individual must have a valid herd"})

        self.individuals[0].name = 'original name'

        status = da.update_individual(forms['valid'], self.admin.uuid)
        self.assertEqual(status, {"status": "success", "message": "Individual Updated"})
        self.assertEqual(db.Individual.get(self.individuals[0].id).name, 'new name')

        # TODO: also validate weights and bodyfat

    def test_get_individuals(self):
        """
        Checks that `utils.data_access.get_individuals` return the correct
        information.
        """
        self.assertIsNone(da.get_individuals('invalid-uuid'))

        def dateformat(date):
            """
            Returns dates in the chosen string format, or None.
            """
            return date.strftime("%Y-%m-%d") if date else None

        def parent(data):
            """
            Returns parent information or None.
            """
            if not data:
                return None
            return {"id": data.id, "name": data.name, "number": data.number}

        # herds 0 and 1 are in genebank 0
        gb0_expected = []
        for ind in [self.individuals[0],
                    self.individuals[1]]:

            herd_tracking = ind.herdtracking_set[-1]
            active = herd_tracking.herd_tracking_date > \
                     datetime.date(datetime.now() - timedelta(days=366)) \
                     and (ind.current_herd.is_active or ind.current_herd.is_active is None) \
                     and ind.death_date is None \
                     and not ind.death_note
            ind_info = {"id": ind.id,
                        "name": ind.name,
                        "certificate": ind.certificate,
                        "number": ind.number,
                        "sex": ind.sex,
                        "birth_date": dateformat(ind.breeding.birth_date),
                        "death_note": ind.death_note,
                        "death_date": dateformat(ind.death_date),
                        "litter": ind.breeding.litter_size,
                        "notes": ind.notes,
                        "color_note": ind.colour_note,
                        "father": parent(ind.breeding.father),
                        "mother": parent(ind.breeding.mother),
                        "color": {"id": ind.colour.id if ind.colour else None,
                                  "name": ind.colour.name if ind.colour else None},
                        "herd": {"id": ind.current_herd.id,
                                 "herd": ind.current_herd.herd,
                                 "herd_name": ind.current_herd.herd_name},
                        "genebank": self.genebanks[0].name,
                        "herd_active": ind.current_herd.is_active or \
                                       ind.current_herd.is_active is None,
                        "active": active,
                        "alive": ind.death_date is None and not ind.death_note,
                        "children": len(ind.children),
                        }
            gb0_expected += [ind_info]

        gb0_value = da.get_individuals(self.genebanks[0].id, self.admin.uuid)
        self.assertListEqual(gb0_expected, gb0_value)

    def test_get_all_individuals(self):
        """
        Checks that `utils.data_access.get_all_individuals` return the correct
        information.
        """
        value = da.get_all_individuals()
        expected = []
        for individual in self.individuals + self.parents:
            has_parents = individual.breeding and \
                          individual.breeding.father is not None and \
                          individual.breeding.mother is not None
            expected += [{
                "id": str(individual.id),
                "father": str(individual.breeding.father_id) if has_parents else "0",
                "mother": str(individual.breeding.mother_id) if has_parents else "0",
                "sex": "M" if individual.sex == "male" else "F",
                "phenotype": str(individual.colour.id) if individual.colour else "0",
            }]

        # sort both lists, as order isn't important
        self.assertListEqual(sorted(value, key=lambda x: x['id']),
                             sorted(expected, key=lambda x: x['id']))

    def test_get_breeding_events(self):
        """
        Checks that `utils.data_access.get_breeding_events` return the correct
        information.
        """
        self.assertEqual(da.get_breeding_events(self.herds[0].herd,
                                                'invalid-uuid'), [])
        self.assertEqual(da.get_breeding_events('does_not_exist',
                                                self.admin.uuid), [])
        # lacking permissions
        self.assertEqual(da.get_breeding_events(self.herds[2].herd,
                                                self.specialist.uuid), [])

        breeding = db.Breeding.get(self.breeding[-1].id)
        expected = [breeding.as_dict()]
        # success
        self.assertEqual(da.get_breeding_events(self.herds[0].herd,
                                                self.admin.uuid),
                         expected)

    def test_register_breeding(self):
        """
        Checks that `utils.data_access.register_breeding` works as intended.
        """
        valid_form = {'father': self.individuals[0].number,
                      'mother': self.individuals[1].number,
                      'date': datetime.today().strftime('%Y-%m-%d')}
        invalid_mother = {'father': self.individuals[0].number,
                          'mother': 'invalid-mother',
                          'date': datetime.today().strftime('%Y-%m-%d')}
        invalid_father = {'father': 'invalid-father',
                          'mother': self.individuals[1].number,
                          'date': datetime.today().strftime('%Y-%m-%d')}
        missing_date = {'father': self.individuals[0].number,
                        'mother': self.individuals[1].number,}
        invalid_date = {'father': self.individuals[0].number,
                        'mother': self.individuals[1].number,
                        'date': '20-31-11'}
        self.assertEqual(da.register_breeding(valid_form, 'invalid-uuid'),
                         {"status": "error", "message": "Not logged in"})
        self.assertEqual(da.register_breeding(invalid_mother, self.admin.uuid),
                         {'status': 'error', 'message': 'Unknown mother'})
        self.assertEqual(da.register_breeding(invalid_father, self.admin.uuid),
                         {'status': 'error', 'message': 'Unknown father'})
        self.assertEqual(da.register_breeding(missing_date, self.admin.uuid),
                         {'status': 'error', 'message': 'Date missing'})
        self.assertEqual(da.register_breeding(invalid_date, self.admin.uuid),
                         {'status': 'error',
                          'message': 'Date must be formatted as yyyy-mm-dd.'})
        self.assertEqual(da.register_breeding(valid_form, self.admin.uuid),
                         {'status': 'success'})
        self.assertEqual(da.register_breeding(valid_form, self.admin.uuid),
                         {'status': 'error', 'message': 'Breeding already registered'})

    def test_register_birth(self):
        """
        Checks that `utils.data_access.register_birth` works as intended.
        """
        valid_form = {'id': self.breeding[0].id,
                      'date': datetime.today().strftime('%Y-%m-%d'),
                      'litter': 4}
        invalid_id = {'id': 'knasboll'}
        missing_date = {'id': self.breeding[0].id,
                        'litter': 4}
        invalid_date = {'id': self.breeding[0].id,
                        'litter': 4,
                        'date': '20-31-11'}
        missing_litter = {'id': self.breeding[0].id,
                          'date': datetime.today().strftime('%Y-%m-%d')}
        unknown_litter = {'id': self.breeding[0].id,
                          'litter': 'jamaica',
                          'date': datetime.today().strftime('%Y-%m-%d')}
        invalid_litter = {'id': self.breeding[0].id,
                          'litter': 0,
                          'date': datetime.today().strftime('%Y-%m-%d'),}
        self.assertEqual(da.register_birth(valid_form, 'invalid-uuid'),
                         {"status": "error", "message": "Not logged in"})
        self.assertEqual(da.register_birth(invalid_id, self.admin.uuid),
                         {"status": "error", "message": "Breeding does not exist"})
        self.assertEqual(da.register_birth(missing_date, self.admin.uuid),
                         {'status': 'error', 'message': 'Date missing'})
        self.assertEqual(da.register_birth(invalid_date, self.admin.uuid),
                         {'status': 'error',
                          'message': 'Date must be formatted as yyyy-mm-dd.'})
        self.assertEqual(da.register_birth(missing_litter, self.admin.uuid),
                         {'status': 'error',
                          'message': 'Missing litter size.'})
        self.assertEqual(da.register_birth(unknown_litter, self.admin.uuid),
                         {'status': 'error',
                          'message': 'Unknown litter size.'})
        self.assertEqual(da.register_birth(invalid_litter, self.admin.uuid),
                         {'status': 'error',
                          'message': 'Litter size must be larger than zero.'})
        self.assertEqual(da.register_birth(valid_form, self.admin.uuid),
                         {'status': 'success'})
        self.assertEqual(da.register_birth(valid_form, self.admin.uuid),
                         {'status': 'error', 'message': 'Birth already registered.'})

    def test_update_breeding(self):
        """
        Checks that `utils.data_access.register_breeding` works as intended.
        """
        valid_form = {'id': self.breeding[0].id,
                      'father': self.individuals[0].number,
                      'mother': self.individuals[1].number,
                      'date': datetime.today().strftime('%Y-%m-%d')}
        invalid_id = {'id': 'knasboll'}
        invalid_mother = {'id': self.breeding[0].id,
                          'father': self.individuals[0].number,
                          'mother': 'invalid-mother'}
        invalid_father = {'id': self.breeding[0].id,
                          'father': 'invalid-father',
                          'mother': self.individuals[1].number}
        invalid_date = {'id': self.breeding[0].id,
                        'father': self.individuals[0].number,
                        'mother': self.individuals[1].number,
                        'breed_date': '20-31-11'}
        unknown_litter = {'id': self.breeding[0].id,
                          'litter_size': 'jamaica'}
        invalid_litter = {'id': self.breeding[0].id,
                          'litter_size': 0}
        self.assertEqual(da.update_breeding(valid_form, 'invalid-uuid'),
                         {"status": "error", "message": "Not logged in"})
        self.assertEqual(da.update_breeding(invalid_id, self.admin.uuid),
                         {"status": "error", "message": "Breeding does not exist"})

        self.assertEqual(da.update_breeding(invalid_mother, self.admin.uuid),
                         {'status': 'error', 'message': 'Unknown mother'})
        self.assertEqual(da.update_breeding(invalid_father, self.admin.uuid),
                         {'status': 'error', 'message': 'Unknown father'})
        self.assertEqual(da.update_breeding(invalid_date, self.admin.uuid),
                         {'status': 'error',
                          'message': 'Date must be formatted as yyyy-mm-dd.'})
        self.assertEqual(da.update_breeding(unknown_litter, self.admin.uuid),
                         {'status': 'error',
                          'message': 'Unknown litter size.'})
        self.assertEqual(da.update_breeding(invalid_litter, self.admin.uuid),
                         {'status': 'error',
                          'message': 'Litter size must be larger than zero.'})
        self.assertEqual(da.update_breeding(valid_form, self.admin.uuid),
                         {'status': 'success'})
