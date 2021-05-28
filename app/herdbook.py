#!/usr/bin/env python3
"""
This file contains the main webserver of 'the herdbook'.

The server uses Flask to serve a React frontend, and connect to a postgres
database.
"""

import base64
import binascii
import datetime
import hashlib
import logging
import sys
import time
import uuid

import apscheduler.schedulers.background
import requests
from flask import Flask, jsonify, make_response, request, session
from flask_caching import Cache
from flask_login import (
    LoginManager,
    current_user,
    login_required,
    login_user,
    logout_user,
)

import utils.csvparser as csvparser  # isort:skip
import utils.data_access as da  # isort:skip
import utils.database as db  # isort:skip
import utils.settings as settings  # isort:skip
import utils.certificates as certs  # isort:skip
import utils.s3 as s3  # isort:skip

APP = Flask(__name__, static_folder="/static")
APP.secret_key = uuid.uuid4().hex
# cookie options at https://flask.palletsprojects.com/en/1.1.x/security/
APP.config.update(
    # SESSION_COOKIE_SECURE=True, # Disabled for now to simplify development
    # workflow
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Strict",
    DEBUG=True,  # some Flask specific configs
    CACHE_TYPE="filesystem",
    CACHE_DIR="/tmp",
    CACHE_DEFAULT_TIMEOUT=300,
)

# pylint: disable=no-member
APP.logger.setLevel(logging.INFO)

CACHE = Cache(APP)
LOGIN = LoginManager(APP)
LOGIN.login_view = "/login"

KINSHIP_LIFETIME = 300


@APP.after_request
def after_request(response):
    """
    Callback that triggers after each request. Currently this is used to set
    CORS headers to allow a different origin when using the development server.
    """

    if "Origin" in request.headers:
        origin = request.headers["Origin"]
    else:
        origin = "*"

    response.headers.add("Access-Control-Allow-Origin", origin)
    response.headers.add("Access-Control-Allow-Headers", "Content-Type")
    response.headers.add("Access-Control-Allow-Methods", "GET,POST,PATCH")
    response.headers.add("Access-Control-Allow-Credentials", "true")

    return response


@LOGIN.request_loader
def load_user_from_request(request):

    # Try to login using Basic Auth
    api_key = request.headers.get("Authorization")
    if api_key:
        api_key = api_key.replace("Basic ", "", 1)
        try:
            api_key = base64.b64decode(api_key)
        except (TypeError, binascii.Error):
            return None

        username = api_key[: api_key.find(b":")]
        password = api_key[api_key.find(b":") + 1 :]  # noqa: E203

        user = da.authenticate_user(username, password)

        if user:
            APP.logger.info("User %s logged in from request header", username)

            session["user_id"] = user.uuid
            session.modified = True
            login_user(user)

            return user

        APP.logger.info("Failed login from header for %s", username)

    # we are not logged in.
    return None


# pylint: disable=unused-argument
@LOGIN.user_loader
def load_user(u_id):
    """
    Loads user information for flask-login.

    Currently u_id is not required, since user is loaded from the session.
    """
    user = da.fetch_user_info(session.get("user_id", None))
    return user


@APP.route("/api/user")
def get_user():
    """
    Returns information on the current logged in user, or an empty user object
    representing an anonymous user.
    """
    user = da.fetch_user_info(session.get("user_id", None))
    return jsonify(user.frontend_data() if user else None)


@APP.route("/api/manage/users")
def get_users():
    """
    Returns all users that the logged in user has access to. This is all users
    for admin, all users except admin users for managers, and None for regular
    users.
    """
    users = da.get_users(session.get("user_id", None))
    return jsonify(users=users)


@APP.route("/api/manage/user/<u_id>", methods=["GET", "PATCH", "POST"])
@login_required
def manage_user(u_id):
    """
    Returns user information and a list of all roles for the requested `u_id`.

    The return value from this function should be:
        JSON: {
            status: 'unchanged' | 'updated' | 'created' | 'success' | 'error',
            message?: string,
            data?: any
        }
    """
    if request.method == "GET":
        retval = da.get_user(u_id, session.get("user_id", None))
    if request.method == "PATCH":
        form = request.json
        retval = da.update_user(form, session.get("user_id", None))
    if request.method == "POST":
        form = request.json
        retval = da.add_user(form, session.get("user_id", None))
    return jsonify(retval)


