from flask import make_response

import utils.data_access as da  # isort:skip
import utils.certificates as certs  # isort:skip
import utils.s3 as s3  # isort:skip
import hashlib
import datetime
import utils.settings as settings  # isort:skip


def create_pdf_response(pdf_bytes, obj_name):
    """
    Returns a http response containing the pdf as body.
    """
    response = make_response(pdf_bytes)
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


def download_certificate_s3(ind_number):
    """
    Returns a signed certificate that already exists in S3.
    """
    return s3.get_s3_client().get_object(
        bucket_object_name=f"{ind_number}/certificate.pdf"
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
    herd = ind["herd"]
    if type(herd) == dict:
        herd = herd["herd"]

    genebank = ind["number"].split("-")
    fullname = da.fetch_user_info(user_id).fullname
    extra_data = {
        "genebank_aki": genebank[1],
        "genebank_number": genebank[0],
        "herd": herd,
        "fullname": fullname,
        "issue_date": date,
        "photos": False,
    }
    ind["notes"] = "\n".join(
        [
            str(ind.get("notes", "")),
            "Färg upplysningar: " + str(ind.get("color_note", "")),
            "Hår upplysningar: " + str(ind.get("hair_notes", "")),
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

    genebank = parent_ind[ancestry_type + "_" + "number"].split("-")
    parent_ind[ancestry_type + "_" + "genebank_aki"] = genebank[1]
    parent_ind[ancestry_type + "_" + "genebank_number"] = genebank[0]

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
