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
import {
  Birth,
  Breeding,
  dateFormat,
  Genebank,
  HerdNameID,
  individualLabel,
  inputVariant,
  LimitedHerd,
  LimitedBreeding,
  locale,
  OptionType,
  Individual,
  LimitedIndividual,
} from "@app/data_context_global";

import { Button, TextField, Typography } from "@material-ui/core";
import { useDataContext } from "./data_context";
import { useMessageContext } from "@app/message_context";
import { Autocomplete } from "@material-ui/lab";
import { ExpandMore, ExpandLess } from "@material-ui/icons";
import { get, patch, post } from "./communication";
import { useBreedingContext } from "./breeding_context";

const emptyBreeding: Breeding = {
  breed_date: null,
  breed_notes: "",
  father: "",
  mother: "",
  birth_date: null,
  birth_notes: "",
  litter_size: null,
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
  const { genebanks } = useDataContext();
  const {
    createBreeding,
    createBirth,
    updateBreeding,
    findBreedingMatch,
    modifyBreedingUpdates,
  } = useBreedingContext();
  const { userMessage } = useMessageContext();
  const [formState, setFormState] = React.useState(emptyBreeding as Breeding);
  const [showBirthForm, setShowBirthForm] = React.useState(false);
  React.useEffect(
    () => setFormState(!data || data == "new" ? emptyBreeding : data),
    [data]
  );
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

  const genebank: Genebank | undefined = React.useMemo(() => {
    return genebanks.find((g) => g.herds.find((h) => h.herd == herdId));
  }, [genebanks]);

  const allFemales: OptionType[] = React.useMemo(() => {
    if (!genebank) {
      return [];
    }
    return genebank?.individuals
      .filter((i) => i.sex == "female")
      .map((i) => {
        return { value: i.number, label: individualLabel(i) };
      });
  }, [genebank]);

  const allMales: OptionType[] = React.useMemo(() => {
    if (!genebank) {
      return [];
    }
    return genebank?.individuals
      .filter((i) => i.sex == "male")
      .map((i) => {
        return { value: i.number, label: individualLabel(i) };
      });
  }, [genebank]);

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
    if (daysBetween < 28 || daysBetween > 32) {
      userMessage(
        "Parningsdatum och födelsedatum passar inte ihop.",
        "warning"
      );
      return false;
    }
    return true;
  };

  const validateUserInput = (userInput: Breeding) => {
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
      !(userInput.litter_size > 0 && userInput.litter_size < 10)
    ) {
      userMessage("Ange en kullstorlek mellan 1 och 9.", "warning");
      return false;
    }

    if (
      (userInput.litter_size !== null || userInput.birth_notes !== "") &&
      userInput.birth_date == null
    ) {
      userMessage(
        "Om du vill spara information om födseln måste du ange ett födelsedatum.",
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

  const createEmptyIndividual = (individual: Individual): any => {
    post("/api/individual", individual).then(
      (json) => {
        switch (json.status) {
          case "success": {
            userMessage("Kaninen har lagts till i din besättning.", "success");
            break;
          }
          case "error": {
            switch (json.message) {
              case "Not logged in":
                {
                  userMessage("Du är inte inloggad.", "error");
                }
                break;
              case "Individual must have a valid herd":
                {
                  userMessage("Besättningen kunde inte hittas.", "error");
                }
                break;
              case "Forbidden": {
                userMessage(
                  "Du saknar rättigheterna för att lägga till en kanin i besättningen.",
                  "error"
                );
                break;
              }
              default: {
                userMessage(
                  "Något gick fel. Det här borde inte hända.",
                  "error"
                );
                break;
              }
            }
          }
        }
        return json.status;
      },
      (error) => {
        userMessage("Något gick fel.", "error");
      }
    );
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

    if (data !== "new") {
      const breedingMatch = await findBreedingMatch(herdId, breeding);
      if (!breedingMatch) {
        userMessage("Parningstillfället kunde inte hittas.", "error");
        return;
      }
      const modifiedBreedingUpdates = modifyBreedingUpdates(
        breeding,
        breedingMatch
      );
      const updatedBreeding = await updateBreeding(modifiedBreedingUpdates);
      if (!!updatedBreeding) {
        userMessage("Parningstillfället har uppdaterats.", "success");
        handleBreedingsChanged();
        return;
      }
    }

    const newBreedingData: LimitedBreeding = {
      date: breeding.breed_date,
      mother: breeding.mother,
      father: breeding.father,
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
      litter: breeding.litter_size,
      notes: breeding.birth_notes !== "" ? breeding.birth_notes : undefined,
      id: newBreeding.breeding_id,
    };

    const newBirth = await createBirth(newBirthData);
    if (!!newBirth) {
      userMessage("Sparat!", "success");
      handleBreedingsChanged();
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
      const emptyIndividual: Individual = {
        herd: herdId,
        origin_herd: originHerdNameID,
        genebank: genebank?.name,
        certificate: null,
        number: null,
        birth_date: newBirthData.date,
        father: fatherInd,
        mother: motherInd,
        color_note: null,
        death_date: null,
        death_note: null,
        litter: null,
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
        breeding: newBirthData.id ? newBirthData.id : 0,
      };
      for (let i = 0; i < breeding.litter_size; i++) {
        await new Promise((r) => setTimeout(r, 2000));
        status = createEmptyIndividual(emptyIndividual);
        if (!status || status == "error") {
          break;
        }
      }
    }
    return;
  };

  return (
    <>
      <form className="breedingForm">
        <MuiPickersUtilsProvider utils={DateFnsUtils}>
          <Typography variant="h6">
            {data == "new" && "Nytt "}Parningstillfälle
          </Typography>
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
              options={allFemales ?? []}
              value={
                allFemales.find((option) => option.value == formState.mother) ??
                null
              }
              // jscpd:ignore-start
              getOptionLabel={(option: OptionType) => option.label}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Mor"
                  className="wideControl"
                  variant={inputVariant}
                  margin="normal"
                />
              )}
              // jscpd:ignore-end

              onChange={(event: any, newValue: OptionType | null) => {
                newValue && setFormField("mother", newValue.value);
              }}
            />
            <Autocomplete
              options={allMales ?? []}
              value={
                allMales.find((option) => option.value == formState.father) ??
                null
              }
              // jscpd:ignore-start
              getOptionLabel={(option: OptionType) => option.label}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Far"
                  className="wideControl"
                  variant={inputVariant}
                  margin="normal"
                />
              )}
              // jscpd:ignore-end

              onChange={(event: any, newValue: OptionType | null) => {
                newValue && setFormField("father", newValue.value);
              }}
            />
            <TextField
              label="Anteckningar om parningstillfället"
              variant={inputVariant}
              className="wideControl"
              multiline
              rows={2}
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
                  className="wideControl"
                  value={formState.birth_date ?? null}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  onChange={(date, value) => {
                    value && setFormField("birth_date", value);
                  }}
                />
                <TextField
                  label="Kullstorlek"
                  value={formState.litter_size ?? ""}
                  type="number"
                  className="wideControl"
                  variant={inputVariant}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  onChange={(e: any) => {
                    setFormField("litter_size", e.target.value);
                  }}
                />
                <TextField
                  label="Anteckningar om födseln"
                  variant={inputVariant}
                  className="wideControl"
                  multiline
                  rows={2}
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
          <div>
            <Button
              variant="contained"
              color="primary"
              onClick={() => saveBreeding(formState)}
            >
              Spara
            </Button>
          </div>
        </MuiPickersUtilsProvider>
      </form>
    </>
  );
}