@APP.route("/api/manage/role", methods=["POST", "PATCH"])
@login_required
def manage_roles():
    """
    Changes or adds roles for the user identified by `u_id`, and returns a
    status a json status message.
    The input data should be formatted like:
        {action: add | remove,
         role: owner | manager | specialist,
         user: <id>,
         herd | genebank: <id>
        }

    The return value will be formatted like:
        JSON: {
            status: 'unchanged' | 'updated' | 'created' | 'success' | 'error',
            message?: string,
            data?: any
        }
    """
    form = request.json
    status = da.update_role(form, session.get("user_id", None))
    return jsonify(status)


@APP.route("/api/manage/herd", methods=["POST", "PATCH"])
@login_required
def manage_herd():
    """
    Used to insert and update herd information in the database.
    Returns a message formatted like:
        JSON: {
            status: 'unchanged' | 'updated' | 'created' | 'success' | 'error',
            message?: string,
            data?: any
        }
    """
    form = request.json
    status = {"status": "error", "message": "Unknown request"}
    if request.method == "POST":
        status = da.add_herd(form, session.get("user_id", None))
    elif request.method == "PATCH":
        status = da.update_herd(form, session.get("user_id", None))
    return jsonify(status)


@APP.route("/api/breeding/<h_id>")
@login_required
def breeding_list(h_id):
    """
    Returns a list of all breeding events connected to a given herd.
    A breeding event is considered linked to a herd if any of the parents are
    currently in the herd.
    """
    breedings = da.get_breeding_events(h_id, session.get("user_id", None))
    return jsonify(breedings=breedings)


@APP.route("/api/breeding", methods=["POST", "PATCH"])
@login_required
def register_breeding():
    """
    Used to insert and update breeding events in the database.
    Returns a message formatted like:
        JSON: {
            status: 'success' | 'error',
            message?: string
        }
    """
    form = request.json
    status = {"status": "error", "message": "Unknown request"}
    if request.method == "POST":
        status = da.register_breeding(form, session.get("user_id", None))
    if request.method == "PATCH":
        status = da.update_breeding(form, session.get("user_id", None))
    return jsonify(status)


@APP.route("/api/birth", methods=["POST"])
@login_required
def register_birth():
    """
    Used to update breeding events in the database with birth information.
    Returns a message formatted like:
        JSON: {
            status: 'success' | 'error',
            message?: string
        }
    """
    form = request.json
    status = {"status": "error", "message": "Unknown request"}
    if request.method == "POST":
        status = da.register_birth(form, session.get("user_id", None))
    return jsonify(status)


@APP.route("/api/colors")
@login_required
def colors():
    """
    Returns all the legal colors for all genebanks.
    """
    return jsonify(da.get_colors())


@APP.route("/api/login", methods=["POST"])
def login_handler():
    """
    Parses a login form and sets session variables when logged in.
    If login fails the system will return `None`.
    The login form should be in json-format like:

        {'username': '<user>', 'password': '<pass>'}
    """
    if current_user.is_authenticated:
        return get_user()
    form = request.json
    # Authenticate the user and return a user object
    user = da.authenticate_user(form.get("username"), form.get("password"))
    if user:
        session["user_id"] = user.uuid
        session.modified = True
        login_user(user)
    return get_user()


@APP.route("/api/logout")
def logout():
    """
    Logs out the current user from the system and redirects back to main.
    """
    session.pop("user_id", None)
    logout_user()
    return get_user()


@APP.route("/api/genebanks")
@APP.route("/api/genebank/<int:g_id>")
@login_required
def genebank(g_id=None):
    """
    Returns information on the genebank given by `g_id`, or a list of all
    genebanks if no `g_id` is given.
    """
    user_id = session.get("user_id", None)
    if g_id:
        return jsonify(da.get_genebank(g_id, user_id))
    return jsonify(genebanks=da.get_genebanks(user_id))


