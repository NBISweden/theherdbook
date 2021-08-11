import React from "react";

import { makeStyles, TextField } from "@material-ui/core";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";
import { Autocomplete } from "@material-ui/lab";
import DateFnsUtils from "@date-io/date-fns";

import { useDataContext } from "@app/data_context";
import {
  dateFormat,
  inputVariant,
  Individual,
  OptionType,
} from "@app/data_context_global";
import { useUserContext } from "./user_context";

const useStyles = makeStyles({
  adminPane: {
    width: "100%",
    padding: "15px 0 5px 10px",
    border: "1px solid lightgrey",
    position: "relative",
    display: "flex",
    flexDirection: "row",
    background:
      "repeating-linear-gradient(135deg, white, white 25px, rgba(0,0,0,0.05) 25px, rgba(0,0,0,0.05) 50px )",
  },
  control: {
    margin: "0.3em",
    minWidth: "18em",
    paddingRight: "0.5em",
  },
  flexRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "end",
  },
  flexRowOrColumn: {
    display: "flex",
    flexDirection: "column",
    overflowX: "hidden",
    overflowY: "auto",
    ["@media (min-width:600px)"]: {
      flexDirection: "row",
    },
  },
  form: {
    display: "flex",
    overflow: "hidden",
    flexDirection: "column",
    marginBottom: "5em",
    padding: "3em 3em 0 3em",
  },
  formPane: {
    borderRight: "none",
    minWidth: "410px",
    ["@media (min-width:660px)"]: {
      borderRight: "1px solid lightgrey",
    },
    paddingRight: "5px",
    "&:last-child": {
      paddingLeft: "5px",
      paddingRight: "0",
      borderRight: "none",
    },
  },
  paneTitle: {
    position: "absolute",
    top: "0px",
    left: "10px",
  },
  wideControl: {
    margin: "5px",
    minWidth: "195px",
    width: "100%",
    paddingRight: "5px",
  },
});

export enum FormAction {
  AddIndividual = "addIndividual",
  handleCertificate = "handleCertificate",
}

