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
  OptionType,
} from "@app/data_context_global";

import { Breeding } from "./breeding_list";
import { Button, TextField, Typography } from "@material-ui/core";
import { useDataContext } from "./data_context";
import { useMessageContext } from "@app/message_context";
import { Autocomplete } from "@material-ui/lab";
import { ExpandMore, ExpandLess } from "@material-ui/icons";
import { post } from "./communication";

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
  const hasBirth = React.useMemo(() => {
    return !!formState.birth_date;
  }, [formState]);

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
  const herd: LimitedHerd | undefined = React.useMemo(() => {
    const herd = genebanks.map((g) => g.herds.find((h) => h.herd == herdId));
    if (herd.length) {
      return herd[0];
    }
    return undefined;
  }, [genebanks]);

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

  const createBreeding = async (breedingData: Breeding): Promise<any> => {
    if (formState === emptyBreeding) {
      userMessage("Fyll i informationen om parningstillfället.", "warning");
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

    if (formState.date === "" && formState.birth_date === "") {
      userMessage("Ange ett parningsdatum eller födelsedatum.", "warning");
      return;
    }

    if (formState.birth_date !== "" && formState.litter_size === 0) {
      userMessage("Ange en kullstorlek större än noll.", "warning");
      return;
    }

    const breedingEvent: {
      status: string;
      message?: string;
      breeding_id?: number;
    } = await post("/api/breeding", breedingData);

    if (breedingEvent.status == "success") {
      userMessage("Parningstillfället har skapats.", "success");
      return breedingEvent;
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
      breedingEvent.status == "error" &&
      !!breedingEvent.message &&
      translate.has(breedingEvent.message)
    ) {
      userMessage(translate.get(breedingEvent.message), "error");
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
                value && setFormField("date", value);
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
                    value && setFormField("birth_date", value);
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
              onClick={() => createBreeding(formState)}
            >
              Spara
            </Button>
          </div>
        </MuiPickersUtilsProvider>
      </form>
    </>
  );
}