@APP.route("/api/genebank/<int:g_id>/individuals")
@login_required
def genebank_individuals(g_id):
    """
    Returns individuals for the genebank given by `g_id`, if allowed for the
    currently logged in user.
    """
    user_id = session.get("user_id", None)
    return jsonify(individuals=da.get_individuals(g_id, user_id))


@APP.route("/api/herd/<h_id>")
@login_required
def herd(h_id):
    """
    Returns information on the herd given by `h_id`.
    """
    data = da.get_herd(h_id, session.get("user_id", None))
    return jsonify(data)


@APP.route("/api/individual/<i_number>")
@login_required
def individual(i_number):
    """
    Returns information on the individual given by `i_number`.
    """
    user_id = session.get("user_id", None)
    ind = da.get_individual(i_number, user_id)

    if ind:
        try:
            ind["inbreeding"] = "%.2f" % (
                get_ind_inbreeding(i_number, ind["genebank_id"]) * 100
            )
            ind["MK"] = "%.2f" % (
                get_ind_mean_kinship(i_number, ind["genebank_id"]) * 100
            )
        except requests.exceptions.ConnectionError as error:
            APP.logger.error("%s", error)
            ind["inbreeding"] = ind["inbreeding"] if "inbreeding" in ind else None
            ind["MK"] = None
    return jsonify(ind)


@APP.route("/api/individual", methods=["PATCH", "POST"])
@login_required
def edit_individual():
    """
    Updates an individual on `PATCH`, or creates a new individual on `POST`.

    The return value from this function should be:
        JSON: {
            status: 'success' | 'error',
            message?: string,
        }
    """
    form = request.json
    if request.method == "PATCH":
        retval = da.update_individual(form, session.get("user_id", None))
    if request.method == "POST":
        retval = da.add_individual(form, session.get("user_id", None))
    return jsonify(retval)


def get_ind_inbreeding(i_number, g_id):
    """
    Returns  the inbreeding coefficient of the individual given by `i_number`.
    """
    coefficients = get_inbreeding(g_id)
    if i_number in coefficients:
        return coefficients[i_number]
    return 0


@APP.route("/api/<int:g_id>/inbreeding/")
def inbreeding(g_id):
    """
    Returns all inbreeding coefficient of the genebank given  by `g_id`.
    """
    inb_coeffcient = get_inbreeding(str(g_id))
    return jsonify(inb_coeffcient)


def get_inbreeding(g_id):
    """
    Fetch ibreeding coefficient from R-API of the genebank given by `g_id`.
    """
    response = requests.get(
        "http://{}:{}/inbreeding/{}".format(
            settings.rapi.host, settings.rapi.port, g_id
        ),
        params={},
    )

    if response.status_code == 200:
        return csvparser.parse_csv(response.content)

    APP.logger.error("Could not fetch inbreeding data.")
    APP.logger.error("Error {}".format(response))
    return {}


@APP.route("/api/<int:g_id>/kinship/")
def kinship(g_id):
    """
    Returns kinship matrix of the genebank given  by `g_id`.
    """
    return jsonify(get_kinship(str(g_id)))


@CACHE.memoize(timeout=KINSHIP_LIFETIME)
def get_kinship(g_id):
    """
    Fetch kinship matrix from R-api of the genebank given  by `g_id`.
    """
    response = requests.get(
        "http://{}:{}/kinship/{}".format(settings.rapi.host, settings.rapi.port, g_id),
        params={},
    )

    if response.status_code == 200:
        return csvparser.parse_kinship(response.content)

    APP.logger.error("Could not fetch kinship data.")
    APP.logger.error("Error %s", response)
    return {}


def get_ind_mean_kinship(i_number, g_id):
    """
    Returns the mean kinship coefficient of the individual given by `i_number`.
    belonging to the genebank given by `g_id`.
    In case the individual is not active, we return 0.
    """
    mk_values = get_mean_kinship(g_id)
    return mk_values[i_number] if i_number in mk_values else 0


