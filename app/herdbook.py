#!/usr/bin/env python3
"""
This file contains the main webserver of 'the herdbook'.

The server uses Flask to serve a React frontend, and connect to a postgres
database.
"""

import sys
import time
from flask import Flask, render_template, jsonify

import utils.database as db

APP = Flask(__name__,
            template_folder="/templates",
            static_folder="/static")

@APP.route('/api/genebanks')
def get_herds():
    """
    Returns a json list of the current genebanks in the database, including id,
    name, and the number of individual animals in the genebank.
    """
    genebanks = []
    for genebank in db.Genebank.select():
        genebanks += [{'id': genebank.id,
                       'name': genebank.name,
                       'individuals': genebank.individual_set.count()
                      }]
    return jsonify(genebanks=genebanks)

@APP.route('/api/individual/<int:individual_id>')
def get_individual(individual_id):
    """
    Given an id, this function returns a json representation of that individual
    animal.
    """
    individual = db.Individual.get(individual_id)
    return jsonify(individual={
        'id': individual.id,
        'genebank': individual.genebank.id,
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

if __name__ == '__main__':
    # Connect to the database, or wait for database and then connect.
    while True:
        APP.logger.info("Connecting to database.") #pylint: disable=no-member
        db.connect()
        if db.is_connected():
            break
        time.sleep(4)

    # verify the database before starting the server.
    if not db.verify():
        APP.logger.error("Database has errors.")  #pylint: disable=no-member
        sys.exit(1)

    APP.run(host="0.0.0.0")
