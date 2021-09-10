import React from "react";

import { Individual, inputVariant } from "@app/data_context_global";
import {
  FormControl,
  FormControlLabel,
  FormLabel,
  makeStyles,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from "@material-ui/core";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";

const useStyles = makeStyles({
  wideControl: {
    margin: "5px 0",
    minWidth: "195px",
    width: "100%",
    paddingRight: "5px",
  },
});

const IndividualDeath = ({ individual }: { individual: Individual }) => {
  const [deadIndividual, setDeadIndividual] = React.useState(
    individual as Individual
  );
  const [isDead, setIsDead] = React.useState(false);
  const style = useStyles();

  /**
   * Updates a single field in `deadIndividual`.
   *
   * @param field field name to update
   * @param value the new value of the field
   */
  const handleUpdateIndividual = <T extends keyof Individual>(
    field: T,
    value: Individual[T]
  ) => {
    deadIndividual && setDeadIndividual({ ...deadIndividual, [field]: value });
  };
  return (
    <>
      <FormControl component="fieldset">
        <FormLabel component="legend">Har kaninen dött under året?</FormLabel>
        <RadioGroup
          row
          aria-label="death"
          value={isDead}
          onChange={() => setIsDead(!isDead)}
        >
          <FormControlLabel value={false} control={<Radio />} label="Nej" />
          <FormControlLabel value={true} control={<Radio />} label="Ja" />
        </RadioGroup>
      </FormControl>
      <MuiPickersUtilsProvider utils={DateFnsUtils}>
        <KeyboardDatePicker
          autoOk
          disabled={!isDead}
          disableFuture
          /*                 minDate={new Date(individual.herd_tracking[0].date)}
                minDateMessage="Datumet måste ligga efter senaste rapporteringsdatumet." */
          fullWidth={true}
          variant="inline"
          inputVariant="outlined"
          label="Dödsdatum"
          format="yyyy-MM-dd"
          value={deadIndividual.death_date ?? null}
          InputLabelProps={{
            shrink: true,
          }}
          onChange={(event, newValue) => {
            newValue && handleUpdateIndividual("death_date", newValue);
          }}
        />
      </MuiPickersUtilsProvider>
      <FormControl component="fieldset">
        <FormLabel component="legend">
          Har kaninen slaktats (t.ex. för kött, pga platsbrist e.d.)
        </FormLabel>
        <RadioGroup
          row
          aria-label="butchered"
          value={deadIndividual.butchered ?? false}
          onChange={() =>
            handleUpdateIndividual("butchered", !deadIndividual.butchered)
          }
        >
          <FormControlLabel
            value={false}
            control={<Radio disabled={!isDead} />}
            label="Nej"
          />
          <FormControlLabel
            value={true}
            control={<Radio disabled={!isDead} />}
            label="Ja"
          />
        </RadioGroup>
      </FormControl>
      <TextField
        label="Anteckningar om kaninens död"
        disabled={!isDead}
        variant={inputVariant}
        className={style.wideControl}
        multiline
        rows={2}
        value={deadIndividual.death_note ?? ""}
        onChange={(event) => {
          handleUpdateIndividual("death_note", event.currentTarget.value);
        }}
      />
    </>
  );
};
