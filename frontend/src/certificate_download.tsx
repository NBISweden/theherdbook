import React from "react";

import { Button } from "@material-ui/core";

import { Individual } from "@app/data_context_global";

export function CertificateDownload({
  certUrl,
  individual,
}: {
  certUrl: string;
  individual: Individual;
}) {
  return (
    <>
      <h1>Du kan nu ladda ner eller öppna certifikatet.</h1>
      <div className="paneControls">
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
