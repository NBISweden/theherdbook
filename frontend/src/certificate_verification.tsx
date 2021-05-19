import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import { Button, CircularProgress } from "@material-ui/core";

import { Individual } from "@app/data_context_global";

const useStyles = makeStyles({
  titleText: {
    width: "100%",
    borderBottom: "1px solid lightgrey",
    padding: "0 20px",
    fontSize: "2.3em",
  },
});

export function CertificateVerification({
  id,
  individual,
}: {
  id: string;
  individual: Individual | undefined;
}) {
  const style = useStyles();

  const verifyCertificate = (id: string) => {};
  return (
    <>
      <h1>Verifiera certifikat</h1>
      <p>
        Ladda upp ett digitalt certifikat för att se att det är signerat och
        finns i databasen.
      </p>
      <Button
        variant="contained"
        color="primary"
        onClick={() => verifyCertificate(id)}
      >
        Ladda upp certifikat
        <input type="file" hidden></input>
      </Button>
    </>
  );
}
