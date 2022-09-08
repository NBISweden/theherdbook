import React from "react";

import { makeStyles, TextField } from "@material-ui/core";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";
import { Autocomplete } from "@material-ui/lab";
import DateFnsUtils from "@date-io/date-fns";
import sv from "date-fns/locale/sv";

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
  herdHelperText,
  buyDateHelperText,
}: {
  individual: Individual;
  herdOptions: LimitedHerd[];
  herdKey?: number;
  onUpdateIndividual: any;
  herdHelperText: string;
  buyDateHelperText: string;
}) {
  const style = useStyles();
  const getMinSellingDate = () => {
    const minDate = new Date(
      individual.herd_tracking
        ? individual.herd_tracking[0].date.toString()
        : individual.birth_date
    );
    minDate.setDate(minDate.getDate() + 1);
    return minDate;
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
            inputProps={{ className: "data-hj-allow" }}
            variant="outlined"
            margin="normal"
            helperText={
              herdHelperText ??
              "Tomt om kaninen är kvar i ursprungsbesättningen"
            }
          />
        )}
        className={style.inputField}
        onChange={(event, newValue) => {
          newValue && onUpdateIndividual("herd", newValue.herd);
        }}
      />
      <MuiPickersUtilsProvider utils={DateFnsUtils} locale={sv}>
        <KeyboardDatePicker
          autoOk
          fullWidth={true}
          className={style.inputField}
          variant="inline"
          minDate={getMinSellingDate()}
          inputVariant="outlined"
          label="Köpdatum"
          format="yyyy-MM-dd"
          helperText={
            buyDateHelperText ??
            "Tomt om kaninen är kvar i ursprungsbesättningen"
          }
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
