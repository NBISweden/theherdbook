import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import { Button, CircularProgress } from "@material-ui/core";

import { Individual } from "@app/data_context_global";
import { styles } from "@material-ui/pickers/views/Calendar/Calendar";

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
    margin: "20px 0",
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
  const [binaryFile, setBinaryFile] = React.useState(
    undefined as string | ArrayBuffer | undefined
  );
  const style = useStyles();

  const verifyCertificate = (id: string) => {
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) =>
        setBinaryFile(event.target?.result ? event.target.result : undefined);
      reader.readAsArrayBuffer(file);
    }

    if (binaryFile) {
      console.log(binaryFile);
      fetch(`/api/certificates/verify/${id}`, {
        body: binaryFile,
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/pdf",
        },
      }).then((res) => res.json);
    }
  };
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
    </>
  );
}
