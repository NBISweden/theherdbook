import React from "react";
import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormHelperText,
  makeStyles,
  Typography,
} from "@material-ui/core";
import { CheckCircle, NavigateNext } from "@material-ui/icons";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import { Individual } from "@app/data_context_global";
import { useMessageContext } from "@app/message_context";
import { IndividualSell } from "./individual_sell";
import { IndividualDeath } from "./individual_death";
import { patch } from "./communication";

const useStyles = makeStyles({
  infoText: {
    maxWidth: "40em",
  },
  checkContainer: {
    margin: "1.5em 0",
  },
  popupContainer: {
    maxWidth: "45em",
    display: "flex",
    flexDirection: "column",
  },
  textContainer: {
    padding: "1.5em 0",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  formContainer: {
    display: "flex",
    flexDirection: "column",
    minHeight: "12em",
    marginBottom: "2em",
    justifyContent: "space-around",
  },
  buttonContainer: {
    display: "flex",
    marginTop: "1.5em",
  },
  altContainer: {
    display: "flex",
    flexDirection: "column",
    padding: "0.5em 0 2em 0",
    width: "60%",
    alignItems: "start",
  },
  datePicker: {
    maxWidth: "25em",
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
});

interface LimitedIndividual {
  id: number;
  number: string;
  herd: string;
  yearly_report_date: Date;
}

export function IndividualReport({ individual }: { individual: Individual }) {
  const [reportDate, setReportDate] = React.useState(null as Date | null);
  const [isStillOwner, setIsStillOwner] = React.useState(false);
  const [success, setSuccess] = React.useState(false as boolean);
  const [error, setError] = React.useState(false);
  const { userMessage, popup } = useMessageContext();
  const style = useStyles();

  const getMinDate = () => {
    const lastTracking = new Date(individual.herd_tracking[0].date);
    const earliest = new Date(lastTracking.getTime() + 1000 * 60 * 60 * 24);
    return earliest;
  };
  const minDate: Date = getMinDate();

  const onSave = () => {
    if (!reportDate) {
      userMessage("Ange ett datum för årsrapporten.", "warning");
      return;
    }
    if (!isStillOwner) {
      userMessage(
        "Bekräfta att kaninen finns kvar i din besättning. Finns den inte kvar, välj ett av de andra alternativ.",
        "warning"
      );
      setError(true);
      return;
    }

    const limitedIndividual: LimitedIndividual = {
      id: individual.id,
      number: individual.number,
      herd: individual.herd,
      yearly_report_date: reportDate,
    };
    patch("/api/individual", limitedIndividual).then((json) => {
      if (json.status == "success") {
        setSuccess(true);
        return;
      }
      if (json.status == "error") {
        userMessage("Något gick fel.", "error");
      }
    });
  };

  return (
    <div className={style.popupContainer}>
      <h2>
        Årsrappportera {individual.name} {individual.number}
      </h2>
      {!success ? (
        <>
          <div className={style.textContainer}>
            <Typography variant="body1" className={style.infoText}>
              För våran årliga rapport ber vi dig bekräfta att kaninen finns i
              din besättning. <br></br> Utgår från datumet du väljer nedan.
            </Typography>
          </div>
          <div className={style.formContainer}>
            <MuiPickersUtilsProvider utils={DateFnsUtils}>
              <KeyboardDatePicker
                autoOk
                className={style.datePicker}
                disableFuture
                minDate={minDate}
                minDateMessage="Datumet måste ligga efter senaste rapporteringsdatum."
                variant="inline"
                inputVariant="outlined"
                label="Datum för årsrapporten"
                format="yyyy-MM-dd"
                value={reportDate ?? null}
                InputLabelProps={{
                  shrink: true,
                }}
                onChange={(event, newValue) => {
                  newValue && setReportDate(newValue);
                }}
              />
            </MuiPickersUtilsProvider>
            <FormControl
              component="fieldset"
              disabled={!reportDate}
              error={error}
              className={style.checkContainer}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isStillOwner}
                    onChange={() => {
                      if (error) {
                        setError(false);
                      }
                      setIsStillOwner(!isStillOwner);
                    }}
                    color="primary"
                    inputProps={{ "aria-label": "primary checkbox" }}
                  />
                }
                label="Kaninen finns kvar i min besättning på valt datum."
              ></FormControlLabel>
              <FormHelperText hidden={!error}>
                Fältet måste vara ifyllt.
              </FormHelperText>
            </FormControl>
          </div>
          <Typography>
            Finns kaninen inte kvar i din besättning välj istället ett av
            följande alternativ
          </Typography>
          <div className={style.altContainer}>
            <Button
              color="primary"
              size="small"
              onClick={() => popup(<IndividualDeath individual={individual} />)}
            >
              Rapportera som död
              {<NavigateNext />}
            </Button>
            <Button
              color="primary"
              size="small"
              onClick={() => popup(<IndividualSell individual={individual} />)}
            >
              Sälj individ
              {<NavigateNext />}
            </Button>
          </div>
          <div className={style.buttonContainer}>
            <Button variant="contained" color="primary" onClick={onSave}>
              Skicka
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
            Årsrapporten för {individual.name} {individual.number} har lämnats
            in.
          </p>
        </Box>
      )}
    </div>
  );
}
