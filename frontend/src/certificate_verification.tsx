import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import { Box, Button, CircularProgress } from "@material-ui/core";
import { palette, borders } from "@material-ui/system";
import { Cancel, CheckCircle, Warning } from "@material-ui/icons";
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
  responseBox: {
    width: "100%",
    maxWidth: "65em",
    padding: "1em",
    margin: "2em 0",
  },
  successIcon: {
    fill: "#388e3c", // same as success.dark in the default theme
    marginLeft: "0.5em",
  },
  warnIcon: {
    fill: "#ff9800", // same as warning.main in the default theme
    marginLeft: "0.5em",
  },
  failIcon: {
    fill: "#d32f2f", // same value as error.dark in the default theme
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
  const [certNotFound, setCertNotFound] = React.useState(false as boolean);
  const [showPdf, setShowPdf] = React.useState(false as boolean);
  //States to make pdf-preview-library work
  const [numPages, setNumPages] = React.useState(null);
  const [pageNumber, setPageNumber] = React.useState(1);
  const [previewUrl, setPreviewUrl] = React.useState(undefined as unknown);
  const [previewWidth, setPreviewWidth] = React.useState(0 as Number);
  const style = useStyles();
  const { userMessage } = useMessageContext();

  const verifyCertificate = (id: string) => {
    const postCertificate = (
      id: string,
      content: string | ArrayBuffer | undefined
    ) => {
      fetch(`/api/certificates/verify/${id}`, {
        body: content,
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/pdf",
        },
      })
        .then((res) => {
          if (res.status === 200) {
            setCertValid(true);
          } else if (res.status === 202) {
            setCertOutdated(true);
          } else if (res.status === 404) {
            setCertNotFound(true);
          } else {
            throw new Error("Något gick fel.");
          }
        })
        .catch((error) => {
          userMessage(error.message, "error");
        });
    };

    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        let binaryFile = undefined;
        if (event.target?.result) {
          binaryFile = event.target.result;
          postCertificate(id, binaryFile);
        } else {
          userMessage("Filen kunde inte läsas.", "error");
        }
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
          onClick={() => {
            setCertValid(false);
            setCertOutdated(false);
            setCertNotFound(false);
            setShowPdf(false);
            verifyCertificate(id);
          }}
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
          className={style.responseBox}
        >
          <div className={style.boxTitle}>
            <h2>Certifikatet är giltig!</h2>
            <CheckCircle className={style.successIcon} />
          </div>
          <p>
            Dokumentet innehåller den senaste informationen om{" "}
            {individual?.name} och finns i vår databas.
          </p>
        </Box>
      ) : certOutdated ? (
        <Box
          border={3}
          borderRadius={8}
          borderColor="warning.light"
          className={style.responseBox}
        >
          <div className={style.boxTitle}>
            <h2>Certifikatet matchar inte {individual?.name}!</h2>
            <Warning className={style.warnIcon} />
          </div>
          <p>
            Dokumentet du laddat upp är ett giltigt certifikat men är hör
            antingen till en annan kanin eller är en föråldrad version. I så
            fall kan certifikatet ha uppdaterats av den (tidigare) ägaren eller
            genbanksansvarig.
          </p>
          <p>
            Kontrollera att du laddat upp rätt fil eller kontakta
            genbanksansvarig för mer information.
          </p>
          <p>
            Du kan även se det aktuella certifikatet och jämföra uppgifterna.
          </p>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => {
              setShowPdf(true);
              getLatestCertificate(id);
            }}
          >
            Se senaste certifikat
          </Button>
        </Box>
      ) : certNotFound ? (
        <Box
          border={3}
          borderRadius={8}
          borderColor="error.main"
          className={style.responseBox}
        >
          <div className={style.boxTitle}>
            <h2>Inget giltigt certifikat!</h2>
            <Cancel className={style.failIcon} />
          </div>
          <p>Dokumentet du laddade upp är inget giltigt certifikat.</p>
          <p>Kontrollera att du laddat upp rätt fil.</p>
        </Box>
      ) : (
        <div></div>
      )}
      {showPdf ? (
        <Document
          file={previewUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          renderAnnotationLayer={true}
          loading={<CircularProgress />}
          noData=""
        >
          <Page pageNumber={pageNumber} width={previewWidth} />
        </Document>
      ) : (
        <div></div>
      )}
    </>
  );
}