@APP.route("/api/<int:g_id>/meankinship/")
def mean_kinship(g_id):
    """
    Returns the mean kinship list if the Genebank given by by `g_id`.
    """
    return jsonify(get_mean_kinship(str(g_id)))


def get_mean_kinship(g_id):
    """
    Fetch the mean kinship matrix from R-api of the genebank given  by `g_id`.
    """
    response = requests.get(
        "http://{}:{}/meankinship/{}".format(
            settings.rapi.host, settings.rapi.port, g_id
        ),
        params={},
    )

    if response.status_code == 200:
        return csvparser.parse_csv(response.content)

    APP.logger.error("Could not fetch mean kinship data.")
    APP.logger.error("Error %s", response)
    return {}


@APP.route("/api/testbreed", methods=["POST"])
def testbreed():
    payload = request.json
    APP.logger.info(f"Testbreed calculation input {payload}")
    if ("male" in payload) and ("female" in payload):
        kinship_matrix = get_kinship(request.json["genebankId"])
        offspring_coi = kinship_matrix[payload["male"]][payload["female"]]
    # One/both parents not registrered, thus not present in the kinship matrix
    else:
        try:
            response = requests.post(
                "http://{}:{}/testbreed/".format(
                    settings.rapi.host, settings.rapi.port
                ),
                data=payload,
            )
            offspring_coi = response.json()["calculated_coi"][0]
        except Exception as ex:  # pylint: disable=broad-except
            APP.logger.error(ex)
            return jsonify({"error": "Error processing your request"}), 500

    formatted_offspring_coi = round(offspring_coi * 100, 2)
    APP.logger.info(f"Testbreed calculation result {formatted_offspring_coi}")
    return {"offspringCOI": formatted_offspring_coi}


@APP.route("/api/certificates/update/<i_number>", methods=["PATCH"])
@login_required
def update_certificate(i_number):
    """
    Returns an updated pdf of the individual given by `i_number`.
    """
    user_id = session.get("user_id", None)
    ind = da.get_individual(i_number, user_id)

    if ind is None:
        return jsonify({"response": "Individual not found"}), 404

    certificate_exists = ind.get("certificate", None)
    form = request.json
    uploaded = False

    try:
        present = check_certificate_s3(ind_number=ind["number"])
        if certificate_exists and present:
            data = get_certificate_data(ind, user_id)
            data.update(**form)
            pdf_bytes = get_certificate(data)
            signed_data = sign_data(pdf_bytes)
            uploaded = upload_certificate(
                pdf_bytes=signed_data.getvalue(), ind_number=ind["number"]
            )
            ind.update(**form)
            da.update_individual(ind, session.get("user_id", None))
    except Exception as ex:  # pylint: disable=broad-except
        APP.logger.info("Unexpected error while updating certificate " + str(ex))
        return jsonify({"response": "Error processing your request"}), 404

    if uploaded:
        return create_pdf_response(
            pdf_bytes=signed_data, obj_name=f'{ind["certificate"]}.pdf'
        )

    return jsonify({"response": "Certificate was not updated"}), 404


@APP.route("/api/certificates/issue/<i_number>", methods=["POST"])
@login_required
def issue_certificate(i_number):
    """
    Returns an issued pdf certificate of the individual given by `i_number`.
    """
    user_id = session.get("user_id", None)
    ind = da.get_individual(i_number, user_id)
    if ind is None:
        return jsonify({"response": "Individual not found"}), 404
    certificate_exists = ind.get("certificate", None)
    if certificate_exists:
        return jsonify({"response": "Certificate already exists"}), 400

    form = request.json
    cert_number = ind["digital_certificate"]

    ind.update(**form, certificate=cert_number)
    da.update_individual(ind, session.get("user_id", None))

    data = get_certificate_data(ind, user_id)
    pdf_bytes = get_certificate(data)
    ind_number = ind["number"]
    uploaded = False

    try:
        signed_data = sign_data(pdf_bytes)
        uploaded = upload_certificate(
            pdf_bytes=signed_data.getvalue(), ind_number=ind_number
        )
    except Exception as ex:  # pylint: disable=broad-except
        print(ex)
        return jsonify({"response": "Error processing your request"}), 400

    if uploaded:
        return create_pdf_response(pdf_bytes=signed_data, obj_name=f"{cert_number}.pdf")

    return jsonify({"response": "Certificate could not be uploaded"}), 400


