#!/usr/bin/env python3

import flask_dance.contrib.twitter
import flask_dance.contrib.google

import configparser
import os

CONFIGFILE = os.environ.get('AUTHCONFIGFILE','/config/auth.ini')
activeauth = {}

active = []

def available_methods():
    return active

def setup(app):

    if not os.path.exists(CONFIGFILE):
        return
    
    config = configparser.ConfigParser()
    config.read(CONFIGFILE)
    
    for engine in config.sections():
        if engine == 'twitter':
            setup_twitter(app, config)
        if engine == 'google':
            setup_google(app, config)

def setup_twitter(app, c):
    danceengine = flask_dance.contrib.twitter
    bp = danceengine.make_twitter_blueprint(
            api_key=c['twitter']['key'],
            api_secret=c['twitter']['secret'],
            login_url='',
            redirect_url='/api/login/twitter'
            )
    
    app.register_blueprint(bp, url_prefix="/api/login/twitter/back")
    active.append('twitter')


def twitter_authorized():
    return flask_dance.contrib.twitter.twitter.authorized


def twitter_persistent():
    accountr = flask_dance.contrib.twitter.twitter.get("account/settings.json")

    if not accountr.ok:
        return None

    screenname = accountr.json()['screen_name']

    userr = flask_dance.contrib.twitter.twitter.get(
        "users/lookup.json?screen_name=%s" % screenname)

    if not userr.ok or len(userr.json()) != 1:
        return None

    return userr.json()[0]['id']

def setup_google(app, c):
    danceengine = flask_dance.contrib.google
    bp = danceengine.make_google_blueprint(
            client_id=c['google']['key'],
            client_secret=c['google']['secret'],
            login_url='',
            redirect_url='/api/login/google',
            scope=["openid"]
            )
    
    app.register_blueprint(bp, url_prefix="/api/login/google/back")
    active.append('google')

def google_authorized():
    return flask_dance.contrib.google.google.authorized


def google_persistent():
    userr = flask_dance.contrib.google.google.get("/oauth2/v2/userinfo")
    if not userr.ok or len(userr.json()) == 0:
        return None
    return userr.json()['id']

pers = {'twitter': twitter_persistent,
        'google': google_persistent}
auth = {'twitter': twitter_authorized,
        'google': google_authorized}

def authorized(method):
    return auth[method]()

def get_persistent(method):
    return pers[method]()
