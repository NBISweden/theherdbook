/**
 * @file This file contains the BreedingForm function. This function allows
 *       users to create and update breeding events in the database.
 */
import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import {
  dateFormat,
  Genebank,
  individualLabel,
  inputVariant,
  LimitedHerd,
  locale,
  OptionType,
} from "@app/data_context_global";

import { Breeding } from "./breeding_list";
import { Button, TextField, Typography } from "@material-ui/core";
import { useDataContext } from "./data_context";
import { useMessageContext } from "@app/message_context";
import { Autocomplete } from "@material-ui/lab";
import { ExpandMore, ExpandLess } from "@material-ui/icons";
import { get, patch, post } from "./communication";

const useStyles = makeStyles({
  form: {
    width: "100%",
    height: "100%",
    overflow: "hidden",
    padding: "20px",
  },
  formBox: {
    border: "1px solid lightgrey",
    borderRadius: "8px",
    padding: "10px",
  },
  wideControl: {
    width: "100%",
  },
});

const emptyBreeding: Breeding = {
  date: "",
  breed_notes: "",
  father: "",
  mother: "",
  birth_date: "",
  birth_notes: "",
  litter_size: 0,
};

interface LimitedBreeding {
  date: string;
  mother: string;
  father: string;
  notes?: string;
}

interface Birth {
  id: number;
  date: string;
  litter: number;
  notes?: string;
}

/**
 * The BreedingForm function. This function allows users to create and update
 * breeding events in the database.
 */