@APP.route("/api/certificates/preview/<i_number>", methods=["POST", "GET"])
@login_required
def preview_certificate(i_number):
    """
    Returns a preview of a pdf certificate of the individual given by `i_number`.
    """
    user_id = session.get("user_id", None)
    ind = da.get_individual(i_number, user_id)
    if ind is None:
        return jsonify({"response": "Individual not found"}), 404

    data = get_certificate_data(ind, user_id)

    if request.method == "POST":
        form = request.json
        data.update(**form, certificate=ind["digital_certificate"])
        pdf_bytes = get_certificate(data)
    elif request.method == "GET":
        pdf_bytes = get_certificate(data)

    return create_pdf_response(pdf_bytes=pdf_bytes, obj_name="preview.pdf")


@APP.route("/api/certificates/verify/<i_number>", methods=["POST"])
@login_required
def verify_certificate(i_number):
    """
    Returns whether an pdf certificate has been issued by us and matches our checksum.
    """
    user_id = session.get("user_id", None)
    ind = da.get_individual(i_number, user_id)
    if ind is None:
        return jsonify({"response": "Individual not found"}), 404

    uploaded_bytes = request.get_data()
    present, signed = False, False

    try:
        checksum = hashlib.sha256(uploaded_bytes).hexdigest()
        signed = verify_signature(uploaded_bytes)
        present = verify_certificate_checksum(ind["number"], checksum=checksum)
    except Exception as ex:  # pylint: disable=broad-except
        APP.logger.info("Unexpected error while verifying certificate " + str(ex))
        return jsonify({"response": "Error processing your request"}), 400

    if present and signed:
        return jsonify({"response": "Certificate is valid"}), 200
    elif not present and signed:
        return jsonify({"response": "Certificate valid but file not present"}), 202

    return (
        jsonify(
            {"response": "The uploaded certificate is not valid for this individual"}
        ),
        404,
    )


def create_pdf_response(pdf_bytes, obj_name):
    """
    Returns a http response containing the pdf as body.
    """
    response = make_response(pdf_bytes.getvalue())
    response.headers["Content-Type"] = "application/pdf"
    response.headers["Content-Disposition"] = "inline; filename=%s" % obj_name
    return response


def sign_data(pdf_bytes):
    """
    Returns digitally signed pdf bytes.
    """
    return certs.get_certificate_signer().sign_certificate(pdf_bytes)


def verify_signature(pdf_bytes):
    """
    Returns digitally signed pdf bytes.
    """
    return certs.get_certificate_verifier().verify_signature(pdf_bytes)


def get_certificate_checksum(ind_number):
    """
    Returns the bytes of the latest certificate
    """
    return hashlib.sha256(
        s3.get_s3_client().get_object(f"{ind_number}/certificate.pdf")
    ).hexdigest()


def upload_certificate(pdf_bytes, ind_number):
    """
    Triggers a S3 certificate upload
    """
    return s3.get_s3_client().put_object(
        file_name=f"{ind_number}/certificate.pdf", file_data=pdf_bytes
    )


def check_certificate_s3(ind_number):
    """
    Returns a boolean value specifying if any certificate already exists in S3.
    """
    return s3.get_s3_client().head_object(object_name=f"{ind_number}/certificate.pdf")


def verify_certificate_checksum(ind_number, checksum):
    """
    Returns whether a certificate exists with the given checksum.
    """
    s3_sum = get_certificate_checksum(ind_number)
    return s3_sum == checksum


def flatten_list_of_dcts(in_list):
    """
    Flattens a list of dictionaries
    """
    dct = {}
    for item in in_list:
        if item is not None:
            dct.update(item)
    return dct


