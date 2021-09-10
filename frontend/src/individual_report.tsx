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
import { CheckCircle, ExpandMore, ExpandLess } from "@material-ui/icons";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import { Genebank, Individual, inputVariant } from "@app/data_context_global";
import { useDataContext } from "@app/data_context";
import { useMessageContext } from "@app/message_context";
import { IndividualSellingForm } from "./individual_sellingform";
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
    minHeight: "11em",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  formContainer: {
    maxWidth: "25em",
  },
  buttonContainer: {
    display: "flex",
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

interface LimitedIndividualForSale {
  number: string;
  herd: string;
  selling_date: string;
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
  const [isStillOwner, setIsStillOwner] = React.useState(true);
  const [checked, setChecked] = React.useState(false as boolean);
  const [invalidSale, setInvalidSale] = React.useState(false as boolean);
  const [success, setSuccess] = React.useState(false as boolean);
  const { genebanks } = useDataContext();
  const { userMessage } = useMessageContext();
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

  /*
  delete the herd field from individualForSale to get the dropdown input for 
  herd empty when component is rendered
  */
  React.useEffect(() => {
    let currentIndividual = individualToReport;
    delete currentIndividual.herd;
    setIndividualToReport(currentIndividual);
  }, []);

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

  const handleCheckbox = (event: React.ChangeEvent<HTMLInputElement>) => {
    setChecked(event.target.checked);
  };

  const sellIndividual = () => {
    if (!checked) {
      setInvalidSale(true);
      return;
    }
    if (!individualToReport.herd) {
      userMessage("Fyll i en besättning först", "warning");
      return;
    }
    if (!individualToReport.selling_date) {
      userMessage("Fyll i ett köpdatum först.", "warning");
      return;
    }
    const limitedIndividual: LimitedIndividualForSale = {
      number: individualToReport.number,
      herd: individualToReport.herd,
      selling_date: individualToReport.selling_date,
    };
    patch("/api/individual", limitedIndividual).then((json) => {
      if (json.status == "success") {
        setSuccess(true);
        return;
      }
      if (json.status == "error") {
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
              För våran årliga rapport ber vi dig att ge oss aktuell information
              om kaninens status.
            </Typography>
            <Typography variant="body1" className={style.infoText}>
              OBS! Har du sålt kaninen ber vi dig rapportera detta genom att
              klicka på "Sälj individ".
            </Typography>
          </div>
          <div className={style.formContainer}>
            <p>
              Välj ett datum för din årliga rapport. Nedanstående uppgifterna
              registreras för det här datumet.
            </p>
            <MuiPickersUtilsProvider utils={DateFnsUtils}>
              <KeyboardDatePicker
                autoOk
                fullWidth={true}
                variant="inline"
                inputVariant="outlined"
                label="Rapportdatum"
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
            <FormControl component="fieldset">
              <FormLabel component="legend">
                Kaninen finns fortfarande i min besättning.
              </FormLabel>
              <RadioGroup
                row
                aria-label="still active"
                value={isStillOwner}
                onChange={() => setIsStillOwner(!isStillOwner)}
              >
                <FormControlLabel
                  value={false}
                  control={<Radio />}
                  label="Nej"
                />
                <FormControlLabel value={true} control={<Radio />} label="Ja" />
              </RadioGroup>
            </FormControl>
          </div>
          <Button
            color="primary"
            onClick={() => setShowDeathForm(!showDeathForm)}
          >
            Rapportera som död
            {showDeathForm == false ? <ExpandMore /> : <ExpandLess />}
          </Button>
          {showDeathForm ? (
            <>
              <FormControl component="fieldset">
                <FormLabel component="legend">
                  Har kaninen dött under året?
                </FormLabel>
                <RadioGroup
                  row
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
              <MuiPickersUtilsProvider utils={DateFnsUtils}>
                <KeyboardDatePicker
                  autoOk
                  disabled={!isDead}
                  disableFuture
                  fullWidth={true}
                  variant="inline"
                  inputVariant="outlined"
                  label="Dödsdatum"
                  format="yyyy-MM-dd"
                  value={individualToReport.death_date ?? null}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  onChange={(newValue) => {
                    newValue &&
                      handleUpdateIndividual(
                        "death_date",
                        newValue?.toString()
                      );
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
                  value={individualToReport.butchered ?? false}
                  onChange={() =>
                    handleUpdateIndividual(
                      "butchered",
                      !individualToReport.butchered
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
                rows={2}
                value={individualToReport.death_note ?? ""}
                onChange={(event) => {
                  handleUpdateIndividual(
                    "death_note",
                    event.currentTarget.value
                  );
                }}
              />
            </>
          ) : (
            <></>
          )}
          <div>
            <FormControl
              required
              error={error}
              component="fieldset"
              disabled={disabled}
              className={style.checkContainer}
            >
              <FormControlLabel
                control={
                  <Checkbox
                    checked={checked}
                    onChange={handleCheckbox}
                    color="primary"
                    inputProps={{ "aria-label": "primary checkbox" }}
                  />
                }
                label="Jag har tagit del av informationen och vill ta bort individen
            från min besättning."
              ></FormControlLabel>
              <FormHelperText hidden={!error}>
                Bekräfta att du tagit del av informationen.
              </FormHelperText>
            </FormControl>
          </div>
          <div className={style.buttonContainer}>
            <Button
              variant="contained"
              color="primary"
              onClick={sellIndividual}
            >
              Sälj
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
            Individen har flyttats till besättning {individualToReport.herd}.
          </p>
        </Box>
      )}
    </div>
  );
}
