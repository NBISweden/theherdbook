import React from "react";

import { makeStyles, TextField } from "@material-ui/core";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";
import { Autocomplete } from "@material-ui/lab";
import DateFnsUtils from "@date-io/date-fns";

import {
  Genebank,
  herdLabel,
  Individual,
  LimitedHerd,
} from "./data_context_global";

const useStyles = makeStyles({
  inputField: {
    margin: "1em 0",
  },
});

export function IndividualSellingForm({
  individual,
  herdOptions,
  herdKey,
  onUpdateIndividual,
}: {
  individual: Individual;
  herdOptions: LimitedHerd[];
  herdKey?: number;
  onUpdateIndividual: any;
}) {
  const style = useStyles();
  const getMinSellingDate = () => {
    const minDate = new Date(
      individual.herd_tracking
        ? individual.herd_tracking[0].date
        : individual.birth_date
    );
    const earliest = new Date(minDate.getTime() + 1000 * 60 * 60 * 24);
    return earliest;
  };
  return (
    <>
      <Autocomplete
        key={herdKey}
        options={herdOptions}
        value={herdOptions.find((option) => option.herd == individual.herd)}
        getOptionLabel={(option: LimitedHerd) => herdLabel(option)}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Välj besättning"
            variant="outlined"
            margin="normal"
            helperText="Tomt om kaninen är kvar i ursprungsbesättningen"
          />
        )}
        className={style.inputField}
        onChange={(event, newValue) => {
          newValue && onUpdateIndividual("herd", newValue.herd);
        }}
      />
      <MuiPickersUtilsProvider utils={DateFnsUtils}>
        <KeyboardDatePicker
          autoOk
          fullWidth={true}
          className={style.inputField}
          variant="inline"
          minDate={getMinSellingDate()}
          inputVariant="outlined"
          label="Köpdatum"
          format="yyyy-MM-dd"
          helperText="Tomt om kaninen är kvar i ursprungsbesättningen"
          value={individual.selling_date ?? null}
          InputLabelProps={{
            shrink: true,
          }}
          onChange={(event, newValue) => {
            newValue && onUpdateIndividual("selling_date", newValue);
          }}
        />
      </MuiPickersUtilsProvider>
    </>
  );
}
