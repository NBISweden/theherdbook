import React from "react";

import { InputAdornment, makeStyles, TextField } from "@material-ui/core";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";
import { Autocomplete } from "@material-ui/lab";
import DateFnsUtils from "@date-io/date-fns";

import { useDataContext } from "@app/data_context";
import {
  dateFormat,
  Genebank,
  herdLabel,
  inputVariant,
  Individual,
  LimitedHerd,
  OptionType,
} from "@app/data_context_global";

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
    justifyContent: "start",
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
  genebank,
  individual,
  canManage,
  canEdit,
  onUpdateIndividual,
  formAction,
  colorKey,
  numberError,
  colorError,
  sexError,
  birthDateError,
  litterError,
}: {
  genebank: Genebank;
  individual: Individual;
  canManage?: boolean;
  canEdit: boolean;
  onUpdateIndividual: any;
  formAction: FormAction;
  colorKey?: number;
  numberError: boolean;
  colorError: boolean;
  sexError: boolean;
  birthDateError: boolean;
  litterError: boolean;
}) {
  const { colors, genebanks } = useDataContext();
  const style = useStyles();
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

  const herdOptions = React.useMemo(() => {
    const dataset = genebanks.find(
      (g: Genebank) => g.name == individual.genebank
    );
    if (dataset) {
      const herdOptions: OptionType[] = dataset.herds.map((h: LimitedHerd) => {
        return { value: h, label: herdLabel(h) };
      });
      return herdOptions;
    } else {
      return [];
    }
  }, [genebanks, individual.genebank]);

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

  React.useEffect(() => {
    if (!!genebank) {
      onUpdateIndividual("genebank", genebank.name);
    }
  }, [genebank]);

  React.useEffect(() => {
    if (formAction == FormAction.AddIndividual && !!individual.birth_date) {
      const year = individual.birth_date[2] + individual.birth_date[3];
      onUpdateIndividual("number", year);
    }
  }, [individual.birth_date]);

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
                    label="Individnummer"
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
                  <div className={style.flexRow}>
                    <Autocomplete
                      options={herdOptions}
                      getOptionLabel={(option: OptionType) => option.label}
                      value={
                        herdOptions.find(
                          (option) =>
                            option.value.herd == individual.origin_herd?.herd
                        ) ?? null
                      }
                      onChange={(event, value) =>
                        onUpdateIndividual("origin_herd", value?.value)
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Välj ursprungsbesättning"
                          variant={inputVariant}
                          className={style.control}
                          margin="normal"
                        />
                      )}
                    />
                    <KeyboardDatePicker
                      disabled={!canEdit}
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
                  <TextField
                    disabled={!canEdit}
                    required
                    error={numberError}
                    label="Individnummer"
                    className={style.control}
                    variant={inputVariant}
                    value={
                      individual.number?.split("-")[1] ?? individual.number
                    }
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          {individual.origin_herd?.herd
                            ? `${individual.origin_herd?.herd} -`
                            : `${
                                individual.genebank
                                  ? individual.genebank[0]
                                  : "X"
                              }XXX-`}
                        </InputAdornment>
                      ),
                    }}
                    onChange={(event) => {
                      onUpdateIndividual(
                        "number",
                        `${individual.origin_herd?.herd}-${event.currentTarget.value}`
                      );
                    }}
                  />
                  <TextField
                    disabled={!canEdit}
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
                  disabled={!canEdit}
                  label="Namn"
                  className={style.control}
                  variant={inputVariant}
                  value={individual.name ?? ""}
                  onChange={(event) => {
                    onUpdateIndividual("name", event.currentTarget.value);
                  }}
                />
                <Autocomplete
                  disabled={!canEdit}
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
              </div>
              <div className={style.flexRow}>
                <Autocomplete
                  key={colorKey}
                  disabled={!canEdit}
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
                  disabled={!canEdit}
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
                <TextField
                  disabled={!canEdit}
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
                  disabled={!canEdit}
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
                  disabled={!canEdit}
                  label="Klofärg(er)"
                  className={style.control}
                  variant={inputVariant}
                  value={individual.claw_color ?? ""}
                  onChange={(event) => {
                    onUpdateIndividual("claw_color", event.currentTarget.value);
                  }}
                />
                <Autocomplete
                  disabled={!canEdit}
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
              <div className={style.flexRow}>
                <TextField
                  disabled={!canEdit}
                  label="Avvikande hårlag"
                  variant={inputVariant}
                  className={style.wideControl}
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
                  disabled={!canEdit}
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
          </div>
        </MuiPickersUtilsProvider>
      </div>
    </>
  );
}
