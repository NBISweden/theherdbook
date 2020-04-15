#!/usr/bin/env python3
"""
This file contains the main webserver of 'the herdbook'.

The server uses Flask to serve a React frontend, connect to a postgres database,
and do calculations with R.
"""

from flask import Flask, render_template, jsonify

import db

APP = Flask(__name__,
            template_folder="/templates",
            static_folder="/static")

@APP.route('/api/herds')
def get_herds():
    """
    Returns a json list of the current herds in the database, including id,
    name, and the number of individual animals in the herd.
    """
    herds = []
    for herd in db.Herd.select():
        herds += [{'id': herd.id,
                   'name': herd.name,
                   'individuals': herd.individual_set.count()
                   }]
    return jsonify(herds=herds)

@APP.route('/api/individual/<int:individual_id>')
def get_individual(individual_id):
    """
    Given an id, this function returns a json representation of that individual
    animal.
    """
    individual = db.Individual.get(individual_id)
    return jsonify(individual={
        'id': individual.id,
        'herd': individual.herd.id,
        'name': individual.name,
        'certificate': individual.certificate,
        'number': individual.number,
        'sex': individual.sex,
        'birth_date': individual.birth_date,
        'mother': {
            'id': individual.mother.id,
            'name': individual.mother.name
            },
        'father': {
            'id': individual.father.id,
            'name': individual.father.name
            },
        'colour': individual.colour.name,
        'colour_note': individual.colour_note,
        'death_date': individual.death_date,
        'death_note': individual.death_note,
        'weight_young': individual.weight_young,
        'litter': individual.litter,
        'notes': individual.notes
    })

@APP.route('/')
def main():
    """
    Serves the main template of the application. Right now this is just a blank
    placeholder which will be replaced with the intended webapp.
    """
    return render_template('index.html')
