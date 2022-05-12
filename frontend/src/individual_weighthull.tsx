import React from "react";
import {
  Button,
  makeStyles,
  Typography,
  TextField,
  InputAdornment,
} from "@material-ui/core";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import {
  Individual,
  asLocale,
  inputVariant,
  BodyFat,
  DateBodyfat,
  dateFormat,
  DateWeight,
  OptionType,
} from "@app/data_context_global";
import { useMessageContext } from "@app/message_context";
import { Autocomplete } from "@material-ui/lab";
import { patch } from "./communication";
import NumberFormat from "react-number-format";

const useStyles = makeStyles({
  infoText: {
    maxWidth: "40em",
  },
  checkContainer: {
    margin: "1.5em 0",
  },
  popupContainer: {
    maxWidth: "45em",
    display: "flex",
    flexDirection: "column",
  },
  measureList: {
    position: "relative",
  },
  listButton: {
    position: "absolute",
    right: "50px",
    top: 0,
  },
  scriptLink: {
    color: "blue",
    cursor: "pointer",
  },
  textContainer: {
    padding: "1.5em 0",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  formContainer: {
    display: "flex",
    flexDirection: "column",
    minHeight: "12em",
    marginBottom: "2em",
    justifyContent: "space-around",
  },
  buttonContainer: {
    display: "flex",
    marginTop: "1.5em",
  },
  altContainer: {
    display: "flex",
    flexDirection: "column",
    padding: "0.5em 0 2em 0",
    width: "60%",
    alignItems: "start",
  },
  datePicker: {
    maxWidth: "25em",
  },
  responseBox: {
    width: "100%",
    maxWidth: "65em",
    padding: "1em",
    margin: "2em 0",
  },
  successIcon: {
    fill: "#388e3c", // same as success.dark in the default theme
    marginLeft: "0.5em",
  },
  boxTitle: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },
});

// interface and function that make the react-number-format library work
// used to allow input of decimal commas for weight record
interface NumberFormatCustomProps {
  inputRef: (instance: NumberFormat | null) => void;
  onChange: (event: { target: { name: string; value: string } }) => void;
  name: string;
}

const NumberFormatCustom = (props: NumberFormatCustomProps) => {
  const { inputRef, onChange, ...other } = props;
  return (
    <NumberFormat
      {...other}
      getInputRef={inputRef}
      onValueChange={(values) => {
        onChange({
          target: {
            name: props.name,
            value: values.value,
          },
        });
      }}
      isNumericString
      decimalSeparator=","
    />
  );
};

