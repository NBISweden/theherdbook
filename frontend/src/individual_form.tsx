import React from "react";

import { Button, InputAdornment, TextField, Tooltip } from "@material-ui/core";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";
import { Autocomplete } from "@material-ui/lab";
import DateFnsUtils from "@date-io/date-fns";
import sv from "date-fns/locale/sv";

import { useDataContext } from "@app/data_context";
import InfoOutlinedIcon from "@material-ui/icons/InfoOutlined";
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
import { BreedingDialog } from "./breeding_dialog";

export enum FormAction {
  AddIndividual = "addIndividual",
  handleCertificate = "handleCertificate",
  editIndividual = "editIndividual",
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
  litterError6w,
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
  litterError6w: boolean;
}) {
  const [herdOptions, setHerdOptions] = React.useState([] as OptionType[]);
  const [openBreedDialog, setBreedDiOpen] = React.useState(false);
  const [certType, setCertType] = React.useState("unknown" as string);
  const { colors, genebanks } = useDataContext();
  const { user } = useUserContext();
  const [isIndNull, setIndNull] = React.useState(true);

  // returns true if you are an admin or the manager of the genebank the individual belongs to
  const canManage: boolean = React.useMemo(() => {
    return user?.canEdit(individual?.genebank);
  }, [user, individual]);

  const canEditBreeding: boolean = React.useMemo(() => {
    return user?.canEdit(individual?.origin_herd?.herd);
  }, [user, individual]);

  const colorOptions: OptionType[] = React.useMemo(() => {
    if (
      individual &&
      colors &&
      Object.keys(colors).includes(individual.genebank)
    ) {
      return colors[individual.genebank].map((c) => {
        return {
          id: c.id,
          comment: c.comment,
          value: c.name,
          label: `${c.id} - ${c.name}`,
        };
      });
    }
    return [];
  }, [colors, individual]);

  React.useEffect(() => {
    const getParents = async () => {
      let herds = [];
      let father;
      let mother;

      /* if (individual.father?.number) {
        father = await get(`/api/individual/${individual.father?.number}`);
        console.log(father);
        if (!father) {
          return;
        }
      } */
      if (individual.mother?.number && formAction == FormAction.AddIndividual) {
        mother = await get(`/api/individual/${individual.mother?.number}`);
        if (!mother) {
          return;
        }
        herds.push(mother.herd);
        individual.origin_herd = mother.herd;
        individual.number = mother.herd.herd + "-";
        setIndNull(false);
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
  }, [individual.mother?.number]);

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

  /* React.useEffect(() => {
    if (formAction == FormAction.AddIndividual && !!individual.birth_date) {
      const year = individual.birth_date[2] + individual.birth_date[3];
      onUpdateIndividual("number", year);
    }
  }, [individual.birth_date]); */

  /**
   * This is to make sure there never is a value in the local state for
   * both digital and paper certificate, only for one (or none) of them.
   * Without this, redundant values could be remaining in the state if the user
   * changes the cert type after putting in a number.
   *
   */
  const onCertTypeChange = (type: string) => {
    setCertType(type);
    if (type == "digital") {
      onUpdateIndividual("certificate", null);
    }
    if (type == "paper") {
      onUpdateIndividual("digital_certificate", null);
    } else {
      if (individual.digital_certificate !== null) {
        onUpdateIndividual("digital_certificate", null);
      }
      if (individual.certificate !== null) {
        onUpdateIndividual("certificate", null);
      }
    }
  };
  console.log(formAction);
  return (
    <>
      <div className="individualForm">
        <MuiPickersUtilsProvider utils={DateFnsUtils} locale={sv}>
          <div className="flexRowOrColumn">
            <div className="formPane">
              <div className="titleText">Redigera Individ</div>

              {formAction == FormAction.editIndividual ? ( // jscpd:ignore-start
                <>
                  <div className={!canManage ? "adminPane" : "whitePane"}>
                    <div className="flexRow">
                      {!canManage ? (
                        <div className="paneTitle">
                          Kan endast ändras av genbanksansvarig
                        </div>
                      ) : (
                        <></>
                      )}
                      <TextField
                        disabled={!canManage}
                        required
                        error={numberError}
                        label="Individnummer"
                        className="control controlWidth"
                        variant={inputVariant}
                        value={individual.number ?? ""}
                        onChange={(event) => {
                          onUpdateIndividual(
                            "number",
                            event.currentTarget.value
                          );
                        }}
                      />
                    </div>
                    <div className="flexRow">
                      <Autocomplete
                        disabled={!canManage}
                        className="controlWidth"
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
                            className="control"
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
                          disabled={!canManage}
                          label="Certifikatnummer papper"
                          className="control controlWidth"
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
                          disabled={!canManage}
                          label="Certifikatnummer digital"
                          className="control controlWidth"
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
                          className="control controlWidth"
                          variant={inputVariant}
                          value={""}
                          onChange={() => {}}
                        />
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <></>
              )}
              {formAction == FormAction.handleCertificate ? (
                <div className="adminPane">
                  <div className="paneTitle">
                    Kan endast ändras av genbanksansvarig
                  </div>
                  <TextField
                    disabled={!canManage}
                    required
                    error={numberError}
                    label="Individnummer"
                    className="control"
                    variant={inputVariant}
                    value={individual.number ?? ""}
                    onChange={(event) => {
                      onUpdateIndividual("number", event.currentTarget.value);
                    }}
                  />
                  {individual.digital_certificate ? (
                    <p className="certNumber">
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
                    <div className="flexRow">
                      <Tooltip title="Ursprungsbesättning är alltid den besättning som modern befinner sig i. Är detta fel måste modern först säljas till rätt besättning">
                        <Autocomplete
                          options={herdOptions}
                          disabled
                          noOptionsText={"Välj härstamningen först"}
                          getOptionLabel={(option: OptionType) => option.label}
                          className="wideControlInd"
                          value={
                            herdOptions.find(
                              (option) =>
                                option.value.herd ==
                                individual.origin_herd?.herd
                            ) ?? null
                          }
                          onChange={(event, value) =>
                            onUpdateIndividual("origin_herd", value?.value)
                          }
                          renderInput={(params) => (
                            <TextField
                              {...params}
                              label="Ursprungsbesättning "
                              variant={inputVariant}
                              margin="normal"
                            />
                          )}
                        />
                      </Tooltip>
                    </div>
                    <div className="flexRow">
                      <KeyboardDatePicker
                        required
                        error={birthDateError}
                        autoOk
                        variant="inline"
                        className="control controlWidth"
                        inputVariant={inputVariant}
                        label="Födelsedatum"
                        format={dateFormat}
                        value={individual.birth_date ?? null}
                        InputLabelProps={{
                          shrink: true,
                        }}
                        onChange={(date, value) => {
                          !isNaN(date) &&
                            onUpdateIndividual("birth_date", value);
                        }}
                      />
                      <TextField
                        required
                        error={numberError}
                        disabled={isIndNull}
                        label="Individnummer"
                        className="control controlWidth"
                        variant={inputVariant}
                        value={
                          (individual.number?.split(/-\d{0,2}/)[1] ??
                            individual.number) ||
                          ""
                        }
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              {individual?.number
                                ? `${
                                    individual.number?.match(
                                      /([G-M]\d+|[G-M]X1)-\d{0,2}/
                                    )[0]
                                  }`
                                : `${
                                    individual.genebank
                                      ? individual.genebank[0]
                                      : "X"
                                  }XXX-XX`}
                            </InputAdornment>
                          ),
                        }}
                        onChange={(event) => {
                          onUpdateIndividual(
                            "number",
                            `${
                              individual.number?.match(
                                /([G-M]\d+|[G-M]X1)-\d{0,2}/
                              )[0]
                            }${event.currentTarget.value}`
                          );
                        }}
                      />
                    </div>{" "}
                    <div className="flexRow">
                      <Autocomplete
                        className="controlWidth"
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
                            className="control"
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
                          className="control controlWidth"
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
                          className="control controlWidth"
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
                          className="control controlWidth"
                          variant={inputVariant}
                          value={""}
                          onChange={() => {}}
                        />
                      )}
                    </div>
                  </>
                ) : formAction == FormAction.handleCertificate ||
                  formAction == FormAction.editIndividual ? (
                  <div className="flexRow">
                    <TextField
                      disabled={
                        formAction == FormAction.handleCertificate ||
                        formAction == FormAction.editIndividual
                      }
                      variant={inputVariant}
                      className="control controlWidth"
                      label="Födelsedatum"
                      value={individual.birth_date ?? null}
                    />

                    <BreedingDialog
                      breed_id={individual.breeding}
                      open={openBreedDialog}
                      close={() => setBreedDiOpen(false)}
                    />
                    {!canEditBreeding ? (
                      <div className="controlWidth">
                        Kan endast ändras av genbanksansvarig eller ägare av
                        ursprungsbesättning
                      </div>
                    ) : (
                      <div className="flexRow">
                        <Tooltip
                          title="Är datumet fel vänligen ändra i parningstillfället"
                          placement="right"
                          arrow
                        >
                          <InfoOutlinedIcon />
                        </Tooltip>
                        <Button
                          className="control editButton"
                          disabled={!canEditBreeding}
                          variant="outlined"
                          color="primary"
                          onClick={() => {
                            setBreedDiOpen(true);
                          }}
                        >
                          Redigera parningstillfälle
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <></>
                )}
              </>
              <div className="flexRow">
                <TextField
                  label="Namn"
                  className="control controlWidth"
                  variant={inputVariant}
                  value={individual.name ?? ""}
                  onChange={(event) => {
                    onUpdateIndividual("name", event.currentTarget.value);
                  }}
                />
                <Autocomplete
                  options={sexOptions ?? []}
                  className="controlWidth"
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
                      className="control"
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
              {formAction != FormAction.editIndividual ? ( // jscpd:ignore-start
                <div className="flexRow">
                  <TextField
                    required
                    error={litterError}
                    label="Antal födda i kullen"
                    className="control controlWidth"
                    variant={inputVariant}
                    value={individual.litter_size ?? ""}
                    type="number"
                    onChange={(event) => {
                      onUpdateIndividual(
                        "litter_size",
                        +event.currentTarget.value
                      );
                    }}
                  />
                  <TextField
                    required
                    error={litterError6w}
                    label="Levande i kullen efter 6v"
                    className="control controlWidth"
                    variant={inputVariant}
                    value={individual.litter_size6w ?? ""}
                    type="number"
                    onChange={(event) => {
                      onUpdateIndividual(
                        "litter_size6w",
                        +event.currentTarget.value
                      );
                    }}
                  />
                </div>
              ) : (
                <></>
              )}
              <div className="flexRow">
                <Autocomplete
                  key={colorKey}
                  className="controlWidth"
                  options={colorOptions ?? []}
                  value={
                    colorOptions.find(
                      (option) => option.value == individual.color
                    ) ?? null
                  }
                  getOptionLabel={(option: OptionType) => option.label}
                  renderOption={(option) => {
                    return (
                      <div>
                        <strong>{`${option.id} - ${option.value}`}</strong>
                        <li>{`${option.comment}`}</li>
                      </div>
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Färg"
                      className="control"
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
                  label="Färg på buken"
                  className="control controlWidth"
                  variant={inputVariant}
                  value={individual.belly_color ?? ""}
                  onChange={(event) => {
                    onUpdateIndividual(
                      "belly_color",
                      event.currentTarget.value
                    );
                  }}
                />
              </div>
              <div className="flexRow">
                <a
                  href={
                    "https://drive.google.com/file/d/18oKM3eZWVGirFyMf8OHkysKG0n5LSRw4/view?usp=sharing"
                  }
                >
                  {" "}
                  Utförligare färgbeskrivningar finns i Föreningen
                  Gotlandskaninens Färgatlas, version 2022.
                </a>
              </div>
              <div className="flexRow">
                <TextField
                  label="Ögonfärg"
                  className="control controlWidth"
                  variant={inputVariant}
                  value={individual.eye_color ?? ""}
                  onChange={(event) => {
                    onUpdateIndividual("eye_color", event.currentTarget.value);
                  }}
                />
                <TextField
                  label="Klofärg(er)"
                  className="control controlWidth"
                  variant={inputVariant}
                  value={individual.claw_color ?? ""}
                  onChange={(event) => {
                    onUpdateIndividual("claw_color", event.currentTarget.value);
                  }}
                />
                <Autocomplete
                  options={photoOptions ?? []}
                  className="controlWidth"
                  getOptionLabel={(option: OptionType) => option.label}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Foto finns"
                      className="control"
                      variant={inputVariant}
                      margin="normal"
                    />
                  )}
                />
              </div>
              <div className="flexRow">
                <TextField
                  label="Avvikande hårlag"
                  variant={inputVariant}
                  className="wideControlInd"
                  multiline
                  rows={1}
                  value={individual.hair_notes ?? ""}
                  onChange={(event) => {
                    onUpdateIndividual("hair_notes", event.currentTarget.value);
                  }}
                />
              </div>
              <div className="flexRow">
                <TextField
                  label="Anteckningar"
                  variant={inputVariant}
                  className="wideControlInd"
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
