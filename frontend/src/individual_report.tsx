import React from "react";

import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  makeStyles,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from "@material-ui/core";
import {
  CheckCircle,
  ExpandMore,
  ExpandLess,
  NavigateNext,
} from "@material-ui/icons";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import { Genebank, Individual, inputVariant } from "@app/data_context_global";
import { useDataContext } from "@app/data_context";
import { useMessageContext } from "@app/message_context";
import { IndividualSellingForm } from "./individual_sellingform";
import { IndividualSell } from "./individual_sell";
import { IndividualDeath } from "./individual_death";
import { patch } from "./communication";
import { isJsxAttribute } from "typescript";

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
  wideControl: {
    margin: "5px 0",
    minWidth: "195px",
    width: "100%",
    paddingRight: "5px",
  },
});

interface LimitedIndividual {
  number: string;
  herd: string;
  yearly_report_date: Date;
}

export function IndividualReport({ individual }: { individual: Individual }) {
  const [genebank, setGenebank] = React.useState(
    undefined as Genebank | undefined
  );
  const [individualToReport, setIndividualToReport] = React.useState(
    individual as Individual
  );
  const [showDeathForm, setShowDeathForm] = React.useState(false);
  const [isDead, setIsDead] = React.useState(false);
  const [reportDate, setReportDate] = React.useState(null as Date | null);
  const [isStillOwner, setIsStillOwner] = React.useState(false);
  const [checked, setChecked] = React.useState(false as boolean);
  const [invalidSale, setInvalidSale] = React.useState(false as boolean);
  const [success, setSuccess] = React.useState(false as boolean);
  const { genebanks } = useDataContext();
  const { userMessage, popup } = useMessageContext();
  const style = useStyles();
  const disabled: boolean =
    !individualToReport.herd || !individualToReport.selling_date;
  const error: boolean = invalidSale && !checked && !disabled;

  React.useEffect(() => {
    const currentGenebank = genebanks.find((genebank) =>
      genebank.individuals.some((i) => i.number == individual.number)
    );

    setGenebank(currentGenebank);
  }, [individual]);

  /** Check if individual is dead */
  React.useEffect(() => {
    if (!!individual.death_date || !!individual.death_note) {
      setIsDead(true);
    }
  }, [individual]);

  /**
   * Updates a single field in `individualForSale`.
   *
   * @param field field name to update
   * @param value the new value of the field
   */
  const handleUpdateIndividual = <T extends keyof Individual>(
    field: T,
    value: Individual[T]
  ) => {
    individualToReport &&
      setIndividualToReport({ ...individualToReport, [field]: value });
    setInvalidSale(false);
  };

  /**
   * make sure "butchered", "death notes" and "death_date" always follow isDead
   * (an alive rabbit can't be butchered=true and can't have death notes or death_date)
   */
  React.useEffect(() => {
    if (!isDead) {
      handleUpdateIndividual("butchered", false);
    }
  }, [isDead]);
  React.useEffect(() => {
    if (!isDead && !individualToReport.butchered) {
      handleUpdateIndividual("death_note", "");
    }
  }, [isDead, individualToReport.butchered]);
  React.useEffect(() => {
    if (
      !isDead &&
      !individualToReport.butchered &&
      !individualToReport.death_note
    ) {
      handleUpdateIndividual("death_date", null);
    }
  }, [isDead, individualToReport.death_note, individualToReport.butchered]);

  const reportAsDead = () => {
    patch("/api/individual", individualToReport).then((json) => {
      if (json.status == "success") {
        setSuccess(true);
        return;
      }
      if (json.status == "error") {
        userMessage("Något gick fel.", "error");
      }
    });
  };

  const onSave = () => {
    if (isDead) {
      reportAsDead();
      return;
    }
    if (!reportDate) {
      userMessage("Ange ett datum för årsrapporten.", "warning");
      return;
    }

    const limitedIndividual: LimitedIndividual = {
      number: individualToReport.number,
      herd: individualToReport.herd,
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
              För våran årliga rapport ber vi dig bekräfta att kaninen finns
              kvar i din besättning.
            </Typography>
          </div>
          <div className={style.formContainer}>
            <MuiPickersUtilsProvider utils={DateFnsUtils}>
              <KeyboardDatePicker
                autoOk
                className={style.datePicker}
                disableFuture
                /*                 minDate={new Date(individual.herd_tracking[0].date)}
                minDateMessage="Datumet måste ligga efter senaste rapporteringsdatumet." */
                variant="inline"
                inputVariant="outlined"
                label="Rapportdatum"
                helperText="Rapporten registreras på valt datum."
                format="yyyy-MM-dd"
                value={reportDate ?? null}
                InputLabelProps={{
                  shrink: true,
                }}
                onChange={(event, newValue) => {
                  newValue && setReportDate(new Date(newValue));
                }}
              />
            </MuiPickersUtilsProvider>
            <FormControl
              required
              error={error}
              component="fieldset"
              disabled={!reportDate}
              className={style.checkContainer}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={isStillOwner}
                    onChange={() => setIsStillOwner(!isStillOwner)}
                    color="primary"
                    inputProps={{ "aria-label": "primary checkbox" }}
                  />
                }
                label="Kaninen finns kvar i min besättning på valt datum."
              ></FormControlLabel>
            </FormControl>
          </div>
          <Typography>
            Finns kaninen inte kvar i din besättning välj istället en av
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
              Bekräfta
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
          {isDead ? (
            <p>
              {individual.name} {individual.number} har rapporterats som död.
            </p>
          ) : (
            <p>
              Årsrapporten för {individual.name} {individual.number} har lämnats
              in.
            </p>
          )}
        </Box>
      )}
    </div>
  );
}
