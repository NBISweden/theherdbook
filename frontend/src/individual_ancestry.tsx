import React from "react";

import { makeStyles, TextField } from "@material-ui/core";
import { Autocomplete } from "@material-ui/lab";

import {
  activeIndividuals,
  Genebank,
  Individual,
  individualLabel,
  LimitedIndividual,
} from "./data_context_global";

const useStyles = makeStyles({
  ancestorBox: {
    display: "flex",
    flexDirection: "column",
    margin: "0 0 4em 0",
  },
  ancestorInput: {
    margin: "1em 0",
  },
});

export function IndividualAncestry({
  currentGenebank,
  onUpdateIndividual,
  individual,
}: {
  currentGenebank: Genebank | undefined;
  onUpdateIndividual: any;
  individual: Individual;
}) {
  const style = useStyles();

  const activeFemales: Individual[] = activeIndividuals(
    currentGenebank,
    "female"
  );
  const activeMales: Individual[] = activeIndividuals(currentGenebank, "male");

  const limitedFemales: LimitedIndividual[] = activeFemales.map(
    (individual) => {
      return {
        id: individual.id,
        name: individual.name,
        number: individual.number,
      };
    }
  );

  const limitedMales: LimitedIndividual[] = activeMales.map((individual) => {
    return {
      id: individual.id,
      name: individual.name,
      number: individual.number,
    };
  });

  return (
    <>
      <div className={style.ancestorBox}>
        <h2>Lägg till härstamningen</h2>
        <Autocomplete
          className={style.ancestorInput}
          options={limitedFemales}
          getOptionLabel={(option: LimitedIndividual) =>
            individualLabel(option)
          }
          value={individual.mother}
          onChange={(event, newValue) => onUpdateIndividual("mother", newValue)}
          renderInput={(params) => (
            <TextField {...params} label="Välj mor" variant="outlined" />
          )}
        />
        <Autocomplete
          className={style.ancestorInput}
          options={limitedMales}
          getOptionLabel={(option: LimitedIndividual) =>
            individualLabel(option)
          }
          value={individual.father}
          onChange={(event, newValue) => onUpdateIndividual("father", newValue)}
          renderInput={(params) => (
            <TextField {...params} label="Välj far" variant="outlined" />
          )}
        />
      </div>
    </>
  );
}
