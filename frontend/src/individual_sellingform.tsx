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

export function IndividualSellingform({
  individual,
  herdOptions,
  herdKey,
  onUpdateIndividual,
}: {
  individual: Individual;
  herdOptions: LimitedHerd[];
  herdKey: number;
  onUpdateIndividual: any;
}) {
  const style = useStyles();
  return (
    <>
      <Autocomplete
        key={herdKey}
        options={herdOptions}
        value={individual.herd}
        getOptionLabel={(option: LimitedHerd) => herdLabel(option)}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Välj besättning"
            variant="outlined"
            margin="normal"
            helperText="Lämna tom om kaninen inte har sålts"
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
          inputVariant="outlined"
          label="Köpdatum"
          format="yyyy-MM-dd"
          value={individual.selling_date ?? null}
          helperText="Lämna tom om kaninen inte har sålts"
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
