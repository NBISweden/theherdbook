"""
PDF certificate handler
"""
import datetime
import logging
from io import BytesIO
from pathlib import Path

import fitz
import pdfrw
import qrcode
import utils.settings as settings
from cryptography.hazmat.primitives.serialization import load_pem_private_key
from cryptography.x509 import load_pem_x509_certificate
from endesive import pdf
from endesive.pdf import cms

logger = logging.getLogger("herdbook.cert")

FORM_KEYS = {
    "IdRas": "genebank",
    "IdGenbanksNummer": "genebank_number",
    "IdFärg": "color",
    "IdÖvriga": "notes",
    "IdÅrKullIndivid": "genebank_aki",
    "IdOgonFärg": "eye_color",
    "IdKloFärg": "claw_color",
    "IdAntalFödda": "litter_size",
    "IdAntalLevande": "litter_size6w",
    "IdHårlag": "hair_notes",  # Fix Nose hair color
    "IdFärgBuken": "belly_color",
    "IdKön": "sex",
    "IdFödelseDatum": "birth_date",
    "IdFotoFinns": "photos",  # Fix Left right and up. Checkbox.
    "IdNamn": "name",  # herdname + ind name(?) Pending decision
    "FarGenbanksNummer": "F_genebank_number",
    "FarÅrKullIndivid": "F_genebank_aki",
    "MorGenbanksNummer": "M_genebank_number",
    "MorÅrKullIndivid": "M_genebank_aki",
    "FarNamn": "F_name",
    "MorNamn": "M_name",
    "FarFärg": "F_color",
    "MorFärg": "M_color",
    "FarfarGenbanksNummer": "FF_genebank_number",
    "FarfarÅrKullInvidid": "FF_genebank_aki",
    "MorfarGenbanksNummer": "MF_genebank_number",
    "MorfarÅrKullIndivid": "MF_genebank_aki",
    "FarfarNamn": "FF_name",
    "MorfarNamn": "MF_name",
    "FarfarFärg": "FF_color",
    "MorfarFärg": "MF_color",
    "FarmorGenbanksNummer": "FM_genebank_number",
    "FarmorÅrKullInvidid": "FM_genebank_aki",
    "MormorGenbanksNummer": "MM_genebank_number",
    "MormorÅrKullIndivid": "MM_genebank_aki",
    "FarmorNamn": "FM_name",
    "MormorNamn": "MM_name",
    "FarmorFärg": "FM_color",
    "MormorFärg": "MM_color",
    "Nummer": "digital_certificate",
    "IntygasAv": "fullname",
    "IntygasNummer": "herd",
    "IntygasDatum": "issue_date",
    "IntygasPlats": "",  # Physical id (Only in cert?)
}


class QRHandler:  # pylint: disable=too-few-public-methods
    """
    Encapsulates QR code generation logic.
    """

    def __init__(self, link, pos, size):
        assert isinstance(pos, dict)
        self.qrcode_pos = pos
        assert isinstance(link, str)
        self.qrcode_link = link
        assert isinstance(size, tuple)
        self.qrcode_size = size
        self.bytes = self._generate_qr_code()

    def _generate_qr_code(self):
        qr_code = qrcode.QRCode(
            version=2,  # version 2 means size 42x42
            error_correction=qrcode.constants.ERROR_CORRECT_H,
            box_size=10,
            border=4,
        )
        qr_code.add_data(self.qrcode_link)
        qr_code.make(fit=True)
        img = qr_code.make_image(fill_color="black", back_color="white").convert("RGB")
        buffered = BytesIO()
        img.save(buffered, format="PNG")
        return buffered


class CertificateGenerator:
    """
    Encapsulates PDF certificate generation logic.
    """

    def __init__(
        self,
        form,
        form_keys,
    ):
        assert isinstance(form, Path)
        self.form = form
        assert isinstance(form_keys, dict)
        self.form_keys = form_keys

    def generate_certificate(self, form_data):
        """
        Fills the PDF form with the data provided in form_data.
        """
        logger.debug("Adding data to certificate...")
        reader = pdfrw.PdfReader(self.form)
        writer = pdfrw.PdfWriter(version="1.7", compress=False)

        for page in reader.pages:
            annotations = page["/Annots"]
            if annotations is None:
                logger.debug("There are no annotations in this PDF")
                continue

            for annotation in annotations:
                if annotation["/Subtype"] == "/Widget":
                    if annotation["/T"]:
                        key = annotation["/T"][1:-1]
                        form_key = FORM_KEYS.get(key, None)
                        if form_key:
                            val = form_data.get(form_key, "")
                            vals = self._encode_pdf_string(val)
                            annotation.update(pdfrw.PdfDict(AP=vals, V=vals, Ff=1))

        reader.Root.AcroForm.update(
            pdfrw.PdfDict(NeedAppearances=pdfrw.PdfObject("true"))
        )
        buffered = BytesIO()
        writer.write(buffered, reader)
        return buffered

    @staticmethod
    def add_qrcode_to_certificate(pdf_bytes, qr_code):
        """
        Adds the qr code to the PDF in the desired location.
        """
        logger.debug("Adding qrcode to PDF...")

        try:
            file_handle = fitz.open(stream=pdf_bytes, filetype="pdf")
            page = file_handle[0]
        except BaseException:
            logger.debug("Failed to read PDF data")
            raise

        page.insert_image(
            fitz.Rect(
                qr_code.qrcode_pos["x0"],
                qr_code.qrcode_pos["y0"],
                qr_code.qrcode_pos["x1"],
                qr_code.qrcode_pos["y1"],
            ),
            stream=qr_code.bytes,
            keep_proportion=True,
            overlay=False,
        )
        buffered = BytesIO()
        file_handle.save(buffered)
        return buffered

    def get_all_fields(self):
        """
        Utility for retrieving all annotations of the pdf.
        """
        logger.debug("Fetching keys of all fields...")
        annots = []
        reader = pdfrw.PdfReader(self.form)
        for page in reader.pages:
            annotations = page["/Annots"]
            if annotations is None:
                logger.debug("There are no field annotations in this PDF")
                continue

            for annotation in annotations:
                if annotation["/Subtype"] == "/Widget":
                    if annotation["/T"]:
                        key = annotation["/T"][1:-1]
                        annots.append(key)
        return annots

    @staticmethod
    def _encode_pdf_string(value):
        if value:
            return pdfrw.objects.pdfstring.PdfString.encode(str(value))
        return pdfrw.objects.pdfstring.PdfString.encode("")


