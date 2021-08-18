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
import { get } from "./communication";
import { useUserContext } from "./user_context";

const useStyles = makeStyles({
  adminPane: {
    width: "100%",
    padding: "15px 10px 5px 10px",
    marginBottom: "2em",
    border: "1px solid lightgrey",
    position: "relative",
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    background:
      "repeating-linear-gradient(135deg, white, white 25px, rgba(0,0,0,0.05) 25px, rgba(0,0,0,0.05) 50px )",
  },
  certNumber: {
    margin: "0.3em",
  },
  control: {
    margin: "0.3em",
    paddingRight: "0.5em",
  },
  controlWidth: {
    width: "50%",
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
  },
  formPane: {
    borderRight: "none",
    width: "100%",
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
    margin: "5px 0",
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
  onUpdateIndividual: any;
  formAction: FormAction;
  colorKey?: number;
  numberError: boolean;
  colorError: boolean;
  sexError: boolean;
  birthDateError: boolean;
  litterError: boolean;
}) {
  const [herdOptions, setHerdOptions] = React.useState([] as OptionType[]);
  const [certType, setCertType] = React.useState("unknown" as string);
  const { colors, genebanks } = useDataContext();
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

  React.useEffect(() => {
    const getParents = async () => {
      let herds = [];
      let father;
      let mother;

      if (individual.father?.number) {
        father = await get(`/api/individual/${individual.father?.number}`);
        console.log(father);
        if (!father) {
          return;
        }
        herds.push(father.herd);
      }
      if (individual.mother?.number) {
        mother = await get(`/api/individual/${individual.mother?.number}`);
        if (!mother) {
          return;
        }
        herds.push(mother.herd);
      }
      if (herds.length > 0) {
        const herdOptions: OptionType[] = herds.map((h: LimitedHerd) => {
          return { value: h, label: herdLabel(h) };
        });
        herdOptions.filter(
          (item, index) => herdOptions.indexOf(item) === index
        );
        setHerdOptions(herdOptions);
        return;
      } else {
        return [];
      }
    };
    getParents();
  }, [individual.father?.number, individual.mother?.number]);

  const certTypeOptions: OptionType[] = [
    { value: "digital", label: "Digital" },
    { value: "paper", label: "Papper" },
    { value: "none", label: "Inget certifikat" },
    { value: "unknown", label: "Okänd" },
  ];

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

  const onCertTypeChange = (type: string) => {
    setCertType(type);
    if (type == "digital") {
      onUpdateIndividual("certificate", null);
    }
    if (type == "paper") {
      onUpdateIndividual("digital_certificate", null);
    } else {
      if (!!individual.digital_certificate) {
        onUpdateIndividual("digital_certificate", null);
      }
      if (!!individual.certificate) {
        onUpdateIndividual("certificate", null);
      }
    }
  };

  return (
    <>
      <div className={style.form}>
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
                  {individual.digital_certificate ? (
                    <p className={style.certNumber}>
                      Certifikatnummer: {individual.digital_certificate}
                    </p>
                  ) : (
                    <></>
                  )}
                </div>
              ) : (
                <></>
              )}
              <>
                {formAction == FormAction.AddIndividual ? ( // jscpd:ignore-start
                  <>
                    <div className={style.flexRow}>
                      <Autocomplete
                        options={herdOptions}
                        noOptionsText={"Välj härstamningen först"}
                        getOptionLabel={(option: OptionType) => option.label}
                        className={style.wideControl}
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
                            className={style.control}
                            variant={inputVariant}
                            margin="normal"
                          />
                        )}
                      />
                    </div>
                    <div className={style.flexRow}>
                      <KeyboardDatePicker
                        required
                        error={birthDateError}
                        autoOk
                        variant="inline"
                        className={`${style.control} ${style.controlWidth}`}
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

                      <TextField
                        required
                        error={numberError}
                        label="Individnummer"
                        className={`${style.control} ${style.controlWidth}`}
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
                    </div>{" "}
                    <div className={style.flexRow}>
                      <Autocomplete
                        disabled={!canManage}
                        className={style.controlWidth}
                        options={certTypeOptions ?? []}
                        value={certTypeOptions.find(
                          (option) =>
                            option.value == certType ??
                            certTypeOptions[certTypeOptions.length - 1]
                        )}
                        getOptionLabel={(option: OptionType) => option.label}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Certifikattyp"
                            className={style.control}
                            variant={inputVariant}
                            margin="normal"
                          />
                        )}
                        onChange={(event: any, newValue: OptionType) =>
                          onCertTypeChange(newValue?.value ?? "unknown")
                        }
                      />
                      {certType == "paper" ? (
                        <TextField
                          label="Certifikatnummer papper"
                          className={`${style.control} ${style.controlWidth}`}
                          variant={inputVariant}
                          value={individual.certificate ?? ""}
                          onChange={(event) => {
                            onUpdateIndividual(
                              "certificate",
                              event.currentTarget.value
                            );
                          }}
                        />
                      ) : certType == "digital" ? (
                        <TextField
                          label="Certifikatnummer digital"
                          className={`${style.control} ${style.controlWidth}`}
                          variant={inputVariant}
                          value={individual.digital_certificate ?? ""}
                          onChange={(event) => {
                            onUpdateIndividual(
                              "digital_certificate",
                              event.currentTarget.value
                            );
                          }}
                        />
                      ) : (
                        <TextField
                          label="Certifikatnummer - välj typ först"
                          disabled
                          className={`${style.control} ${style.controlWidth}`}
                          variant={inputVariant}
                          value={null}
                          onChange={() => {}}
                        />
                      )}
                    </div>
                  </>
                ) : formAction == FormAction.handleCertificate ? (
                  <div className={style.flexRow}>
                    <KeyboardDatePicker
                      required
                      error={birthDateError}
                      autoOk
                      variant="inline"
                      className={`${style.control} ${style.controlWidth}`}
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
                ) : (
                  <></>
                )}
              </>
              <div className={style.flexRow}>
                <TextField
                  label="Namn"
                  className={`${style.control} ${style.controlWidth}`}
                  value={individual.name ?? ""}
                  onChange={(event) => {
                    onUpdateIndividual("name", event.currentTarget.value);
                  }}
                />
                <Autocomplete
                  options={sexOptions ?? []}
                  className={style.controlWidth}
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
                  className={style.controlWidth}
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
                  required
                  error={litterError}
                  label="Antal födda i kullen"
                  className={`${style.control} ${style.controlWidth}`}
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
                  label="Färg på buken"
                  className={`${style.control} ${style.controlWidth}`}
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
                  className={`${style.control} ${style.controlWidth}`}
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
                  className={`${style.control} ${style.controlWidth}`}
                  variant={inputVariant}
                  value={individual.claw_color ?? ""}
                  onChange={(event) => {
                    onUpdateIndividual("claw_color", event.currentTarget.value);
                  }}
                />
                <Autocomplete
                  options={photoOptions ?? []}
                  className={style.controlWidth}
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
