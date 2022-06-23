/**
 * @file This file contains the BreedingForm function. This function allows
 *       users to create and update breeding events in the database for a single individual.
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
  Genebank,
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
  breeding_herd: "",
  birth_date: null,
  birth_notes: "",
  litter_size: null,
  litter_size6w: null,
};

/**
 * The BreedingForm function. This function allows users to create and update
 * breeding events in the database.
 */
export function IndividualBreedingForm({
  data,
  herdId,
  handleBreedingsChanged,
  handleActive,
  individual,
  onUpdateIndividual,
  closeDialog,
}: {
  data: Breeding | "new";
  herdId: string | undefined;
  handleBreedingsChanged: () => void;
  handleActive: (breeding: Breeding) => void;
  individual: Individual;
  onUpdateIndividual: any;
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
    modifyBreedingUpdates,
    checkBirthUpdate,
  } = useBreedingContext();
  const { userMessage } = useMessageContext();
  const { user } = useUserContext();
  const is_admin = !!(user?.is_manager || user?.is_admin);
  const [formState, setFormState] = React.useState(
    emptyBreeding as ExtendedBreeding
  );
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
  const [breedingMatch, setBreedingMatch] = React.useState(
    undefined as Breeding | undefined
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
    const updatedBreeding = await updateBreeding(modifiedBreedingUpdates);
    if (!!updatedBreeding) {
      userMessage("Parningstillfället har uppdaterats.", "success");
      handleBreedingsChanged();
      setHerdChangeListener(herdChangeListener + 1);
      loadData(["genebanks"]);
      if (newIndsNumber == 0) {
        return;
      }
      createEmptyIndividual(breeding, modifiedBreedingUpdates, newIndsNumber);
    } else {
      userMessage("Något gick fel. Parningen kunde inte uppdateras.", "error");
      return;
    }
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
    const Breedingmatch = await post(`/api/breeding/${herdId}`, breeding);
    setBreedingMatch(Breedingmatch.breedings);
    console.log("breeding", breeding);
    console.log("reedingMatch", Breedingmatch);
    if (Breedingmatch.breedings != null) {
      userMessage(
        `Hittade ett befintligt parningstillfälle id : ${Breedingmatch.breedings.id} med parningsdatum : ${Breedingmatch.breedings.breed_date}.`,
        "success"
      );

      if (breeding.birth_date != Breedingmatch.breedings.birth_date) {
        userMessage(
          `Födelsedatumet du har angett: ${breeding.birth_date} skiljer sig från det existerande: ${Breedingmatch.breedings.birth_date}. Sparar du individen kommer individens födelsedatum att ändras.`,
          "warning"
        );
      }
      onUpdateIndividual("breeding", Breedingmatch.breedings.id);
      closeDialog();
    } else {
      userMessage(
        `Hittade inget befintligt parningstillfälle kommer skapa ett nytt!`,
        "info"
      );
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
        handleBreedingsChanged();
        return;
      }

      const newBirthData: Birth = {
        date: breeding.birth_date,
        litter_size: breeding.litter_size,
        litter_size6w: breeding.litter_size,
        notes: breeding.birth_notes !== "" ? breeding.birth_notes : undefined,
        id: newBreeding.breeding_id,
      };

      const newBirth = await createBirth(newBirthData);
      if (!!newBirth) {
        userMessage(
          "Ny födelseinformation har skapats glöm inte att spara individen",
          "success"
        );
        handleBreedingsChanged();
        onUpdateIndividual("breeding", newBreeding.breeding_id);
        closeDialog();
      }
    }
  };

  return (
    <>
      <form className="breedingForm">
        <MuiPickersUtilsProvider utils={DateFnsUtils} locale={sv}>
          <Typography variant="h6">
            {data == "new" && "Nytt "}Ändra föräldrar
          </Typography>
          <div className="flexRow">
            Här kan du uppdatera föräldarna för bara denna individ. OBS Är
            föräldrarna för hela kullen fel vänlig ändra i parningstillfället.
            När du updaterar här måste du också spara själva individen i den
            föregående dialogen för att ändringen ska få effekt.{" "}
          </div>
          <div>
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
              control={<Checkbox showDead />}
              label="Visa avlidna kaniner"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setshowDead(e.target.checked);
              }}
            />

            <div className="formBox">
              <div className="flexRow">
                <Autocomplete
                  className="wideControl"
                  options={activeFemalesLimited}
                  getOptionLabel={(option: LimitedIndividual) =>
                    individualLabel(option)
                  }
                  value={
                    activeFemalesLimited.find(
                      (option: LimitedIndividual) =>
                        option.number == formState.mother
                    ) ?? null
                  }
                  onChange={(
                    event: any,
                    newValue: LimitedIndividual | null
                  ) => {
                    newValue && setFormField("mother", newValue.number);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Välj mor"
                      variant={inputVariant}
                      className="controlFull"
                    />
                  )}
                />
              </div>
              <div className="flexRow">
                <Autocomplete
                  className="controlFull"
                  options={activeMalesLimited}
                  getOptionLabel={(option: LimitedIndividual) =>
                    individualLabel(option)
                  }
                  value={
                    activeMalesLimited.find(
                      (option: LimitedIndividual) =>
                        option.number == formState.father
                    ) ?? null
                  }
                  onChange={(
                    event: any,
                    newValue: LimitedIndividual | null
                  ) => {
                    newValue && setFormField("father", newValue.number);
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Välj far"
                      variant={inputVariant}
                      className="controlFull"
                    />
                  )}
                />
              </div>
              <div className="flexRow">
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
              </div>
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
              <div className="flexRow">
                <TextField
                  label="Anteckningar om födseln"
                  variant={inputVariant}
                  className="controlFull"
                  multiline
                  rows={2}
                  value={formState.birth_notes ?? ""}
                  onChange={(e: any) => {
                    setFormField("birth_notes", e.target.value);
                  }}
                />
              </div>
            </div>
          </div>
          <div className="paneControls">
            <Button
              variant="contained"
              color="primary"
              onClick={() => saveBreeding(formState)}
            >
              Uppdatera
            </Button>
            <Button variant="contained" color="secondary" onClick={closeDialog}>
              {"Avbryt"}
            </Button>
          </div>
        </MuiPickersUtilsProvider>
      </form>
    </>
  );
}
