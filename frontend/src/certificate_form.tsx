import React from "react";

import { TextField } from "@material-ui/core";
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

export function CertificateForm({
  style,
  individual,
  onUpdateIndividual,
}: {
  style: any;
  individual: Individual;
  onUpdateIndividual: any;
}) {
  const { colors } = useDataContext();
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

  const canManage = true; // only for development reasons. To be removed.

  return (
    <>
      <div className={style.form}>
        <MuiPickersUtilsProvider utils={DateFnsUtils}>
          <div className={style.flexRowOrColumn}>
            <div className={style.formPane}>
              <h1>Fyll i uppgifterna för certifikatet</h1>
              <div className={style.adminPane}>
                <div className={style.paneTitle}>
                  Kan endast ändras av genbanksansvarig
                </div>
                <TextField
                  disabled
                  label="Nummer"
                  className={style.control}
                  variant={inputVariant}
                  value={individual.number ?? ""}
                  onChange={(event) => {
                    onUpdateIndividual("number", event.currentTarget.value);
                  }}
                />
              </div>
              <div className={style.flexRow}>
                <TextField
                  disabled={!canManage}
                  label="Namn"
                  className={style.control}
                  variant={inputVariant}
                  value={individual.name ?? ""}
                  onChange={(event) => {
                    onUpdateIndividual("name", event.currentTarget.value);
                  }}
                />
                <KeyboardDatePicker
                  disabled={!canManage}
                  autoOk
                  variant="inline"
                  className={style.control}
                  inputVariant={inputVariant}
                  label="Födelsedatum"
                  format={dateFormat}
                  value={individual.birth_date ?? ""}
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
                  disabled={!canManage}
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
                    />
                  )}
                  onChange={(event: any, newValue: OptionType | null) => {
                    onUpdateIndividual("sex", newValue?.value ?? "");
                  }}
                />
                <TextField
                  disabled={!canManage}
                  label="Antal födda i kullen"
                  className={style.control}
                  variant={inputVariant}
                  value={individual.litter ?? null}
                  type="number"
                  onChange={(event) => {
                    onUpdateIndividual("litter", +event.currentTarget.value);
                  }}
                />
              </div>
              <div className={style.flexRow}>
                <Autocomplete
                  disabled={!canManage}
                  options={colorOptions ?? []}
                  value={
                    colorOptions.find(
                      (option) => option.value == individual.color
                    ) ?? colorOptions[0]
                  }
                  getOptionLabel={(option: OptionType) => option.label}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Färg"
                      className={style.control}
                      variant={inputVariant}
                      margin="normal"
                    />
                  )}
                  onChange={(event: any, newValue: OptionType | null) => {
                    onUpdateIndividual("color", newValue?.value ?? "");
                  }}
                />
                <TextField
                  disabled={!canManage}
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
                  disabled={!canManage}
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
                  disabled={!canManage}
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
                  disabled={!canManage}
                  label="Klofärg(er)"
                  className={style.control}
                  variant={inputVariant}
                  value={individual.claw_color ?? ""}
                  onChange={(event) => {
                    onUpdateIndividual("claw_color", event.currentTarget.value);
                  }}
                />
                <Autocomplete
                  disabled={!canManage}
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
