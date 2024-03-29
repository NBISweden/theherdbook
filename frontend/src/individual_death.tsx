import React from "react";

import { Individual, inputVariant } from "@app/data_context_global";
import { patch } from "./communication";
import { useMessageContext } from "@app/message_context";
import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormLabel,
  makeStyles,
  Radio,
  RadioGroup,
  TextField,
} from "@material-ui/core";
import { CheckCircle } from "@material-ui/icons";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import sv from "date-fns/locale/sv";

import { useDataContext } from "./data_context";

const useStyles = makeStyles({
  wideControl: {
    margin: "5px 0",
    minWidth: "195px",
    width: "100%",
    paddingRight: "5px",
  },
  buttonContainer: {
    display: "flex",
    marginTop: "2em",
  },
  responseBox: {
    width: "100%",
    maxWidth: "65em",
    padding: "1em",
    margin: "2em 0",
  },
  successIcon: {
    fill: "#388e3c", // same as success.dark in the default theme
    marginLeft: "0.5em",
  },
  boxTitle: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
  popupContainer: {
    maxWidth: "45em",
    display: "flex",
    flexDirection: "column",
  },
  formContainer: {
    display: "flex",
    flexDirection: "column",
    minHeight: "30em",
    justifyContent: "space-around",
  },
});

export const IndividualDeath = ({ individual }: { individual: Individual }) => {
  const [deadIndividual, setDeadIndividual] = React.useState(
    individual as Individual
  );
  const indIsDead = individual.death_date || individual.death_note;
  const [isDead, setIsDead] = React.useState(indIsDead);
  const [success, setSuccess] = React.useState(false as boolean);
  const style = useStyles();
  const { userMessage } = useMessageContext();
  const { herdListener, herdChangeListener, setHerdChangeListener } =
    useDataContext();

  const getMinDate = () => {
    const lastTracking = new Date(individual.herd_tracking[0].date);
    const earliest = new Date(lastTracking.getTime() + 1000 * 60 * 60 * 24);
    return earliest;
  };
  const minDate: Date = getMinDate();

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

  const onSave = () => {
    if (!isDead) {
      userMessage(
        "Fyll i alla obligatoriska fält. Har kaninen inte dött, tryck 'STÄNG'",
        "warning"
      );
      return;
    }
    if (!deadIndividual.death_date) {
      userMessage("Ange ett dödsdatum.", "warning");
      return;
    }
    patch("/api/individual", deadIndividual).then((json) => {
      if (json.status == "success") {
        setSuccess(true);
        if (deadIndividual.herd.herd == herdListener) {
          setHerdChangeListener(herdChangeListener + 1);
        }
        return;
      }
      if (json.status == "error") {
        userMessage("Något gick fel kontakta Admin.", "error");
      }
    });
  };

  return (
    <>
      <div className={style.popupContainer}>
        <h2>
          {!indIsDead
            ? `Rapportera ${individual.name} ${individual.number} som död `
            : `Uppdatera dödsdatum för ${individual.name} ${individual.number}`}
        </h2>
        {!success ? (
          <>
            <div className={style.formContainer}>
              {!indIsDead ? (
                <>
                  <FormControl component="fieldset">
                    <FormLabel component="legend" required>
                      Har kaninen {deadIndividual.number} dött under året?
                    </FormLabel>
                    <RadioGroup
                      row
                      aria-required
                      aria-label="death"
                      value={isDead}
                      onChange={() => setIsDead(!isDead)}
                    >
                      <FormControlLabel
                        value={false}
                        control={<Radio />}
                        label="Nej"
                      />
                      <FormControlLabel
                        value={true}
                        control={<Radio />}
                        label="Ja"
                      />
                    </RadioGroup>
                  </FormControl>
                </>
              ) : (
                <></>
              )}
              <MuiPickersUtilsProvider utils={DateFnsUtils} locale={sv}>
                <KeyboardDatePicker
                  autoOk
                  required
                  disabled={!isDead}
                  disableFuture
                  minDate={minDate}
                  minDateMessage="Datumet måste ligga efter senaste rapporteringsdatum."
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
                <FormLabel component="legend" required>
                  Har kaninen slaktats (t.ex. för kött, pga platsbrist e.d.)
                </FormLabel>
                <RadioGroup
                  row
                  aria-required
                  aria-label="butchered"
                  value={deadIndividual.butchered ?? false}
                  onChange={() =>
                    handleUpdateIndividual(
                      "butchered",
                      !deadIndividual.butchered
                    )
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
                minRows={2}
                value={deadIndividual.death_note ?? ""}
                onChange={(event) => {
                  handleUpdateIndividual(
                    "death_note",
                    event.currentTarget.value
                  );
                }}
              />
            </div>
            <div className={style.buttonContainer}>
              <Button variant="contained" color="primary" onClick={onSave}>
                Rapportera
              </Button>
            </div>{" "}
          </>
        ) : (
          <Box
            border={3}
            borderRadius={8}
            borderColor="success.light"
            className={style.responseBox}
          >
            <div className={style.boxTitle}>
              <h2>Klart!</h2>
              <CheckCircle className={style.successIcon} />
            </div>
            <p>
              {individual.name} {individual.number} har rapporterats som död.
            </p>
          </Box>
        )}
      </div>
    </>
  );
};