export function IndividualForm({
  individual,
  onUpdateIndividual,
  formAction,
  colorKey,
  numberError,
  colorError,
  sexError,
  birthDateError,
  litterError,
}: {
  individual: Individual;
  onUpdateIndividual: any;
  formAction: FormAction;
  colorKey?: number;
  numberError: boolean;
  colorError: boolean;
  sexError: boolean;
  birthDateError: boolean;
  litterError: boolean;
}) {
  const { colors } = useDataContext();
  const { user } = useUserContext();
  const style = useStyles();

  // returns true if you are an admin or the manager of the genebank the individual belongs to
  const canManage: boolean = React.useMemo(() => {
    return user?.canEdit(individual?.genebank);
  }, [user, individual]);

  const colorOptions: OptionType[] = React.useMemo(() => {
    if (
      individual &&
      colors &&
      Object.keys(colors).includes(individual.genebank)
    ) {
      return colors[individual.genebank].map((c) => {
        return { value: c.name, label: `${c.id} - ${c.name}` };
      });
    }
    return [];
  }, [colors, individual]);

  const sexOptions = [
    { value: "female", label: "Hona" },
    { value: "male", label: "Hane" },
    { value: "unknown", label: "Okänd" },
  ];

  const photoOptions = [
    { value: "no", label: "Nej" },
    { value: "yes", label: "Ja" },
  ]; //should be boolean but doesn't work together with the OptionType
  // also decide how this should be stored in the backend

  return (
    <>
      <div className={style.form}>
        <h1>Fyll i uppgifterna om kaninen</h1>
        <MuiPickersUtilsProvider utils={DateFnsUtils}>
          <div className={style.flexRowOrColumn}>
            <div className={style.formPane}>
              {formAction == FormAction.handleCertificate ? (
                <div className={style.adminPane}>
                  <div className={style.paneTitle}>
                    Kan endast ändras av genbanksansvarig
                  </div>
                  <TextField
                    disabled={!canManage}
                    required
                    error={numberError}
                    label="Nummer"
                    className={style.control}
                    variant={inputVariant}
                    value={individual.number ?? ""}
                    onChange={(event) => {
                      onUpdateIndividual("number", event.currentTarget.value);
                    }}
                  />
                </div>
              ) : formAction == FormAction.AddIndividual ? ( // jscpd:ignore-start
                <>
                  <TextField
                    required
                    error={numberError}
                    label="Nummer"
                    className={style.control}
                    variant={inputVariant}
                    value={individual.number ?? ""}
                    onChange={(event) => {
                      onUpdateIndividual("number", event.currentTarget.value);
                    }}
                  />
                  <TextField
                    label="Certifikatnummer"
                    className={style.control}
                    variant={inputVariant}
                    value={individual.certificate ?? ""}
                    onChange={(event) => {
                      onUpdateIndividual(
                        "certificate",
                        event.currentTarget.value
                      );
                    }}
                  />
                </> // jscpd:ignore-end
              ) : (
                <></>
              )}
              <div className={style.flexRow}>
                <TextField
                  label="Namn"
                  className={style.control}
                  variant={inputVariant}
                  value={individual.name ?? ""}
                  onChange={(event) => {
                    onUpdateIndividual("name", event.currentTarget.value);
                  }}
                />
                <KeyboardDatePicker
                  required
                  error={birthDateError}
                  autoOk
                  variant="inline"
                  className={style.control}
                  inputVariant={inputVariant}
                  label="Födelsedatum"
                  format={dateFormat}
                  value={individual.birth_date ?? null}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  onChange={(date, value) => {
                    value && onUpdateIndividual("birth_date", value);
                  }}
                />
              </div>
              <div className={style.flexRow}>
                <Autocomplete
                  options={sexOptions ?? []}
                  value={
                    sexOptions.find(
                      (option) => option.value == individual.sex
                    ) ?? sexOptions[sexOptions.length - 1]
                  }
                  getOptionLabel={(option: OptionType) => option.label}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Kön"
                      className={style.control}
                      variant={inputVariant}
                      margin="normal"
                      required
                      error={sexError}
                    />
                  )}
                  onChange={(event: any, newValue: OptionType | null) => {
                    onUpdateIndividual("sex", newValue?.value ?? "");
                  }}
                />
                <TextField
                  required
                  error={litterError}
                  label="Antal födda i kullen"
                  className={style.control}
                  variant={inputVariant}
                  value={individual.litter ?? 0}
                  type="number"
                  onChange={(event) => {
                    onUpdateIndividual("litter", +event.currentTarget.value);
                  }}
                />
              </div>
              <div className={style.flexRow}>
                <Autocomplete
                  key={colorKey}
                  options={colorOptions ?? []}
                  value={
                    colorOptions.find(
                      (option) => option.value == individual.color
                    ) ?? null
                  }
                  getOptionLabel={(option: OptionType) => option.label}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Färg"
                      className={style.control}
                      variant={inputVariant}
                      margin="normal"
                      required
                      error={colorError}
                    />
                  )}
                  onChange={(event: any, newValue: OptionType | null) => {
                    onUpdateIndividual("color", newValue?.value ?? "");
                  }}
                />
                <TextField
                  label="Avvikande hårlag"
                  variant={inputVariant}
                  className={style.control}
                  multiline
                  rows={1}
                  value={individual.hair_notes ?? ""}
                  onChange={(event) => {
                    onUpdateIndividual("hair_notes", event.currentTarget.value);
                  }}
                />
              </div>
              <div className={style.flexRow}>
                <TextField
                  label="Färg på buken"
                  className={style.control}
                  variant={inputVariant}
                  value={individual.belly_color ?? ""}
                  onChange={(event) => {
                    onUpdateIndividual(
                      "belly_color",
                      event.currentTarget.value
                    );
                  }}
                />
                <TextField
                  label="Ögonfärg"
                  className={style.control}
                  variant={inputVariant}
                  value={individual.eye_color ?? ""}
                  onChange={(event) => {
                    onUpdateIndividual("eye_color", event.currentTarget.value);
                  }}
                />
              </div>
              <div className={style.flexRow}>
                <TextField
                  label="Klofärg(er)"
                  className={style.control}
                  variant={inputVariant}
                  value={individual.claw_color ?? ""}
                  onChange={(event) => {
                    onUpdateIndividual("claw_color", event.currentTarget.value);
                  }}
                />
                <Autocomplete
                  options={photoOptions ?? []}
                  getOptionLabel={(option: OptionType) => option.label}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Foto finns"
                      className={style.control}
                      variant={inputVariant}
                      margin="normal"
                    />
                  )}
                />
              </div>
              <div></div>
              <TextField
                label="Anteckningar"
                variant={inputVariant}
                className={style.wideControl}
                multiline
                rows={4}
                value={individual.notes ?? ""}
                onChange={(event) => {
                  onUpdateIndividual("notes", event.currentTarget.value);
                }}
              />
            </div>
          </div>
        </MuiPickersUtilsProvider>
      </div>
    </>
  );
}