export function BreedingForm({
  data,
  herdId,
}: {
  data: Breeding | "new";
  herdId: string | undefined;
}) {
  const style = useStyles();
  const { genebanks } = useDataContext();
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
    setFormField("date", breedDateLocal);
  };

  React.useEffect(() => {
    if (formState.date == "" && typeof formState.birth_date == "string") {
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

  const saveBreeding = async (breeding: Breeding): Promise<any> => {
    // Validation checks for user input
    if (formState === emptyBreeding) {
      userMessage("Fyll i informationen om parningstillfället.", "warning");
      return;
    }

    if (formState.date === "") {
      userMessage("Ange ett parningsdatum.", "warning");
      return;
    }

    if (formState.mother === "") {
      userMessage("Fyll i modern.", "warning");
      return;
    }

    if (formState.father === "") {
      userMessage("Fyll i fadern.", "warning");
      return;
    }

    if (
      formState.birth_date !== "" &&
      !(formState.litter_size > 0 && formState.litter_size < 10)
    ) {
      userMessage("Ange en kullstorlek mellan 1 och 9.", "warning");
      return;
    }

    if (
      (formState.litter_size !== 0 || formState.birth_notes !== "") &&
      formState.birth_date == ""
    ) {
      userMessage(
        "Om du vill spara information om födseln måste du ange ett födelsedatum.",
        "warning"
      );
      return;
    }

    if (formState.birth_date !== "" && formState.birth_date !== "") {
      const datesValid = validateDates(formState.date, formState.birth_date);
      if (datesValid === false) {
        return;
      }
    }

    // TODO
    // create sensibility checks for birth/breeding dates (should be about 30 days in between)

    const updatedBreeding = await updateBreeding(breeding);
    if (!!updatedBreeding) {
      userMessage("Parningstillfället har uppdaterats.", "success");
      return;
    }

    // If there was no existing breeding to update, create a new one
    const breedingData: LimitedBreeding = {
      date: breeding.date,
      mother: breeding.mother,
      father: breeding.father,
      notes: breeding.breed_notes !== "" ? breeding.breed_notes : undefined,
    };

    const newBreeding = await createBreeding(breedingData);
    if (!newBreeding) {
      // createBreeding will show a message, so no error handling or messages here
      return;
    }

    // If the user hasn't provided birth information, leave with the following message:
    if (formState.birth_date === "") {
      userMessage("Parningen har sparats.", "success");
      return;
    }

    // Otherwise, continue with creating a birth
    const birthData: Birth = {
      date: breeding.birth_date,
      litter: breeding.litter_size,
      notes: breeding.birth_notes !== "" ? breeding.birth_notes : undefined,
      id: newBreeding.breeding_id,
    };

    const newBirth = await createBirth(birthData);
    if (!!newBirth) {
      userMessage("Sparat!", "success");
    }
    return;
  };

  const createBirth = async (birthData: Birth) => {
    const wasBirthCreated: { status: "success" | "error"; message?: string } =
      await post("/api/birth", birthData);

    if (wasBirthCreated.status === "success") {
      return wasBirthCreated;
    }

    const translate: Map<string, string> = new Map([
      ["Not logged in", "Du är inte inloggad. Logga in och försök igen."],
      ["Forbidden", "Du har inte behörighet att lägga till födselinformation."],
    ]);

    if (
      wasBirthCreated.status === "error" &&
      !!wasBirthCreated.message &&
      translate.has(wasBirthCreated.message)
    ) {
      userMessage(translate.get(wasBirthCreated.message), "error");
      return;
    }

    userMessage(
      "Okänt fel - något gick fel på grund av tekniska problem. Kontakta en administratör.",
      "error"
    );
    return;
  };

  const updateBreeding = async (breedingUpdates: Breeding) => {
    // Only run this if there is a breeding to update.
    if (data == "new") {
      return;
    }

    // Get all the breedings for the current herd
    const breedings = await get(`/api/breeding/${herdId}`);

    const breedingMatch = breedings.breedings.find(
      (item) =>
        item.mother == data.mother &&
        item.father == data.father &&
        (item.breed_date == data.date || item.birth_date == data.birth_date)
    );

    if (!breedingMatch) {
      userMessage("Parningstillfället kunde inte hittas.", "error");
      return;
    }

    const breedingData = {
      date: breedingUpdates.date,
      breed_notes: breedingUpdates.breed_notes,
      father: breedingUpdates.father,
      mother: breedingUpdates.mother,
      birth_date: breedingUpdates.birth_date,
      birth_notes: breedingUpdates.birth_notes,
      litter_size: breedingUpdates.litter_size,
      id: breedingMatch.breeding_id,
    };

    const wasBreedingUpdated = await patch("/api/breeding", breedingData);

    if (wasBreedingUpdated.status === "success") {
      return wasBreedingUpdated;
    }

    const translate: Map<string, string> = new Map([
      ["Not logged in", "Du är inte inloggad. Logga in och försök igen"],
      [
        "Unknown mother",
        "Okänd mor, modern måste vara en aktiv individ i databasen",
      ],
      [
        "Unknown father",
        "Okänd far, fadern måste vara en aktiv individ i databasen",
      ],
      [
        "Unknown mother, Unknown father",
        "Okända föräldrar. Både modern och fadern måste vara aktiva individer i databasen.",
      ],
      ["Forbidden", "Du har inte behörighet att skapa parningstillfället."],
    ]);

    if (
      wasBreedingUpdated.status == "error" &&
      !!wasBreedingUpdated.message &&
      translate.has(wasBreedingUpdated.message)
    ) {
      userMessage(translate.get(wasBreedingUpdated.message), "error");
      return;
    }

    userMessage(
      "Okänt fel - något gick fel på grund av tekniska problem. Kontakta en administratör.",
      "error"
    );
    return;
  };

  const createBreeding = async (breedingData: LimitedBreeding) => {
    const wasBreedingCreated: {
      status: string;
      message?: string;
      breeding_id?: number;
    } = await post("/api/breeding", breedingData);

    if (wasBreedingCreated.status == "success") {
      return wasBreedingCreated;
    }

    const translate: Map<string, string> = new Map([
      ["Not logged in", "Du är inte inloggad. Logga in och försök igen"],
      [
        "Unknown mother",
        "Okänd mor, modern måste vara en aktiv individ i databasen",
      ],
      [
        "Unknown father",
        "Okänd far, fadern måste vara en aktiv individ i databasen",
      ],
      [
        "Unknown mother, Unknown father",
        "Okända föräldrar. Både modern och fadern måste vara aktiva individer i databasen.",
      ],
      ["Forbidden", "Du har inte behörighet att skapa parningstillfället."],
    ]);

    if (
      wasBreedingCreated.status == "error" &&
      !!wasBreedingCreated.message &&
      translate.has(wasBreedingCreated.message)
    ) {
      userMessage(translate.get(wasBreedingCreated.message), "error");
      return;
    }

    userMessage(
      "Okänt fel - något gick fel på grund av tekniska problem. Kontakta en administratör.",
      "error"
    );
    return;
  };

  return (
    <>
      <form className={style.formState}>
        <MuiPickersUtilsProvider utils={DateFnsUtils}>
          <Typography variant="h6">
            {data == "new" && "Nytt "}Parningstillfälle
          </Typography>
          <div className={style.formBox}>
            <KeyboardDatePicker
              autoOk
              error={false}
              invalidDateMessage="Datumet har fel format."
              maxDateMessage="Datumet får inte ligga i framtiden."
              disableFuture
              variant="inline"
              inputVariant={inputVariant}
              label="Parningsdatum"
              format={dateFormat}
              className={style.wideControl}
              value={formState ? formState.date ?? "" : ""}
              InputLabelProps={{
                shrink: true,
              }}
              onChange={(date, value) => {
                setFormField("date", value ?? "");
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
                  className={style.wideControl}
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
                  className={style.wideControl}
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
              className={style.wideControl}
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
              <div className={style.formBox}>
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
                  className={style.wideControl}
                  value={formState ? formState.birth_date ?? "" : ""}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  onChange={(date, value) => {
                    setFormField("birth_date", value ?? "");
                  }}
                />
                <TextField
                  label="Kullstorlek"
                  value={formState.litter_size ?? 0}
                  type="number"
                  className={style.wideControl}
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
                  className={style.wideControl}
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
