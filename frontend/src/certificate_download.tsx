import React from "react";

import { Button, makeStyles } from "@material-ui/core";

import { Individual } from "@app/data_context_global";

const useStyles = makeStyles({
  paneControls: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-evenly",
    padding: "20px 0",
  },
});

export function CertificateDownload({
  certUrl,
  individual,
}: {
  certUrl: string;
  individual: Individual;
}) {
  const style = useStyles();

  return (
    <>
      <h1>Du kan nu ladda ner eller öppna certifikatet.</h1>
      <div className={style.paneControls}>
        <a
          href={certUrl}
          download={individual.number}
          rel="noopener noreferrer"
        >
          <Button variant="contained" color="primary">
            {"Ladda ner"}
          </Button>
        </a>
        <a target="_blank" href={certUrl} rel="noopener noreferrer">
          <Button variant="contained" color="primary">
            {"Öppna i ny flik"}
          </Button>
        </a>
      </div>
    </>
  );
}
