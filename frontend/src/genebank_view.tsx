/**
 * @file This file contains the GenebankView function. This function displays
 * the genebank given as `genebank` in a material table where individuals and
 * columns can be customized.
 */
import React from "react";

import { Genebank, Individual } from "@app/data_context_global";
import { CircularProgress, makeStyles } from "@material-ui/core";
import { FilterTable } from "@app/filter_table";

// Define styles
const useStyles = makeStyles({
  table: {
    height: "100%",
    padding: "5px",
    overflowY: "scroll",
  },
  columnLabel: {
    paddingRight: "30px",
  },
  columnSelect: {
    zIndex: 15,
  },
  loading: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
});

/**
 * Shows genebank information, with a list of all herds belonging to that
 * genebank.
 */
export function GenebankView({ genebank }: { genebank: Genebank }) {
  const styles = useStyles();
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
      <div className={styles.table}>
        {individuals ? (
          <FilterTable
            individuals={individuals}
            title={`Individer i ${genebank.name}`}
            filters={[
              { field: "alive", label: "Visa döda" },
              { field: "herd_active", label: "Visa inaktiva besättningar" },
              { field: "active", label: "Visa inaktiva djur" },
            ]}
          />
        ) : (
          <>
            <div className={styles.loading}>
              <h2>Loading Individuals</h2>
              <CircularProgress />
            </div>
          </>
        )}
      </div>
    </>
  );
}
