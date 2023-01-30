/**
 * @file This file contains the BreedingForm function. This function allows
 *       users to create and update breeding events in the database.
 */
import React from "react";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import sv from "date-fns/locale/sv";

import {
  individualsFromDate,
  toLimitedIndividuals,
  Birth,
  Breeding,
  dateFormat,
  ExtendedBreeding,
  Genebank,
  HerdNameID,
  individualLabel,
  inputVariant,
  LimitedBreeding,
  locale,
  Individual,
  LimitedIndividual,
} from "@app/data_context_global";

import {
  Button,
  TextField,
  Typography,
  Checkbox,
  FormControlLabel,
  Tooltip,
} from "@material-ui/core";
import { useDataContext } from "./data_context";
import { useMessageContext } from "@app/message_context";
import { Autocomplete } from "@material-ui/lab";
import { ExpandMore, ExpandLess } from "@material-ui/icons";
import { get, patch, post } from "./communication";
import { useBreedingContext } from "./breeding_context";
import { useUserContext } from "./user_context";

const emptyBreeding: Breeding = {
  id: -1,
  breed_date: null,
  breed_notes: "",
  father: "",
  mother: "",
  birth_date: null,
  birth_notes: "",
  litter_size: null,
  litter_size6w: null,
};

/**
 * The BreedingForm function. This function allows users to create and update
 * breeding events in the database.
 */
