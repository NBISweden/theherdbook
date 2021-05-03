#!/usr/bin/env python3
"""
Provides helper function needed for external authentication.
"""

import configparser
import os
import time
import typing

import flask_dance.contrib.google
import flask_dance.contrib.twitter

CONFIGFILE = os.environ.get("AUTHCONFIGFILE", "/config/auth.ini")

_active: typing.List[str] = []  # pylint: disable = invalid-name


def available_methods():
    """
    Returns available (configured) external authentication methods.
    The returned value is a list or tuple of method names.
    """
    return _active


def setup(app):
    """
    Setup method for external authentications. Reads CONFIGFILE and sets up
    configured authentication methods.
    """

    if not os.path.exists(CONFIGFILE):
        return

    config = configparser.ConfigParser()
    config.read(CONFIGFILE)

    for engine in config.sections():
        if engine == "twitter":
            setup_twitter(app, config)
        if engine == "google":
            setup_google(app, config)


def setup_twitter(app, config):
    """
    Setup twitter authentication.
    """
    danceengine = flask_dance.contrib.twitter
    blueprint = danceengine.make_twitter_blueprint(
        api_key=config["twitter"]["key"],
        api_secret=config["twitter"]["secret"],
        login_url="",
        redirect_url="/api/login/twitter",
    )

    app.register_blueprint(blueprint, url_prefix="/api/login/twitter/back")
    _active.append("twitter")


def twitter_authorized():
    """
    Return whatever we have authenticated with twitter .
    """
    return flask_dance.contrib.twitter.twitter.authorized


def twitter_persistent():
    """
    Get the persistent identity for the user with twitter.
    """
    accountr = flask_dance.contrib.twitter.twitter.get("account/settings.json")

    if not accountr.ok:
        return None

    screenname = accountr.json()["screen_name"]

    userr = flask_dance.contrib.twitter.twitter.get(
        "users/lookup.json?screen_name=%s" % screenname
    )

    if not userr.ok or len(userr.json()) != 1:
        return None

    return userr.json()[0]["id"]


def setup_google(app, config):
    """
    Setup google authentication.
    """
    danceengine = flask_dance.contrib.google
    blueprint = danceengine.make_google_blueprint(
        client_id=config["google"]["key"],
        client_secret=config["google"]["secret"],
        login_url="",
        redirect_url="/api/login/google",
        scope=["openid"],
    )

    app.register_blueprint(blueprint, url_prefix="/api/login/google/back")
    _active.append("google")


def google_authorized():
    """
    Returns whatever we have authenticated/authorized with google.
    """
    return flask_dance.contrib.google.google.authorized


def google_persistent():
    """
    Return the persistent identifier for google.
    """
    userr = flask_dance.contrib.google.google.get("/oauth2/v2/userinfo")
    if not userr.ok or len(userr.json()) == 0:
        return None
    return userr.json()["id"]


def authorized(app, method):
    """
    Return whatever we have authenticated and authorized through the specified method.
    """

    auth = {"twitter": twitter_authorized, "google": google_authorized}

    try:
        token = app.blueprints[method].token
        if token and (
            ("expires_in" in token and token["expires_in"] < 0)
            or ("expires_at" in token and token["expires_at"] < time.time())
        ):
            del app.blueprints[method].token
    except KeyError:
        pass

    return auth[method]()


def get_persistent(method):
    """
    Get the persistent identifier for the specified method.
    """
    pers = {"twitter": twitter_persistent, "google": google_persistent}

    return pers[method]()
