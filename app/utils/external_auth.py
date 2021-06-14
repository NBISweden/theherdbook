#!/usr/bin/env python3
"""
Provides helper function needed for external authentication.
"""

import base64
import configparser
import json
import os
import time
import typing

import flask_dance.contrib.google
import flask_dance.contrib.twitter

CONFIGFILE = os.environ.get("AUTHCONFIGFILE", "/config/auth.ini")

_active: typing.List[str] = []  # pylint: disable = invalid-name
_autocreate: typing.List[str] = []  # pylint: disable = invalid-name
_config: typing.Dict = {}


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
        if config.getboolean(engine, "autocreate", fallback=False):
            _autocreate.append(engine)

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


def twitter_get_userobject():
    accountr = flask_dance.contrib.twitter.twitter.get("account/settings.json")

    if not accountr.ok:
        return None

    screenname = accountr.json()["screen_name"]

    userr = flask_dance.contrib.twitter.twitter.get(
        "users/lookup.json?screen_name=%s" % screenname
    )

    if not userr.ok or len(userr.json()) != 1:
        return None

    return userr.json()


def twitter_persistent():
    """
    Get the persistent identity for the user with twitter.
    """
    userobject = twitter_get_userobject()
    if not userobject:
        return None
    return userobject[0]["id"]


def twitter_details():
    """
    Get the account details for the user with twitter.
    """
    # Not yet supported
    return None


def setup_google(app, config):
    """
    Setup google authentication.
    """

    hdparam = {}
    scopes = [
        "openid",
    ]

    if config["google"].get("autocreate", None):
        scopes.append("https://www.googleapis.com/auth/userinfo.email")

    if config["google"].get("domain", None):
        hdparam["hosted_domain"] = config["google"]["domain"]
        _config["googledomain"] = config["google"]["domain"]

    if config["google"].get("herdattribute", None):
        _config["googleherd"] = config["google"]["herdattribute"]
        scopes.append("https://www.googleapis.com/auth/admin.directory.user.readonly")

    danceengine = flask_dance.contrib.google
    blueprint = danceengine.make_google_blueprint(
        client_id=config["google"]["key"],
        client_secret=config["google"]["secret"],
        login_url="",
        redirect_url="/api/login/google",
        scope=scopes,
        **hdparam
    )

    app.register_blueprint(blueprint, url_prefix="/api/login/google/back")
    _active.append("google")


def google_idtoken():
    """
    Extracts the idtoken from flask-dance and returns the payload.
    We rely on flask-dance for verifying the signature.
    """
    if not flask_dance.contrib.google.google.token:
        return None

    return json.loads(
        base64.decodebytes(
            bytes(
                flask_dance.contrib.google.google.token["id_token"].split(".")[1],
                "ASCII",
            )
            + b"=="  # Add padding, extra padding is harmless, missing blows up
        )
    )


def google_authorized():
    """
    Returns whatever we have authenticated/authorized with google.
    """

    idtoken = google_idtoken()
    if not idtoken:
        return False

    if "googledomain" in _config:
        if idtoken["hd"] != _config["googledomain"]:
            return None

    return flask_dance.contrib.google.google.authorized


def google_persistent():
    """
    Return the persistent identifier for google.
    """

    idtoken = google_idtoken()

    if not idtoken:
        return None

    return idtoken["sub"]


def google_details():
    """
    Return the e-mail
    """

    idtoken = google_idtoken()

    if not idtoken:
        return None

    # Only care about verified addresses
    if not idtoken.get("email_verified", False):
        return None

    out_token = {}

    if "email" in idtoken:
        out_token["email"] = idtoken["email"]

    if "googledomain" in _config:
        # Do we have an attribute specified for herd?
        userinfo = flask_dance.contrib.google.google.get(
            "https://admin.googleapis.com/admin/directory/v1/users/%s?projection=full&viewType=domain_public"
            % idtoken["sub"]
        )

        if (
            userinfo.json()
            and "name" in userinfo.json()
            and "fullName" in userinfo.json()["name"]
        ):
            out_token["fullname"] = userinfo.json()["name"]["fullName"]

    if out_token:
        return out_token

    return None


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


def get_autocreate(method):
    """
    Return the autocreate attribute for the specified method.
    """
    if method in _autocreate:
        return True
    return False


def get_account_details(method):
    """
    Get the e-mail provided for the specified method (may not work)
    """
    ad = {"twitter": twitter_details, "google": google_details}

    return ad[method]()