export function BreedingForm({
  data,
  herdId,
  handleBreedingsChanged,
  handleActive,
}: {
  data: Breeding | "new";
  herdId: string | undefined;
  handleBreedingsChanged: () => void;
  handleActive: (breeding: Breeding) => void;
}) {
  const {
    genebanks,
    herdListener,
    herdChangeListener,
    setHerdChangeListener,
    loadData,
  } = useDataContext();
  const {
    createBreeding,
    createBirth,
    updateBreeding,
    findBreedingMatch,
    findEditableBreedingMatch,
    modifyBreedingUpdates,
    checkBirthUpdate,
  } = useBreedingContext();
  const { userMessage } = useMessageContext();
  const { user } = useUserContext();
  const canEditBreeding =
    user?.canEdit(herdId) &&
    !data?.individuals?.find((e) => e.is_registerd)?.is_registerd;
  const canManage = !!(user?.is_manager || user?.is_admin);
  const [formState, setFormState] = React.useState(
    emptyBreeding as ExtendedBreeding
  );
  const [showBirthForm, setShowBirthForm] = React.useState(false);
  let defaultDate = new Date();
  defaultDate.setFullYear(defaultDate.getFullYear() - 10);
  const [fromDate, setFromDate] = React.useState(defaultDate as Date);
  const [showDead, setshowDead] = React.useState(false as boolean);
  const [activeMalesLimited, setActiveMalesLimited] = React.useState(
    [] as LimitedIndividual[]
  );
  const [activeFemalesLimited, setActiveFemalesLimited] = React.useState(
    [] as LimitedIndividual[]
  );
  const [showFromDateFilter, setShowFromDateFilter] = React.useState(false);

  const genebank: Genebank | undefined = React.useMemo(() => {
    return genebanks.find((g) => g.herds.find((h) => h.herd == herdId));
  }, [genebanks, data]);

  React.useEffect(() => {
    setFormState(!data || data == "new" ? emptyBreeding : data);
  }, [data]);

  React.useEffect(() => {
    let females: Individual[] = [];
    let males: Individual[] = [];
    if (
      genebank &&
      data !== "new" &&
      (user?.is_admin || user?.is_manager?.includes(genebank.id))
    ) {
      females = genebank?.individuals.filter((i) => i.sex === "female");
      males = genebank?.individuals.filter((i) => i.sex === "male");
    } else {
      females = individualsFromDate(
        genebank,
        "female",
        fromDate,
        herdId,
        showDead
      );
      males = individualsFromDate(
        genebank,
        "male",
        fromDate,
        undefined,
        showDead
      );
    }
    if (!!data && data !== "new") {
      const activeMother = females.find((i) => i.number === data.mother);
      let mother;
      if (!activeMother) {
        mother = genebank?.individuals.find((i) => i.number === data.mother);
      }
      const activeFather = males.find((i) => i.number === data.father);
      let father;
      if (!activeFather) {
        father = genebank?.individuals.find((i) => i.number === data.father);
      }
      if (!!mother && !!father) {
        females.push(mother);
        males.push(father);
      }
    }
    const limitedFemales = toLimitedIndividuals(females);
    const limitedMales = toLimitedIndividuals(males);
    setActiveFemalesLimited(limitedFemales);
    setActiveMalesLimited(limitedMales);
  }, [fromDate, genebank, data, showDead]);

  /**
   * Sets a single key `label` in the `herd` form to `value` (if herd isn't
   * undefined).
   */
  const setFormField = <B extends keyof Breeding>(
    label: B,
    value: Breeding[B]
  ) => {
    formState && setFormState({ ...formState, [label]: value });
  };

  const autoFillBreedDate = (dateString: string) => {
    let breedDate: Date | number = new Date(dateString);
    breedDate.setDate(breedDate.getDate() - 30);
    const breedDateLocal = breedDate.toLocaleDateString(locale);
    setFormField("breed_date", breedDateLocal);
  };

  React.useEffect(() => {
    if (
      formState.breed_date == null &&
      typeof formState.birth_date == "string"
    ) {
      autoFillBreedDate(formState.birth_date);
    }
  }, [formState.birth_date]);

  const validateDates = (
    breedingDateString: string,
    birthDateString: string
  ) => {
    const breedingDate: Date | number = new Date(breedingDateString);
    const birthDate: Date | number = new Date(birthDateString);
    const daysBetween =
      (birthDate.getTime() - breedingDate.getTime()) / 86400000;
    if (daysBetween < 26 || daysBetween > 38) {
      userMessage(
        "Tiden mellan parningsdatum och födelsedatum ska vara mellan 26 och 38 dagar.",
        "warning"
      );
      return false;
    }
    return true;
  };

  const validateUserInput = (userInput: Breeding) => {
    if (userInput.id === undefined) {
      return false;
    }
    if (userInput === emptyBreeding) {
      userMessage("Fyll i information om parningstillfället.", "warning");
      return false;
    }

    if (userInput.breed_date === null) {
      userMessage("Ange ett parningsdatum.", "warning");
      return false;
    }

    if (userInput.mother === "") {
      userMessage("Fyll i modern.", "warning");
      return false;
    }

    if (userInput.father === "") {
      userMessage("Fyll i fadern.", "warning");
      return false;
    }

    if (
      (userInput.birth_date, userInput.litter_size) !== null &&
      !(userInput.litter_size > 0)
    ) {
      userMessage("Ange en kullstorlek större än 0", "warning");
      return false;
    }

    if (!!userInput.birth_date && !userInput.litter_size) {
      userMessage(
        "Om du vill spara information om födseln måste du ange ett födelsedatum och en kullstorlek.",
        "warning"
      );
      return false;
    }

    if (!!userInput.litter_size && !userInput.birth_date) {
      userMessage(
        "Om du vill spara information om födseln måste du ange ett födelsedatum och en kullstorlek.",
        "warning"
      );
      return false;
    }

    if (userInput.breed_date !== null && userInput.birth_date !== null) {
      const datesValid = validateDates(
        userInput.breed_date,
        userInput.birth_date
      );
      if (datesValid === false) {
        return false;
      }
    }
    return true;
  };

  const postEmptyIndividual = (individual: Individual): any => {
    let status = post("/api/individual", individual).then(
      (json) => {
        switch (json.status) {
          case "success": {
            userMessage(
              `Kaninen med nummer ${json.number} har lagts till i din besättning.`,
              "success"
            );
            return "success";
          }
          case "error": {
            switch (json.message) {
              case "Not logged in":
                {
                  userMessage("Du är inte inloggad.", "error");
                }
                return "error";
              case "Individual must have a valid herd":
                {
                  userMessage("Besättningen kunde inte hittas.", "error");
                }
                return "error";
              case "Forbidden": {
                userMessage(
                  "Du saknar rättigheterna för att lägga till en kanin i besättningen.",
                  "error"
                );
                return "error";
              }
              default: {
                userMessage(
                  "Något gick fel. Det här borde inte hända.",
                  "error"
                );
                return "error";
              }
            }
          }
        }
      },
      (error) => {
        userMessage("Något gick fel.", "error");
        return "error";
      }
    );
    return status;
  };

  const handleEditableBreedingUpdates = async (
    breeding: Breeding,
    breedingMatch: Breeding
  ) => {
    const modifiedBreedingUpdates = modifyBreedingUpdates(
      breeding,
      breedingMatch
    );
    const newIndsNumber = checkBirthUpdate(
      breedingMatch,
      modifiedBreedingUpdates
    );
    console.log("newinds", newIndsNumber);
    const updatedBreeding = await updateBreeding(modifiedBreedingUpdates);
    if (!!updatedBreeding) {
      userMessage("Parningstillfället har uppdaterats.", "success");

      if (newIndsNumber == 0) {
        return;
      }
      if (breeding.createInds === true) {
        await createEmptyIndividual(
          breeding,
          modifiedBreedingUpdates,
          newIndsNumber
        );
      }
    } else {
      userMessage("Något gick fel. Parningen kunde inte uppdateras.", "error");
      return;
    }
  };

  const createEmptyIndividual = async (
    breeding: Breeding,
    birthUpdates: Breeding | Birth,
    amount: number
  ) => {
    if (!herdId) {
      userMessage("Något gick fel", "error");
      return;
    }
    const originHerdNameID: HerdNameID = {
      herd: herdId,
    };
    const fatherInd: LimitedIndividual = {
      number: breeding.father,
    };
    const motherInd: LimitedIndividual = {
      number: breeding.mother,
    };
    const emptyIndividual = {
      herd: herdId,
      origin_herd: originHerdNameID,
      genebank: genebank?.name,
      certificate: null,
      birth_date: birthUpdates.birth_date
        ? birthUpdates.birth_date
        : birthUpdates.date,
      number: null,
      father: fatherInd,
      mother: motherInd,
      color_note: null,
      death_date: null,
      death_note: null,
      litter_size: null,
      litter_size6w: null,
      notes: "",
      herd_tracking: null,
      herd_active: true,
      is_active: false,
      alive: true,
      belly_color: null,
      eye_color: null,
      claw_color: null,
      hair_notes: "",
      selling_date: null,
      breeding: birthUpdates.id ? birthUpdates.id : 0,
    };
    for (let i = 0; i < amount; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      let status = await postEmptyIndividual(emptyIndividual);
      if (!status || status == "error") {
        break;
      }
    }
    return;
  };

  /**
   * Function to save the user input to the database.
   * Error handling happens from within the functions imported from data_context.
   * (updateBreeding, createBreeding and createBirth)
   */
  const saveBreeding = async (breeding: Breeding): Promise<any> => {
    const isInputValid = validateUserInput(breeding);
    if (!isInputValid) {
      return;
    }

    handleActive(breeding);
    const herdBreedings = await get(`/api/breeding/${herdId}`);
    const result = await findEditableBreedingMatch(breeding, herdBreedings);
    //const [breedingMatch, status] = result;
    const breedingMatch = result[0];
    const status = result[1];
    switch (status) {
      case -1:
        // create new breeding event
        const newBreedingData: LimitedBreeding = {
          date: breeding.breed_date,
          mother: breeding.mother,
          father: breeding.father,
          breeding_herd: herdId,
          notes: breeding.breed_notes !== "" ? breeding.breed_notes : undefined,
        };

        const newBreeding = await createBreeding(newBreedingData);
        if (!newBreeding) {
          return;
        }

        if (breeding.birth_date === null) {
          userMessage("Parningen har sparats.", "success");

          return;
        }

        const newBirthData: Birth = {
          date: breeding.birth_date,
          litter_size: breeding.litter_size,
          litter_size6w: breeding.litter_size6w,
          notes: breeding.birth_notes !== "" ? breeding.birth_notes : undefined,
          id: newBreeding.breeding_id,
        };

        const newBirth = await createBirth(newBirthData);
        if (!!newBirth) {
          userMessage("Födseln är sparad!", "success");

          if (breeding.createInds === true) {
            await createEmptyIndividual(
              breeding,
              newBirthData,
              Math.min(breeding.litter_size6w, 9)
            );
          }
          await setHerdChangeListener(herdChangeListener + 1);
          handleBreedingsChanged();
        }
        break;
      case 1:
        // This breeding event already exists. No parents to update
        breeding.father = breedingMatch.father;
        breeding.mother = breedingMatch.mother;
        await handleEditableBreedingUpdates(breeding, breedingMatch);
        await setHerdChangeListener(herdChangeListener + 1);
        handleBreedingsChanged();
        break;
      default:
        // update breeding event
        await handleEditableBreedingUpdates(breeding, breedingMatch);
        await setHerdChangeListener(herdChangeListener + 1);
        handleBreedingsChanged();
        break;
    }
  };

  return (
    <>
      <form className="breedingForm">
        <MuiPickersUtilsProvider utils={DateFnsUtils} locale={sv}>
          <Typography variant="h6">
            {data == "new" && "Nytt "}Parningstillfälle
          </Typography>
          <div className="flexRow">
            {canEditBreeding ? (
              <>
                Här kan du uppdatera föräldarna för alla individer du ser
                listade. Ändra här om hela kullen har fel föräldrar{" "}
              </>
            ) : (
              <>
                <Typography>
                  Endast Genbanksansvarig får uppdatera föräldrar för en kull
                  med registrerade kaniner. Men du kan uppdatera födelsedatum
                  och kullstorlek. Tänk då på att också uppdatera intygen med
                  rätt information.
                </Typography>
              </>
            )}
          </div>
          <div className="simpleField">
            <Button
              color="primary"
              onClick={() => setShowFromDateFilter(!showFromDateFilter)}
            >
              {showFromDateFilter == false ? "Filtrera kaniner" : "Dölj"}
              {showFromDateFilter == false ? <ExpandMore /> : <ExpandLess />}
            </Button>
            {showFromDateFilter ? (
              <>
                <MuiPickersUtilsProvider utils={DateFnsUtils} locale={sv}>
                  <KeyboardDatePicker
                    autoOk
                    variant={inputVariant}
                    inputVariant={inputVariant}
                    disableFuture
                    className="simpleField"
                    label="Född tidigast"
                    format={dateFormat}
                    value={fromDate}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    onChange={(value: Date) => {
                      fromDate && setFromDate(value);
                    }}
                  />
                </MuiPickersUtilsProvider>
              </>
            ) : (
              <></>
            )}
          </div>
          <FormControlLabel
            control={<Checkbox />}
            label="Visa döda kaniner"
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
              setshowDead(e.target.checked);
            }}
          />
          <div className="formBox">
            <KeyboardDatePicker
              autoOk
              disableFuture
              error={false}
              invalidDateMessage="Datumet har fel format."
              maxDateMessage="Datumet får inte ligga i framtiden."
              variant="inline"
              inputVariant={inputVariant}
              label="Parningsdatum"
              format={dateFormat}
              className="wideControl"
              value={formState.breed_date ?? null}
              InputLabelProps={{
                shrink: true,
              }}
              onChange={(date, value) => {
                value && setFormField("breed_date", value);
              }}
            />
            <Autocomplete
              options={activeFemalesLimited ?? []}
              value={
                activeFemalesLimited.find(
                  (option: LimitedIndividual) =>
                    option.number == formState.mother
                ) ?? null
              }
              // jscpd:ignore-start
              getOptionLabel={(option: LimitedIndividual) =>
                individualLabel(option)
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Mor"
                  disabled={!canEditBreeding && !canManage}
                  className="wideControl"
                  variant={inputVariant}
                  margin="normal"
                />
              )}
              // jscpd:ignore-end

              onChange={(event: any, newValue: LimitedIndividual | null) => {
                newValue && setFormField("mother", newValue.number);
              }}
            />
            <Autocomplete
              options={activeMalesLimited ?? []}
              value={
                activeMalesLimited.find(
                  (option: LimitedIndividual) =>
                    option.number == formState.father
                ) ?? null
              }
              // jscpd:ignore-start
              getOptionLabel={(option: LimitedIndividual) =>
                individualLabel(option)
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  disabled={!canEditBreeding && !canManage}
                  label="Far"
                  className="wideControl"
                  variant={inputVariant}
                  margin="normal"
                />
              )}
              // jscpd:ignore-end

              onChange={(event: any, newValue: LimitedIndividual | null) => {
                newValue && setFormField("father", newValue.number);
              }}
            />
            <TextField
              label="Anteckningar om parningstillfället"
              variant={inputVariant}
              className="wideControl"
              multiline
              minRows={2}
              value={formState.breed_notes ?? ""}
              onChange={(e: any) => {
                setFormField("breed_notes", e.target.value);
              }}
            />
          </div>
          <Button
            color="primary"
            onClick={() => setShowBirthForm(!showBirthForm)}
          >
            {showBirthForm == false ? "födselinformation" : "bara parning"}
            {showBirthForm == false ? <ExpandMore /> : <ExpandLess />}
          </Button>
          {showBirthForm ? (
            <>
              <Typography variant="h6">Födsel</Typography>
              <div className="formBox">
                <KeyboardDatePicker
                  autoOk
                  disableFuture
                  error={false}
                  invalidDateMessage="Datumet har fel format."
                  maxDateMessage="Datumet får inte ligga i framtiden."
                  variant="inline"
                  inputVariant={inputVariant}
                  label="Födelsedatum"
                  format={dateFormat}
                  className="controlFull"
                  value={formState.birth_date ?? null}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  onChange={(date, value) => {
                    value && setFormField("birth_date", value);
                  }}
                />
                <div className="flexRow">
                  <TextField
                    label="Kullstorlek"
                    value={formState.litter_size ?? ""}
                    type="number"
                    className="control controlWidth"
                    variant={inputVariant}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    onChange={(e: any) => {
                      setFormField("litter_size", e.target.value);
                    }}
                  />
                  <TextField
                    label="Levande i kullen efter 6v"
                    value={formState.litter_size6w ?? ""}
                    type="number"
                    className="controlWidth"
                    variant={inputVariant}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    onChange={(e: any) => {
                      setFormField("litter_size6w", e.target.value);
                    }}
                  />
                </div>
                <TextField
                  label="Anteckningar om födseln"
                  variant={inputVariant}
                  className="controlFull"
                  multiline
                  minRows={2}
                  value={formState.birth_notes ?? ""}
                  onChange={(e: any) => {
                    setFormField("birth_notes", e.target.value);
                  }}
                />
              </div>
            </>
          ) : (
            <></>
          )}

          <div className="formBox">
            <div className="flexRow">
              <Tooltip
                title={
                  <React.Fragment>
                    <Typography>
                      Om du klickar i denna ruta kommer systemet försöka skapa{" "}
                      {Math.min(formState?.litter_size6w, 9)} st tomma kaniner.
                      Du måste då registrera kullarna i rätt ordning för att
                      systemet ska kunna numrerar dem rätt! <p></p>
                      <b>
                        OBS max 9 kaniner från en kull Kommer läggas in i
                        systemet!
                      </b>
                    </Typography>
                  </React.Fragment>
                }
              >
                <FormControlLabel
                  control={<Checkbox />}
                  label="Skapa tomma kaniner"
                  value={formState.createInds ?? null}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                    setFormField("createInds", e.target.checked);
                  }}
                />
              </Tooltip>
              <Button
                variant="contained"
                color="primary"
                onClick={() => saveBreeding(formState)}
              >
                Spara
              </Button>
            </div>
          </div>
        </MuiPickersUtilsProvider>
      </form>
    </>
  );
}