export const IndividualWeigthull = ({
  individual,
}: {
  individual: Individual;
}) => {
  const [WHindividual, setWHindividual] = React.useState(
    individual as Individual
  );
  const { userMessage } = useMessageContext();
  const style = useStyles();
  const [bodyfat, setBodyfat] = React.useState("normal");
  const [weight, setWeight] = React.useState(null as number | null);
  const [bodyfatDate, setBodyfatDate] = React.useState(null as string | null);
  const [weightDate, setWeightDate] = React.useState(null as string | null);

  const translateBodyfat: Map<string, string> = new Map([
    ["low", "låg"],
    ["normal", "normal"],
    ["high", "hög"],
  ]);
  const removeMeasure = (field: "weights" | "bodyfat", index: number) => {
    console.debug("Deleting ", field, "number", index);
    if (WHindividual && WHindividual[field]) {
      WHindividual[field].splice(index, 1);
      updateField(field, WHindividual[field]);

      const newWeightRecord = {
        id: WHindividual?.id,
        number: WHindividual?.number,
        herd: WHindividual?.herd,
        weights: [...WHindividual?.weights],
        bodyfat: [...WHindividual?.bodyfat],
      };

      // send weight record to the backend
      patch("/api/individual", newWeightRecord)
        .then((json) => {
          if (json.status == "success") {
            userMessage("Mätningen har tagits bort.", "success");
            return;
          } else {
            userMessage("Något gick fel.", "error");
          }
        })
        .catch((error) => {
          userMessage("Vi har tekniska problem. Försök igen senare.", "error");
        });
    }
  };
  const bodyfatOptions: OptionType[] = [
    { value: "low", label: "Låg" },
    { value: "normal", label: "Normal" },
    { value: "high", label: "Hög" },
  ];

  /**
   * Updates a single field in `individual`.
   *
   * @param field field name to update
   * @param value the new value of the field
   */
  const updateField = <T extends keyof Individual>(
    field: T,
    value: Individual[T]
  ) => {
    WHindividual && setWHindividual({ ...WHindividual, [field]: value });
    console.debug("Update Field", field, "value", value);
    console.debug("Individual", WHindividual);
  };

  /**
   * Compares the individual object that is supposed to be saved with the version of it
   * that's currently in the database.
   * @param newInd individual data with user input
   * @param oldInd individual in the database
   * @returns true if they are equal
   */
  const isEqual = (newInd: Individual, oldInd: Individual) => {
    let areEqual = true;
    const keys = Object.keys(newInd);
    keys.forEach((key: string) => {
      if (newInd[key] !== oldInd[key]) {
        areEqual = false;
      }
    });
    return areEqual;
  };

  const isDateOkay = (date: string) => {
    const recordDate = new Date(date).getTime();
    const today = new Date().getTime();
    if (today - recordDate < 0) {
      userMessage("Ange ett datum som inte ligger i framtiden.", "warning");
      return false;
    } else {
      return true;
    }
  };
  const handleNewWeight = () => {
    if (!weightDate) {
      userMessage("Ange ett datum för viktmätningen", "warning");
      return;
    }
    if (weight && weight <= 0) {
      userMessage("Ange en vikt större än 0.", "warning");
      return;
    }
    if (!isDateOkay(weightDate)) {
      return;
    }

    // update the local individual state
    updateField("weights", [
      ...WHindividual?.weights,
      { date: weightDate, weight: weight },
    ]);

    const newWeightRecord = {
      id: WHindividual?.id,
      number: WHindividual?.number,
      herd: WHindividual?.herd,
      weights: [...WHindividual?.weights, { date: weightDate, weight: weight }],
    };

    // send weight record to the backend
    patch("/api/individual", newWeightRecord)
      .then((json) => {
        if (json.status == "success") {
          userMessage("Viktmätningen har lagts till.", "success");
          return;
        } else {
          userMessage("Något gick fel.", "error");
        }
      })
      .then(() => {
        setWeight(0);
        setWeightDate(null);
      })
      .catch((error) => {
        userMessage("Vi har tekniska problem. Försök igen senare.", "error");
      });
  };

  const handleNewBodyfat = () => {
    if (!bodyfatDate) {
      userMessage("Ange ett datum för hullmätningen", "warning");
      return;
    }
    if (!isDateOkay(bodyfatDate)) {
      return;
    }

    // update the local individual state
    updateField("bodyfat", [
      ...WHindividual?.bodyfat,
      { date: bodyfatDate, bodyfat: bodyfat as BodyFat },
    ]);

    const newBodyfatRecord = {
      id: WHindividual?.id,
      number: WHindividual?.number,
      herd: WHindividual?.herd,
      bodyfat: [
        ...WHindividual?.bodyfat,
        { date: bodyfatDate, bodyfat: bodyfat as BodyFat },
      ],
    };

    // send bodyfat record to the backend
    patch("/api/individual", newBodyfatRecord)
      .then((json) => {
        if (json.status == "success") {
          userMessage("Hullmätningen har lagts till.", "success");
          return;
        } else {
          userMessage("Något gick fel.", "error");
        }
      })
      .then(() => {
        setBodyfat("normal");
        setBodyfatDate(null);
      })
      .catch((error) => {
        userMessage("Vi har tekniska problem. Försök igen senare.", "error");
      });
  };

  const getMinDate = () => {
    const lastTracking = new Date(WHindividual.herd_tracking[0].date);
    const earliest = new Date(lastTracking.getTime() + 1000 * 60 * 60 * 24);
    return earliest;
  };
  const minDate: Date = getMinDate();

  return (
    <div className={style.popupContainer}>
      <h2>
        Rapportera vikt och hull för {WHindividual.name} {WHindividual.number}
      </h2>

      <>
        <div className={style.textContainer}>
          <Typography variant="body1" className={style.infoText}>
            För årsrapporten vill vi gärna att du loggar vikt och hull bedömning
            du behöver göra det en gång per år men kan också logga för din egen
            del när du vill <br></br> Utgår från datumet du väljer nedan.
          </Typography>
        </div>
        <div classNamdfe={style.formContainer}>
          <MuiPickersUtilsProvider utils={DateFnsUtils}>
            <div className={style.titleText}>Mått</div>
            <h3>Vikter</h3>
            <ul>
              {
                // jscpd:ignore-start

                WHindividual.weights &&
                  WHindividual.weights.map((w: DateWeight, i: number) => (
                    <li key={i} className={style.measureList}>
                      {`${asLocale(w.date)} - ${w.weight} kg`}
                      <span className={style.listButton}>
                        [
                        <a
                          className={style.scriptLink}
                          onClick={() => removeMeasure("weights", i)}
                        >
                          Radera
                        </a>
                        ]
                      </span>
                    </li>
                  ))
              }
            </ul>
            <div className="flexRow">
              <KeyboardDatePicker
                autoOk
                variant="inline"
                className="control"
                inputVariant={inputVariant}
                label="Mätningsdatum"
                format={dateFormat}
                value={weightDate}
                InputLabelProps={{
                  shrink: true,
                }}
                onChange={
                  (date, value) => {
                    value && setWeightDate(value);
                  }

                  // jscpd:ignore-end
                }
              />
              <TextField
                label="Vikt"
                className="control"
                value={weight}
                variant={inputVariant}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">Kg</InputAdornment>
                  ),
                  inputProps: { min: 0 },
                  inputComponent: NumberFormatCustom as any,
                }}
                InputLabelProps={{
                  shrink: true,
                }}
                onChange={(e: any) => {
                  setWeight(+e.target.value);
                }}
              />
            </div>

            <Button
              variant="contained"
              color="primary"
              className="control controlWidth"
              onClick={() => handleNewWeight()}
            >
              {"Lägg till viktmätning"}
            </Button>
            <h3>Hull</h3>
            <ul>
              {
                // jscpd:ignore-start

                WHindividual.bodyfat &&
                  WHindividual.bodyfat.map((b: DateBodyfat, i: number) => (
                    <li key={i} className={style.measureList}>
                      {`${asLocale(b.date)} - ${translateBodyfat.get(
                        b.bodyfat
                      )}`}
                      <span className={style.listButton}>
                        [
                        <a
                          className={style.scriptLink}
                          onClick={() => removeMeasure("bodyfat", i)}
                        >
                          Radera
                        </a>
                        ]
                      </span>
                    </li>
                  ))
              }
            </ul>
            <div className="flexRow">
              <KeyboardDatePicker
                autoOk
                variant="inline"
                className="control"
                inputVariant={inputVariant}
                label="Mätningsdatum"
                format={dateFormat}
                value={bodyfatDate}
                InputLabelProps={{
                  shrink: true,
                }}
                onChange={
                  (date, value) => {
                    value && setBodyfatDate(value);
                  }

                  // jscpd:ignore-end
                }
              />
              <Autocomplete
                options={bodyfatOptions ?? []}
                value={
                  bodyfatOptions.find((option) => option.value == bodyfat) ??
                  bodyfatOptions[1]
                }
                className="control controlWidth"
                getOptionLabel={(option: OptionType) => option.label}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Hull"
                    className="control controlWidth"
                    variant={inputVariant}
                    margin="normal"
                  />
                )}
                onChange={(event: any, newValue: OptionType | null) => {
                  setBodyfat(newValue?.value ?? "normal");
                }}
              />
            </div>
            <Button
              variant="contained"
              className="controlWidth"
              color="primary"
              onClick={() => {
                handleNewBodyfat();
              }}
            >
              {"Lägg till hullmätning"}
            </Button>
          </MuiPickersUtilsProvider>
        </div>
      </>
    </div>
  );
};
