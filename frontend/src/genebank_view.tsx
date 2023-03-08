/**
 * @file This file contains the GenebankView function. This function displays
 * the genebank given as `genebank` in a material table where individuals and
 * columns can be customized.
 */
import React from "react";

import { Genebank, Individual } from "@app/data_context_global";
import { CircularProgress, make } from "@material-ui/core";
import { FilterTable } from "@app/filter_table";
import { useUserContext } from "@app/user_context";

/**
 * Shows genebank information, with a list of all herds belonging to that
 * genebank.
 */
export function GenebankView({ genebank }: { genebank: Genebank }) {
  const [individuals, setIndividuals] = React.useState(
    null as Array<Individual> | null
  );
  const { user } = useUserContext();

  React.useEffect(() => {
    if (genebank && user?.is_manager?.includes(genebank.id)) {
      setIndividuals(genebank.individuals);
    } else {
      const filteredindividual = genebank.individuals.filter(
        (individual) =>
          individual.certificate != null ||
          individual.digital_certificate != null
      );
      setIndividuals(filteredindividual);
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
              {
                field: "is_active",
                label: "Visa aktiva djur",
                logic: true,
                active: true,
                tooltip:
                  "Visar kaniner som är registrerade och årsrapporterade inom 13 månader, i aktiva besättningar",
              },
              {
                field: "is_active",
                label: "Visa inaktiva djur",
                logic: false,
                active: false,
                tooltip: "Visar kaniner som inte är aktiva",
              },
              {
                field: "herd_active",
                label: "Visa djur i inaktiva besättningar",
                logic: false,
                tooltip:
                  "Visar djur från besättning som upphört, tillfälligt eller permanent och djur som sålt till externa dvs även tillhörande GX1/MX1.",
              },
              {
                field: "alive",
                label: "Visa döda djur",
                logic: false,
                tooltip: "Visar inaktiva kaniner som också är döda",
              },
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
