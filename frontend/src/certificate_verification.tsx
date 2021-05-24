import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import { Box, Button, CircularProgress } from "@material-ui/core";
import { palette, borders } from "@material-ui/system";
import { CheckCircle, Error } from "@material-ui/icons";
import { Document, Page, pdfjs } from "react-pdf";

import { Individual } from "@app/data_context_global";
import { styles } from "@material-ui/pickers/views/Calendar/Calendar";
import { useMessageContext } from "@app/message_context";

const useStyles = makeStyles({
  titleText: {
    width: "100%",
    borderBottom: "1px solid lightgrey",
    padding: "0 20px",
    fontSize: "2.3em",
  },
  fileInput: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  label: {
    margin: "20px 20px 20px 0",
    marginRight: "20px",
  },
  flexRow: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "flex-end",
    margin: "1em 0",
  },
  successBox: {
    width: "100%",
    padding: "1em",
    margin: "2em 0",
  },
  successIcon: {
    fill: "#388e3c", // same as success.dark in the default theme
    marginLeft: "0.5em",
  },
  errorIcon: {
    fill: "#ff9800", // same as warning.main in the default theme
    marginLeft: "0.5em",
  },
  boxTitle: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
});

export function CertificateVerification({
  id,
  individual,
}: {
  id: string;
  individual: Individual | undefined;
}) {
  const [file, setFile] = React.useState(undefined as File | undefined);
  const [certValid, setCertValid] = React.useState(false as boolean);
  const [certOutdated, setCertOutdated] = React.useState(false as boolean);
  //States to make pdf-preview-library work
  const [numPages, setNumPages] = React.useState(null);
  const [pageNumber, setPageNumber] = React.useState(1);
  const [previewUrl, setPreviewUrl] = React.useState(undefined as unknown);
  const [previewWidth, setPreviewWidth] = React.useState(0 as Number);
  const style = useStyles();
  const { userMessage } = useMessageContext();

  const verifyCertificate = (id: string) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const binaryFile = event.target?.result
          ? event.target.result
          : undefined;
        fetch(`/api/certificates/verify/${id}`, {
          body: binaryFile,
          method: "POST",
          credentials: "same-origin",
          headers: {
            "Content-Type": "application/pdf",
          },
        }).then((res) => {
          if (res.status === 200) {
            setCertValid(true);
          } else if (res.status === 202) {
            setCertOutdated(true);
          }
        });
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const getLatestCertificate = (id: string) => {
    fetch(`/api/certificates/preview/${id}`, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        Accept: "application/octet-stream",
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.arrayBuffer())
      .then((data) => {
        setPreviewWidth(window.innerWidth * 0.5);
        setPreviewUrl(data);
      })
      .catch((error) => {
        userMessage(error.message, "error");
      });
  };

  // This function is necessary to make the previw work.
  // Built into the library.
  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  return (
    <>
      <h1>Verifiera certifikat</h1>
      <p>
        Ladda upp ett digitalt certifikat för att se att det är signerat och
        finns i databasen.
      </p>
      <div className={style.fileInput}>
        <input
          id="inputFile"
          type="file"
          onChange={(event) =>
            setFile(event.target.files ? event.target.files[0] : undefined)
          }
          style={{ display: "none" }}
        />
        <label htmlFor="inputFile" className={style.label}>
          <Button variant="contained" color="primary" component="span">
            Välj fil...
          </Button>
        </label>
        {file ? <p>{file.name}</p> : <p>Ingen fil vald.</p>}
      </div>
      <div className={style.flexRow}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => verifyCertificate(id)}
          disabled={file ? false : true}
        >
          Verifiera
        </Button>
      </div>
      {certValid ? (
        <Box
          border={3}
          borderRadius={8}
          borderColor="success.light"
          className={style.successBox}
        >
          <div className={style.boxTitle}>
            <h2>Certifikatet är giltig!</h2>
            <CheckCircle className={style.successIcon} />
          </div>
          <p>
            Dokumentet innehåller den senaste informationen om kaninen och finns
            i vår databas.
          </p>
        </Box>
      ) : certOutdated ? (
        <Box
          border={3}
          borderRadius={8}
          borderColor="warning.light"
          className={style.successBox}
        >
          <div className={style.boxTitle}>
            <h2>Certifikatet är inte aktuellt längre!</h2>
            <Error className={style.errorIcon} />
          </div>
          <p>
            Certifikatet har en gång varit giltigt för kaninen men har
            uppdaterats av den (tidigare) ägaren eller genbanksförvaltaren. Din
            version är inte giltig längre.
          </p>
          <p>Kontakta genbanksförvaltaren för mer information.</p>
          <p>
            Du kan även kolla på det aktuella certifikatet och jämföra
            uppgifterna.
          </p>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => getLatestCertificate(id)}
          >
            Se senaste certifikat
          </Button>
        </Box>
      ) : (
        <div></div>
      )}
      <Document
        file={previewUrl}
        onLoadSuccess={onDocumentLoadSuccess}
        renderAnnotationLayer={true}
        loading={<CircularProgress />}
      >
        <Page
          pageNumber={pageNumber}
          className={style.preview}
          width={previewWidth}
        />
      </Document>
    </>
  );
}
