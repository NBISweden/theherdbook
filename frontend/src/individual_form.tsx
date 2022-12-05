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
import { CertAutocomplete } from "./cert_autocomplete";

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
  intygError,
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
  intygError: boolean;
}) {
  const [herdOptions, setHerdOptions] = React.useState([] as OptionType[]);
  const [openBreedDialog, setBreedDiOpen] = React.useState(false);
  const { colors } = useDataContext();
  const { user } = useUserContext();
  const [isIndNull, setIndNull] = React.useState(true);

  // returns true if you are an admin or the manager of the genebank the individual belongs to
  const canManage: boolean = React.useMemo(() => {
    if (user?.is_admin) {
      return true;
    } else {
      if (!!genebank?.id) {
        return user?.is_manager?.includes(genebank?.id);
      } else {
        return user?.is_manager?.includes(genebank);
      }
    }
  }, [user, individual, genebank]);

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
      let mother;

      if (individual.mother?.number && formAction == FormAction.AddIndividual) {
        mother = await get(`/api/individual/${individual.mother?.number}`);
        if (!mother) {
          return;
        }
        let herds = mother.herd_tracking;
        individual.origin_herd = mother.herd;
        setIndNull(false);
        if (herds.length > 0) {
          const herdOptions: OptionType[] = herds.map((h: LimitedHerd) => {
            return { value: h, label: herdLabel(h) };
          });
          herdOptions.filter(
            (item, index) => herdOptions.indexOf(item) === index
          );
          //Filter unique herds from herd_tracking
          let unique = [
            ...new Map(
              herdOptions.map((item) => [item["label"], item])
            ).values(),
          ];
          setHerdOptions(unique);
          return;
        } else {
          return [];
        }
      }
    };
    getParents();
  }, [individual.mother?.number]);

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
      <div className="individualForm">
        <MuiPickersUtilsProvider utils={DateFnsUtils} locale={sv}>
          <div className="flexRowOrColumn">
            <div className="formPane">
              {formAction == FormAction.editIndividual ? ( // jscpd:ignore-start
                <>
                  <div className="titleText">Redigera Individ</div>
                  <div
                    className={
                      !canManage && individual?.is_registered
                        ? "adminPane"
                        : "whitePane"
                    }
                  >
                    <div className="flexRow">
                      {!canManage && individual?.is_registered ? (
                        <div className="paneTitle">
                          Kan endast ändras av genbanksansvarig
                        </div>
                      ) : (
                        <></>
                      )}
                      <TextField
                        disabled={!canManage && individual?.is_registered}
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
                      <CertAutocomplete
                        individual={individual}
                        canManage={canManage}
                        updateIndividual={onUpdateIndividual}
                        edit={individual?.is_registered}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <></>
              )}
              {formAction == FormAction.handleCertificate ? (
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
                      className="control"
                      variant={inputVariant}
                      value={individual.number ?? ""}
                      onChange={(event) => {
                        onUpdateIndividual("number", event.currentTarget.value);
                      }}
                    />
                  </div>
                  {individual.digital_certificate ? (
                    <p className="certNumber">
                      Intygsnummer: {individual.digital_certificate}
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
                          disabled={!canManage}
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
                      <Tooltip title="Du kommer här få ett förslag på kull- och individnummer. Nummret kommer bara vara korrekt om du registrerar alla kaniner och kullar i kronologisk ordning.">
                        <TextField
                          required
                          error={numberError}
                          disabled={isIndNull || individual?.number == null}
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
                      </Tooltip>
                    </div>{" "}
                    <div className="flexRow">
                      <CertAutocomplete
                        individual={individual}
                        canManage={canManage}
                        updateIndividual={onUpdateIndividual}
                        intygError={intygError}
                        edit={false}
                      />
                    </div>
                  </>
                ) : formAction == FormAction.editIndividual ? ( // jscpd:ignore-start
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
                      individual={individual}
                      onUpdateIndividual={onUpdateIndividual}
                    />
                    {!canEditBreeding ? (
                      <div className="controlWidth">
                        Kan endast ändras av genbanksansvarig eller ägare av
                        ursprungsbesättning
                      </div>
                    ) : (
                      <div className="flexRow">
                        <Tooltip
                          title="Är datumet fel för hela kullen vänligen ändra i själva parningstillfället"
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
                          Redigera föräldrar
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
                  label="Färganteckning"
                  className="control controlWidth"
                  variant={inputVariant}
                  value={individual.color_note ?? ""}
                  onChange={(event) => {
                    onUpdateIndividual("color_note", event.currentTarget.value);
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
                  target={"blank"}
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
                  minRows={1}
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
                  minRows={4}
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
