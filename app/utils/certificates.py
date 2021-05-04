"""
PDF certificate handler
"""
import datetime
from pathlib import Path
from io import BytesIO
from endesive import pdf
from endesive.pdf import cms
from cryptography.x509 import load_pem_x509_certificate
from cryptography.hazmat.primitives.serialization import load_pem_private_key
import fitz
import pdfrw
import qrcode


FORM_KEYS = {
    "IdRas": "genebank_id",
    "IdGenbanksNummer": "genebank_id",
    "IdFärg": "colour",
    "IdÖvriga": "notes",  # color and hair notes
    "IdÅrKullIndivid": "name",  # Fix
    "IdOgonFärg": "eye_color",
    "IdKloFärg": "claw_color",
    "IdAntalFödda": "litter",
    "IdAntalLevande": "litter",  # Birth table: calculate new rabbits based on breeding event. check after six weeks if alive
    "IdHårlag": "name",  # Fix Nose hair colour
    "IdFärgBuken": "belly_color",
    "IdKön": "sex",
    "IdFödelseDatum": "birth_date",
    "IdFotoFinns": "photos",  # Fix Left right and up. Checkbox.
    "IdNamn": "name",  # herdname + ind name(?) Pending decision
    "FarGenbanksNummer": "F_genebank_id",
    "FarÅrKullIndivid": "F_number",
    "MorGenbanksNummer": "M_genebank_id",
    "MorÅrKullIndivid": "M_number",
    "FarNamn": "F_name",
    "MorNamn": "M_name",
    "FarFärg": "F_colour",
    "MorFärg": "M_colour",
    "FarfarGenbanksNummer": "FF_genebank_id",
    "FarfarÅrKullInvidid": "FF_number",
    "MorfarGenbanksNummer": "MF_genebank_id",
    "MorfarÅrKullIndivid": "MF_number",
    "FarfarNamn": "FF_name",
    "MorfarNamn": "MF_name",
    "FarfarFärg": "FF_colour",
    "MorfarFärg": "MF_colour",
    "FarmorGenbanksNummer": "FM_genebank_id",
    "FarmorÅrKullInvidid": "FM_number",
    "MormorGenbanksNummer": "MM_genebank_id",
    "MormorÅrKullIndivid": "MM_number",
    "FarmorNamn": "FM_name",
    "MormorNamn": "MM_name",
    "FarmorFärg": "FM_colour",
    "MormorFärg": "MM_colour",
    "Nummer": "number",
    "IntygasAv": "user_id",  # Username
    "IntygasNummer": "certificate",  # Herd id of rabbit individual (Without herd identifier) G/M
    "IntygasDatum": "issue_date",  # Day of signature
    "IntygasPlats": "name",  # Physical id (Only in cert?)
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
        print("Adding data to certificate...")
        reader = pdfrw.PdfReader(self.form)
        writer = pdfrw.PdfWriter(version="1.7", compress=False)

        for page in reader.pages:
            annotations = page["/Annots"]
            if annotations is None:
                print("There are no annotations in this PDF")
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
        print("Adding qrcode to PDF...")

        try:
            file_handle = fitz.open(stream=pdf_bytes, filetype="pdf")
            page = file_handle[0]
        except BaseException:
            print("Failed to read PDF data")
            raise

        page.insertImage(
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
        print("Fetching keys of all fields...")
        annots = []
        reader = pdfrw.PdfReader(self.form)
        for page in reader.pages:
            annotations = page["/Annots"]
            if annotations is None:
                print("There are no field annotations in this PDF")
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
            "sigpage": 0,
            "sigandcertify": True,
            "contact": "https://nbis.se",
            "location": "Sweden",
            "signingdate": date,
            "reason": "Issued by NBIS",
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


@staticmethod(f)
def get_certificate_signer():
    signer = certs.CertificateSigner(
        cert_auth=Path("/code/ca.pem"),
        private_key=Path("/code/key.pem"),
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
            print("Error loading certificate authority for verification")
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
            print("PDF has a valid signature")
            return True
        except AssertionError:
            print("PDF has an invalid signature")
            return False
