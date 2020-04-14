#!/usr/bin/env python3
"""
This file contains the main webserver of 'the herdbook'.

The server uses Flask to serve a React frontend, connect to a postgres database,
and do calculations with R.
"""

from flask import Flask, render_template

app = Flask(__name__,
            template_folder="/templates",
            static_folder="/static")

@app.route('/')
def main():
    return render_template('index.html')
