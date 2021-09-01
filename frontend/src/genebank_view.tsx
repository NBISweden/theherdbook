/**
 * @file This file contains the GenebankView function. This function displays
 * the genebank given as `genebank` in a material table where individuals and
 * columns can be customized.
 */
import React from "react";

import { Genebank, Individual } from "@app/data_context_global";
import { CircularProgress, make } from "@material-ui/core";
import { FilterTable } from "@app/filter_table";

/**
 * Shows genebank information, with a list of all herds belonging to that
 * genebank.
 */
export function GenebankView({ genebank }: { genebank: Genebank }) {
  const [individuals, setIndividuals] = React.useState(
    null as Array<Individual> | null
  );

  React.useEffect(() => {
    if (genebank) {
      setIndividuals(genebank.individuals);
    }
  }, [genebank]);

  return (
    <>
      <div className="table">
        {individuals ? (
          <FilterTable
            individuals={individuals}
            title={`Individer i ${genebank.name}`}
            filters={[
              { field: "alive", label: "Visa döda" },
              { field: "herd_active", label: "Visa inaktiva besättningar" },
              { field: "is_active", label: "Visa inaktiva djur" },
            ]}
          />
        ) : (
          <>
            <div className="loading">
              <h2>Loading Individuals</h2>
              <CircularProgress />
            </div>
          </>
        )}
      </div>
    </>
  );
}