class CertificateSigner:  # pylint: disable=too-few-public-methods
    """
    Encapsulates PDF signature logic.
    """

    def __init__(
        self,
        cert_auth,
        private_key,
        private_key_pass,
    ):
        assert isinstance(cert_auth, Path)
        self.pkcs_ca = cert_auth
        assert isinstance(private_key, Path)
        self.pkcs_key = private_key
        assert isinstance(private_key_pass, (bytes, type(None)))
        self.private_key_pass = private_key_pass

    def sign_certificate(self, pdf_bytes):
        """
        Signs a PDF using a pkcs certificate.
        """
        private_key, certificate = self._load_key_and_certificate()
        date = datetime.datetime.utcnow()
        date = date.strftime("D:%Y%m%d%H%M%S+00'00'")
        dct = {
            "aligned": 0,
            "sigflags": 3,
            "sigflagsft": 132,
            "sigpage": 0,
            "sigbutton": True,
            "sigfield": "Signature1",
            "auto_sigfield": True,
            "sigandcertify": True,
            "signaturebox": (470, 840, 570, 640),
            "signature": "Veriferat intyg av Föreningen Gotlandskaninen",
            "contact": "admin@gotlandskaninens.se",
            "location": "Sweden",
            "signingdate": date,
            "reason": "Signerat för Gotlandskaninen",
        }
        datau = pdf_bytes.getbuffer()
        signature = cms.sign(
            datau=datau,
            udct=dct,
            key=private_key,
            cert=certificate,
            othercerts=[],
            algomd="sha256",
        )

        buffered = BytesIO()
        buffered.write(datau)
        buffered.write(signature)

        return buffered

    def _load_key_and_certificate(self):
        with open(self.pkcs_ca, "rb") as ca_cert:
            ca_data = ca_cert.read()

        with open(self.pkcs_key, "rb") as key:
            key_data = key.read()

        private_key = load_pem_private_key(key_data, password=self.private_key_pass)
        cert_auth = load_pem_x509_certificate(ca_data)

        return private_key, cert_auth


def get_certificate_signer():
    """
    Return a pdf verifier for the certificates
    """
    signer = CertificateSigner(
        cert_auth=settings.certs.ca,
        private_key=settings.certs.private_key,
        private_key_pass=None,
    )
    return signer


class CertificateVerifier:  # pylint: disable=too-few-public-methods
    """
    Encapsulates PDF verification logic.
    """

    def __init__(
        self,
        pkcs_ca,
    ):
        assert isinstance(pkcs_ca, Path)
        self.trusted_ca = self._load_pkcs_ca(pkcs_ca)

    @staticmethod
    def _load_pkcs_ca(pkcs_ca):
        trusted_cert_pems = []
        try:
            with open(pkcs_ca, "rb") as ca_cert:
                trusted_cert = ca_cert.read()
                trusted_cert_pems.append(trusted_cert)
        except BaseException:
            logger.debug("Error loading certificate authority for verification")
            raise
        return trusted_cert_pems

    def verify_signature(self, pdf_bytes):
        """
        Checks whether a signature is valid or not.
        """
        hash_ok, signature_ok, cert_ok = False, False, False
        try:
            hash_ok, signature_ok, cert_ok = pdf.verify(pdf_bytes, self.trusted_ca)
            assert all((hash_ok, signature_ok, cert_ok))
            logger.debug(f"PDF has a valid signatur {cert_ok}")
            return True
        except AssertionError:
            logger.debug("PDF has an invalid signature")
            return False


def get_certificate_verifier():
    """
    Return a pdf verifier for the certificates
    """

    verifier = CertificateVerifier(
        pkcs_ca=settings.certs.ca,
    )
    return verifier