def get_certificate_data(ind, user_id):
    """
    Gets all data needed to issue a certificate.
    """
    parent_keys = [
        (1, "F"),
        (1, "M"),
        (2, "FF"),
        (2, "MF"),
        (2, "FM"),
        (2, "MM"),
    ]

    date = datetime.datetime.utcnow()
    date = date.strftime("%Y-%m-%d")
    extra_data = {"user_id": user_id, "issue_date": date, "photos": False}
    ind["notes"] = "\n".join(
        [
            "Notes: " + str(ind.get("notes", "")),
            "Color notes: " + str(ind.get("color_note", "")),
            "Hair notes: " + str(ind.get("hair_notes", "")),
        ]
    )
    cert_data_lst = []
    cert_data_lst.append(ind)
    cert_data_lst.append(extra_data)
    for level, a_type in parent_keys:
        cert_data_lst.append(_get_parent(ind, user_id, level, a_type))

    return flatten_list_of_dcts(cert_data_lst)


def _get_parent(ind, user_id, ancestry_level, ancestry_type):
    ancestries = {
        (1, "F"): "father",
        (1, "M"): "mother",
        (2, "FF"): "father",
        (2, "MF"): "father",
        (2, "FM"): "mother",
        (2, "MM"): "mother",
    }
    try:
        if ancestry_level == 1:
            ancestor = ind.get(ancestries[(1, ancestry_type)], None)
            idv = da.get_individual(ancestor["number"], user_id)

        elif ancestry_level == 2:
            ancestor = ind.get(ancestries[(1, ancestry_type[0])], None)
            parent = da.get_individual(ancestor["number"], user_id)
            grand_ancestor = parent.get(ancestries[(2, ancestry_type)], None)
            idv = da.get_individual(grand_ancestor["number"], user_id)

    except TypeError as ex:
        print(ex)
        return None

    ndict = dict()
    for key in idv.keys():
        ndict[key] = ancestry_type + "_" + key

    parent_ind = dict()
    for old_key, val in idv.items():
        parent_ind[ndict[old_key]] = val

    return parent_ind


def get_certificate(data):
    """
    Returns a pdf certificate of an individual.
    """
    # pylint: disable=R0914
    qr_x_pos, qr_y_pos = 295, 795
    # version 2 means size 42x42
    qr_x_len, qr_y_len = 42, 42

    certificate = certs.CertificateGenerator(
        form=settings.certs.template,
        form_keys=certs.FORM_KEYS,
    )

    qr_code = certs.QRHandler(
        link=settings.service.host + "/individual/" + data["number"] + "/verify",
        size=(qr_x_len, qr_y_len),
        pos={
            "x0": qr_x_pos - qr_x_len,
            "y0": qr_y_pos - qr_y_len,
            "x1": qr_x_pos,
            "y1": qr_y_pos,
        },
    )
    # Unsigned bytes without qr code
    unsigned_pdf_bytes = certificate.generate_certificate(form_data=data)

    # Unsigned bytes with qr code
    unsigned_pdf_bytes_qr = certificate.add_qrcode_to_certificate(
        unsigned_pdf_bytes, qr_code
    )

    return unsigned_pdf_bytes_qr


@APP.route("/", defaults={"path": ""})
@APP.route("/<path:path>")  # catch-all to allow react routing
def main(path):  # pylint: disable=unused-argument
    """
    Serves the single-page webapp.
    """
    return APP.send_static_file("index.html")


def reload_kinship():
    APP.logger.debug("Calling get_kinship to refresh cache if needed")
    for p in da.get_all_genebanks():
        try:
            get_kinship(p.id)
        except requests.exceptions.ConnectionError:
            pass


def initialize_app():
    # Set up a background job to do reload if needed
    # call often to minimize window
    scheduler = apscheduler.schedulers.background.BackgroundScheduler()
    scheduler.add_job(reload_kinship, trigger="interval", seconds=15)
    scheduler.start()
    APP.logger.info("Added background job to refresh kinship cache")
    reload_kinship()


# Connect to the database, or wait for database and then connect.
while True:
    APP.logger.info("Connecting to database.")  # pylint: disable=no-member
    db.connect()
    if db.is_connected():
        break
    time.sleep(4)

# verify the database before starting the server.
if not db.verify():
    APP.logger.error("Database has errors.")  # pylint: disable=no-member
    sys.exit(1)

initialize_app()
