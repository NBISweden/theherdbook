/**
 * @file This file contains the IndividualEdit function. This function allows a
 * user (with the required permissions) to edit an individual given by `id`, or
 * add a new individual if `herdId` is given.
 */
import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import { get, patch } from "@app/communication";
import {
  asLocale,
  BodyFat,
  DateBodyfat,
  dateFormat,
  DateWeight,
  Individual,
  individualLabel,
  inputVariant,
  LimitedIndividual,
  OptionType,
  ServerMessage,
} from "@app/data_context_global";
import { useMessageContext } from "@app/message_context";
import {
  Button,
  CircularProgress,
  InputAdornment,
  TextField,
} from "@material-ui/core";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import { useUserContext } from "@app/user_context";
import { useDataContext } from "@app/data_context";
import { Autocomplete } from "@material-ui/lab";
import NumberFormat from "react-number-format";

const useStyles = makeStyles({
  loading: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  form: {
    display: "flex",
    height: "100%",
    overflow: "hidden",
    flexDirection: "column",
    width: "95%",
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
  flexColumn: {
    display: "flex",
    flexDirection: "column",
  },
  flexRow: {
    display: "flex",
    flexDirection: "row",
  },
  control: {
    margin: "5px",
    minWidth: "195px",
    paddingRight: "5px",
  },
  wideControl: {
    margin: "5px",
    minWidth: "195px",
    width: "100%",
    paddingRight: "5px",
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
  formPane: {
    borderRight: "none",
    minWidth: "410px",
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
  adminPane: {
    width: "100%",
    padding: "15px 0 5px 10px",
    border: "1px solid lightgrey",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    background:
      "repeating-linear-gradient(135deg, white, white 25px, rgba(0,0,0,0.05) 25px, rgba(0,0,0,0.05) 50px )",
  },
  titleText: {
    width: "100%",
    borderBottom: "1px solid lightgrey",
    padding: "0 20px",
    fontSize: "2.3em",
  },
  paneTitle: {
    margin: "5px",
  },
  paneControls: {
    display: "flex",
    flexDirection: "row",
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

/**
 * This function allows a user (with the required permissions) to edit an
 * individual given by `id`, or add a new individual if no `id` is given.
 */
export function IndividualEdit({ id }: { id: string | undefined }) {
  const [individual, setIndividual] = React.useState(
    undefined as Individual | undefined
  );
  const [certType, setCertType] = React.useState("unknown" as string);
  const [bodyfat, setBodyfat] = React.useState("normal");
  const [weight, setWeight] = React.useState(null as number | null);
  const [bodyfatDate, setBodyfatDate] = React.useState(null as string | null);
  const [weightDate, setWeightDate] = React.useState(null as string | null);
  const { user } = useUserContext();
  const { genebanks, colors } = useDataContext();
  const { userMessage } = useMessageContext();
  const canManage: boolean = React.useMemo(() => {
    return user?.canEdit(individual?.genebank);
  }, [user, individual]);
  const style = useStyles();

  const certTypeOptions: OptionType[] = [
    { value: "digital", label: "Digital" },
    { value: "paper", label: "Papper" },
    { value: "none", label: "Inget certifikat" },
    { value: "unknown", label: "Okänt" },
  ];

  const sexOptions = [
    { value: "female", label: "Hona" },
    { value: "male", label: "Hane" },
    { value: "unknown", label: "Okänd" },
  ];
  const bodyfatOptions: OptionType[] = [
    { value: "low", label: "Låg" },
    { value: "normal", label: "Normal" },
    { value: "high", label: "Hög" },
  ];
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
  const genebankIndividuals = React.useMemo(() => {
    if (individual && colors) {
      const genebank = genebanks.find((g) => g.name == individual.genebank);
      if (genebank) {
        return genebank.individuals;
      }
    }
    return [];
  }, [genebanks, individual]);
  const motherOptions: OptionType[] = React.useMemo(() => {
    return genebankIndividuals
      .filter((i) => i.sex == "female")
      .map((i) => {
        return { value: i.number, label: individualLabel(i) };
      });
  }, [genebankIndividuals]);
  const fatherOptions: OptionType[] = React.useMemo(() => {
    return genebankIndividuals
      .filter((i) => i.sex == "male")
      .map((i) => {
        return { value: i.number, label: individualLabel(i) };
      });
  }, [genebankIndividuals]);

  const translateBodyfat: Map<string, string> = new Map([
    ["low", "låg"],
    ["normal", "normal"],
    ["high", "hög"],
  ]);

  const asIndividual = (
    number: string | undefined
  ): LimitedIndividual | null => {
    if (number === null) {
      return null;
    }
    const individual = genebankIndividuals.find((i) => i.number == number);
    return individual ? individual : null;
  };

  const removeMeasure = (field: "weights" | "bodyfat", index: number) => {
    console.debug("Deleting ", field, "number", index);
    if (individual && individual[field]) {
      individual[field].splice(index, 1);
      updateField(field, individual[field]);
    }
  };

  /**
   * Fetch individual data from the backend
   * and set certificate type according to individual data
   */
  React.useEffect(() => {
    id
      ? get(`/api/individual/${id}`).then(
          (data: Individual) => {
            setIndividual(data);
            if (!!data?.certificate) {
              setCertType("paper");
            } else if (!!data?.digital_certificate) {
              setCertType("digital");
            } else {
              setCertType("none");
            }
          },
          (error) => {
            userMessage(error, "error");
          }
        )
      : userMessage("Något gick fel.", "error");
  }, [id]);

  const onCertTypeChange = (type: string) => {
    setCertType(type);
  };

  const handleCertNumber = (number: string) => {
    if (certType == "paper") {
      updateField("certificate", number);
    } else if (certType == "digital") {
      updateField("digital_certificate", number);
    }
  };

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
    individual && setIndividual({ ...individual, [field]: value });
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
      ...individual?.weights,
      { date: weightDate, weight: weight },
    ]);

    const newWeightRecord = {
      number: individual?.number,
      herd: individual?.herd,
      weights: [...individual?.weights, { date: weightDate, weight: weight }],
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
        setWeight(null);
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
      ...individual?.bodyfat,
      { date: bodyfatDate, bodyfat: bodyfat as BodyFat },
    ]);

    const newBodyfatRecord = {
      number: individual?.number,
      herd: individual?.herd,
      bodyfat: [
        ...individual?.bodyfat,
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

  /**
   * Sends a request to save the current data in the database. Returns a
   * ServerMessage.
   *
   * @param data The Individual data to save.
   */
  const save = (data: Individual) => {
    const postData = { ...data };
    patch("/api/individual", postData).then(
      (retval: ServerMessage) => {
        switch (retval.status) {
          case "success":
            userMessage(retval.message ?? "Individual updated", "success");
            break;
          default:
            userMessage(retval.message ?? "something went wrong", "error");
        }
      },
      (error) => {
        userMessage("" + error, "error");
        console.error(error);
      }
    );
  };

  // jscpd:ignore-start

  return (
    <>
      {individual ? (
        <div className={style.form}>
          <MuiPickersUtilsProvider utils={DateFnsUtils}>
            <div className={style.flexRowOrColumn}>
              <div className={style.formPane}>
                <div className={style.titleText}>Redigera Individ</div>
                <div className={style.adminPane}>
                  <div className={style.flexColumn}>
                    <p className={style.paneTitle}>
                      Kan endast ändras av genbanksansvarig
                    </p>
                    <TextField
                      disabled={!canManage}
                      label="Nummer"
                      className={style.control}
                      variant={inputVariant}
                      value={individual.number ?? ""}
                      onChange={(event) => {
                        updateField("number", event.currentTarget.value);
                      }}
                    />
                  </div>
                  <div className={style.flexRow}>
                    <Autocomplete
                      disabled={!canManage}
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
                    <TextField
                      disabled={!canManage}
                      label="Certifikatnummer"
                      placeholder={
                        certType == "unknown" || certType == "none"
                          ? "Välj certifikattyp först."
                          : ""
                      }
                      className={style.control}
                      variant={inputVariant}
                      value={
                        individual.certificate ??
                        individual.digital_certificate ??
                        ""
                      }
                      onChange={(event) => {
                        handleCertNumber(event.currentTarget.value);
                      }}
                    />
                  </div>
                </div>
                <TextField
                  label="Namn"
                  className={style.control}
                  variant={inputVariant}
                  value={individual.name ?? ""}
                  onChange={(event) => {
                    updateField("name", event.currentTarget.value);
                  }}
                />
                <div className={style.flexRow}>
                  <Autocomplete
                    options={sexOptions ?? []}
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
                      />
                    )}
                    onChange={(event: any, newValue: OptionType | null) => {
                      updateField("sex", newValue?.value ?? "");
                    }}
                  />

                  <KeyboardDatePicker
                    autoOk
                    variant="inline"
                    className={style.control}
                    inputVariant={inputVariant}
                    label="Födelsedatum"
                    format={dateFormat}
                    value={individual.birth_date ?? ""}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    onChange={(date, value) => {
                      value && updateField("birth_date", value);
                    }}
                  />
                </div>
                <div className={style.flexRow}>
                  <Autocomplete
                    options={motherOptions ?? []}
                    value={
                      motherOptions.find(
                        (option) => option.value == individual?.mother?.number
                      ) ?? motherOptions[0]
                    }
                    getOptionLabel={(option: OptionType) => option.label}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Mor"
                        className={style.control}
                        variant={inputVariant}
                        margin="normal"
                      />
                    )}
                    onChange={(event: any, newValue: OptionType | null) => {
                      updateField("mother", asIndividual(newValue?.value));
                    }}
                  />
                  <Autocomplete
                    options={fatherOptions ?? []}
                    value={
                      fatherOptions.find(
                        (option) => option.value == individual?.father?.number
                      ) ?? fatherOptions[0]
                    }
                    getOptionLabel={(option: OptionType) => option.label}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Far"
                        className={style.control}
                        variant={inputVariant}
                        margin="normal"
                      />
                    )}
                    onChange={(event: any, newValue: OptionType | null) => {
                      updateField("father", asIndividual(newValue?.value));
                    }}
                  />
                </div>
                <div className={style.flexRow}>
                  <Autocomplete
                    options={colorOptions ?? []}
                    value={
                      colorOptions.find(
                        (option) => option.value == individual.color
                      ) ?? colorOptions[0]
                    }
                    getOptionLabel={(option: OptionType) => option.label}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Färg"
                        className={style.control}
                        variant={inputVariant}
                        margin="normal"
                      />
                    )}
                    onChange={(event: any, newValue: OptionType | null) => {
                      updateField("color", newValue?.value ?? "");
                    }}
                  />
                  <TextField
                    label="Färgantecking"
                    variant={inputVariant}
                    className={style.control}
                    multiline
                    rows={3}
                    value={individual.color_note ?? ""}
                    onChange={(event) => {
                      updateField("color_note", event.currentTarget.value);
                    }}
                  />
                </div>
                <TextField
                  label="Anteckningar"
                  variant={inputVariant}
                  className={style.wideControl}
                  multiline
                  rows={4}
                  value={individual.notes ?? ""}
                  onChange={(event) => {
                    updateField("notes", event.currentTarget.value);
                  }}
                />
              </div>
              <div className={style.formPane}>
                <div className={style.titleText}>Mått</div>
                <h3>Vikter</h3>
                <ul>
                  {
                    // jscpd:ignore-start

                    individual.weights &&
                      individual.weights.map((w: DateWeight, i: number) => (
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
                <div className={style.flexRow}>
                  <KeyboardDatePicker
                    autoOk
                    variant="inline"
                    className={style.control}
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
                    className={style.control}
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
                  onClick={() => handleNewWeight()}
                >
                  {"Lägg till viktmätning"}
                </Button>
                <h3>Hull</h3>
                <ul>
                  {
                    // jscpd:ignore-start

                    individual.bodyfat &&
                      individual.bodyfat.map((b: DateBodyfat, i: number) => (
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
                <div className={style.flexRow}>
                  <KeyboardDatePicker
                    autoOk
                    variant="inline"
                    className={style.control}
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
                      bodyfatOptions.find(
                        (option) => option.value == bodyfat
                      ) ?? bodyfatOptions[1]
                    }
                    getOptionLabel={(option: OptionType) => option.label}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Hull"
                        className={style.control}
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
                  color="primary"
                  onClick={() => {
                    handleNewBodyfat();
                  }}
                >
                  {"Lägg till hullmätning"}
                </Button>
              </div>
            </div>
            <div className={style.paneControls}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => save(individual)}
              >
                {"Spara"}
              </Button>
            </div>
          </MuiPickersUtilsProvider>
        </div>
      ) : (
        <div className={style.loading}>
          <h2>Loading data</h2>
          <CircularProgress />
        </div>
      )}
    </>
  );
  // jscpd:ignore-end
}
