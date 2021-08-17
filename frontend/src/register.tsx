import React, { useState } from "react";
import { useDataContext } from "@app/data_context";

import { Genebank } from "@app/data_context_global";
import { Button, Paper, makeStyles } from "@material-ui/core";

import { Link, useRouteMatch, useHistory } from "react-router-dom";
import { GenebankView } from "@app/genebank_view";
import { IndividualAdd } from "./individual_add";
import { useUserContext } from "./user_context";

// Define styles
const useStyles = makeStyles({
  buttonBar: {
    padding: "5px",
  },
});

/**
 * Provides buttons to select which genebank to view, which is then done with
 * the GenebankView function.
 */
export function Register() {
  const styles = useStyles();
  const { url } = useRouteMatch();
  const history = useHistory();
  const { genebanks } = useDataContext();
  const { user } = useUserContext();
  const [genebank, setGenebank] = useState(undefined as Genebank | undefined);

  const subpath = location.pathname.replace(url, "").trim().replace(/\//, "");

  React.useLayoutEffect(() => {
    if (!subpath && genebanks.length > 0) {
      history.push(`${url}/${genebanks[0].name}`);
    } else if (genebanks.length > 0) {
      const targetGenebank = genebanks.find(
        (g: Genebank) => g.name.toLowerCase() == subpath.toLowerCase()
      );
      if (targetGenebank && targetGenebank !== genebank) {
        setGenebank(targetGenebank);
      }
    }
  }, [subpath, genebank, genebanks]);

  return (
    <>
      {!!(user?.is_manager || user?.is_admin) ? (
        <Paper>
          <div className={styles.buttonBar}>
            {genebanks.length > 1 &&
              genebanks.map((g: Genebank, i: number) => {
                return (
                  <Link to={`${url}/${g.name}`} key={g.id}>
                    <Button
                      variant="contained"
                      value={g.id}
                      color={
                        genebank && genebank.id == g.id ? "primary" : "default"
                      }
                    >
                      {g.name}
                    </Button>
                  </Link>
                );
              })}
          </div>
          {React.useMemo(
            () => genebank && <IndividualAdd genebank={genebank} />,
            [genebank]
          )}
        </Paper>
      ) : (
        <p>Du har inte rättigheterna att registrera nya kaniner.</p>
      )}
    </>
  );
}
