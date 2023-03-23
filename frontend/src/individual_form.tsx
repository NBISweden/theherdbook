import React from "react";

import {
  Button,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
} from "@material-ui/core";
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
  inputVariant,
  Individual,
  OptionType,
} from "@app/data_context_global";

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
  herdOptions,
}: {
  genebank?: Genebank;
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
  herdOptions: OptionType[];
}) {
  const [openBreedDialog, setBreedDiOpen] = React.useState(false);
  const { colors } = useDataContext();
  const { user } = useUserContext();

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

  const colorOptions: OptionType[] = React.useMemo(() => {
    if (genebank && colors && Object.keys(colors).includes(genebank.name)) {
      return colors[genebank.name].map((c) => {
        return returnColorData(c);
      });
    } else if (
      individual &&
      colors &&
      Object.keys(colors).includes(individual?.genebank)
    ) {
      return colors[individual.genebank].map((c) => {
        return returnColorData(c);
      });
    }
    return [];
  }, [colors, genebank]);

  const sexOptions = [
    { value: "female", label: "Hona" },
    { value: "male", label: "Hane" },
    { value: "unknown", label: "Okänd" },
  ];

  const photoOptions = [
    { value: false, label: "Nej" },
    { value: true, label: "Ja" },
  ];

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
                      {originHerdForm(!canManage, "control controlWidth")}
                      {indNumberForm(!canManage && individual?.is_registered)}
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
                    <Tooltip
                      arrow
                      title={
                        <React.Fragment>
                          <Typography>
                            Är nummret fel vänligen ändra i redigera individ.
                          </Typography>
                        </React.Fragment>
                      }
                    >
                      <TextField
                        disabled={true}
                        required
                        error={numberError}
                        label="Individnummer"
                        className="control"
                        variant={inputVariant}
                        value={individual.number ?? ""}
                        onChange={(event) => {
                          onUpdateIndividual(
                            "number",
                            event.currentTarget.value
                          );
                        }}
                      />
                    </Tooltip>
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
                      {originHerdForm(!canManage, "wideControlInd")}
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
                      <Tooltip
                        title={
                          <React.Fragment>
                            <Typography>
                              Du kommer här få ett förslag på kull- och
                              individnummer. Nummret kommer bara vara korrekt om
                              du lagt till alla kaniner och kullar i kronologisk
                              ordning.
                            </Typography>
                          </React.Fragment>
                        }
                        arrow
                      >
                        {indNumberForm(individual?.number == null)}
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
                    {!canManage && individual?.is_registered ? (
                      <div className="controlWidth">
                        Kan endast ändras av genbanksansvarig!
                      </div>
                    ) : (
                      <div className="flexRow">
                        <Tooltip
                          title={
                            <React.Fragment>
                              <Typography>
                                Är datumet fel för hela kullen vänligen ändra i
                                själva parningstillfället
                              </Typography>
                            </React.Fragment>
                          }
                          placement="right"
                          arrow
                        >
                          <InfoOutlinedIcon />
                        </Tooltip>
                        <Button
                          className="control editButton"
                          disabled={!canManage && individual?.is_registered}
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
                  <Tooltip
                    arrow
                    title={
                      <React.Fragment>
                        <Typography>
                          OBS! Ändrar du här ändrar du detta för alla kaniner i
                          kullen.
                        </Typography>
                      </React.Fragment>
                    }
                  >
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
                  </Tooltip>
                  <Tooltip
                    arrow
                    title={
                      <React.Fragment>
                        <Typography>
                          OBS! Ändrar du här ändrar du detta för alla kaniner i
                          kullen.
                        </Typography>
                      </React.Fragment>
                    }
                  >
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
                  </Tooltip>
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
                  value={
                    photoOptions.find(
                      (option) => option.value == individual.has_photo
                    ) ?? photoOptions[0] //"nej as defult pos 0 "
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Foto finns"
                      className="control"
                      variant={inputVariant}
                      margin="normal"
                    />
                  )}
                  onChange={(event: any, newValue: OptionType | null) => {
                    onUpdateIndividual("has_photo", newValue?.value ?? "");
                  }}
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

  function originHerdForm(_disabeld: boolean | undefined, _classname: string) {
    return (
      <Tooltip
        arrow
        title={
          <React.Fragment>
            <Typography>
              Ursprungsbesättning är alltid den besättning som modern befinner
              sig i. Är detta fel måste modern först säljas till rätt
              besättning"
            </Typography>
          </React.Fragment>
        }
      >
        <Autocomplete
          options={herdOptions}
          disabled={_disabeld}
          noOptionsText={"Välj härstamningen först"}
          getOptionLabel={(option: OptionType) => option.label}
          className={_classname}
          value={
            herdOptions.find(
              (option) => option.value.herd == individual.origin_herd?.herd
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
            />
          )}
        />
      </Tooltip>
    );
  }

  function indNumberForm(_disabeld: boolean | undefined) {
    return (
      <TextField
        required
        error={numberError}
        disabled={_disabeld}
        label="Individnummer"
        className="control controlWidth"
        variant={inputVariant}
        value={
          (individual.number?.split(/-\d{0,2}/)[1] ?? individual.number) || ""
        }
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              {individual?.number
                ? `${
                    individual?.number?.match(/([G-M]\d+|[G-M]X1)-\d{0,2}/)[0]
                  }`
                : `${genebank ? genebank.name[0] : "X"}XXX-XX`}
            </InputAdornment>
          ),
        }}
        onChange={(event) => {
          onUpdateIndividual(
            "number",
            `${individual.number?.match(/([G-M]\d+|[G-M]X1)-\d{0,2}/)[0]}${
              event.currentTarget.value
            }`
          );
        }}
      />
    );
  }

  function returnColorData(c: any) {
    return {
      id: c.id,
      comment: c.comment,
      value: c.name,
      label: `${c.id} - ${c.name}`,
    };
  }
}
