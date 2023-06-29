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
  inputVariant,
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
    minDate.setDate(minDate.getDate() + 43);
    return minDate;
  };
  return (
    <>
      <Autocomplete
        key={herdKey}
        options={herdOptions}
        value={
          herdOptions.find((option) => option.herd == individual.herd) ?? null
        }
        getOptionLabel={(option: LimitedHerd) => herdLabel(option)}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Välj besättning"
            variant={inputVariant}
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
          disableFuture
          maxDateMessage="Datumet får inte ligga i framtiden."
          minDate={getMinSellingDate()}
          inputVariant={inputVariant}
          variant="inline"
          label="Köpdatum"
          format="yyyy-MM-dd"
          helperText={
            buyDateHelperText ??
            "Du får registrera en försäljning tidigast 43 dagar efter födseln. Du får inte registrera en försäljning i framtiden."
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
