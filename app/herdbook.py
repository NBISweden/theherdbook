#!/usr/bin/env python3
"""
This file contains the main webserver of 'the herdbook'.

The server uses Flask to serve a React frontend, connect to a postgres database,
and do calculations with R.
"""

import db
from flask import Flask, render_template, jsonify

app = Flask(__name__,
            template_folder="/templates",
            static_folder="/static")

@app.route('/api/herds')
def herds():
    herds = []
    for herd in db.Herd.select():
        herds += [{'id': herd.id,
                   'name': herd.name,
                   'individuals': herd.individual_set.count()
                   }]
    return jsonify(herds=herds)

@app.route('/api/individual/<int:individual_id>')
def individual(individual_id):
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

@app.route('/')
def main():
    return render_template('index.html')
