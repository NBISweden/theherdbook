import React from "react";

import {
  Box,
  Button,
  makeStyles,
  TextField,
  Checkbox,
  FormControlLabel,
} from "@material-ui/core";
import { Autocomplete } from "@material-ui/lab";
import { CheckCircle } from "@material-ui/icons";
import { ExpandMore, ExpandLess } from "@material-ui/icons";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import sv from "date-fns/locale/sv";

import { IndividualForm, FormAction } from "@app/individual_form";
import { HerdView } from "@app/herd_view";
import {
  individualsFromDate,
  toLimitedIndividuals,
  dateFormat,
  Birth,
  Breeding,
  locale,
  activeIndividuals,
  HerdNameID,
  Individual,
  individualLabel,
  inputVariant,
  LimitedBreeding,
  LimitedHerd,
  LimitedIndividual,
  Genebank,
  herdLabel,
  OptionType,
} from "@app/data_context_global";
import { useMessageContext } from "@app/message_context";
import { get, post } from "@app/communication";
import { useUserContext } from "./user_context";
import { useDataContext } from "./data_context";
import { useBreedingContext } from "./breeding_context";
import { IndividualSellingForm } from "./individual_sellingform";

const useStyles = makeStyles({
  paneControls: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: "0 3em 3em 6em ",
    width: "310px",
  },
  control: {
    margin: "0.3em",
    minWidth: "18em",
    paddingRight: "0.5em",
  },
  ancestorBox: {
    display: "flex",
    flexDirection: "column",
    margin: "2em 0 0 0",
    padding: "0 3em",
  },
  ancestorInput: {
    margin: "1em 0",
  },
  datum: {
    width: "70%",
    height: "100%",
    padding: "10px",
    paddingBottom: "20px",
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "left",
  },
  inputWrapper: {
    maxWidth: "1280px",
  },
  inputBox: {
    display: "flex",
    flexWrap: "wrap",
    flexDirection: "column",
    width: "100%",
    padding: "3em",
  },
  responseBox: {
    maxWidth: "65em",
    padding: "1em",
    margin: "2em 0",
    flexBasis: "40em",
  },
  successIcon: {
    fill: "#388e3c", // same as success.dark in the default theme
    marginLeft: "0.5em",
  },
  boxTitle: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    padding: "1em 3em",
    minWidth: "30em",
  },
  bottomBox: {
    margin: "3em",
  },
  sellingTitle: {
    marginTop: "2em",
    marginBottom: "0",
  },
});

export function IndividualAdd({
  herdId,
  genebank,
}: {
  herdId?: string;
  genebank?: Genebank;
}) {
  const [individual, setIndividual] = React.useState({} as Individual);
  const [currentGenebank, setCurrentGenebank] = React.useState(
    undefined as Genebank | undefined
  );
  const [showFromDateFilter, setShowFromDateFilter] = React.useState(false);
  const [success, setSuccess] = React.useState(false as boolean);
  const [newSibling, setSibling] = React.useState(false as boolean);
  // states to handle the Autocompletes rerendering
  const [herdKey, setHerdKey] = React.useState(0 as number);
  const [colorKey, setColorKey] = React.useState(0 as number);
  // Error states for mandatory form fields
  const [numberError, setNumberError] = React.useState(false as boolean);
  const [colorError, setColorError] = React.useState(false as boolean);
  const [sexError, setSexError] = React.useState(false as boolean);
  const [birthDateError, setBirthDateError] = React.useState(false as boolean);
  const [litterError, setLitterError] = React.useState(false as boolean);
  const [litterError6w, setLitterError6w] = React.useState(false as boolean);
  let defaultDate = new Date();
  defaultDate.setFullYear(defaultDate.getFullYear() - 10);
  const [fromDate, setFromDate] = React.useState(defaultDate as Date);
  const [showDead, setshowDead] = React.useState(false as boolean);
  const [activeMalesLimited, setActiveMalesLimited] = React.useState([]);
  const [activeFemalesLimited, setActiveFemalesLimited] = React.useState([]);
  const [breedingMatch, setBreedingMatch] = React.useState(
    undefined as Breeding | undefined
  );
  const { userMessage, popup } = useMessageContext();
  const { user } = useUserContext();
  const is_admin = !!(user?.is_manager || user?.is_admin);
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
    modifyBreedingUpdates,
  } = useBreedingContext();
  const style = useStyles();

  /**
   * Updates a single field in `individual`.
   *
   * @param field field name to update
   * @param value the new value of the field
   */
  const handleUpdateIndividual = <T extends keyof Individual>(
    field: T,
    value: Individual[T]
  ) => {
    individual && setIndividual({ ...individual, [field]: value });
  };

  React.useEffect(() => {
    setActiveFemalesLimited(
      toLimitedIndividuals(
        individualsFromDate(
          currentGenebank,
          "female",
          is_admin ? fromDate : new Date(1900, 1, 1),
          herdId,
          showDead
        )
      )
    );
    setActiveMalesLimited(
      toLimitedIndividuals(
        individualsFromDate(
          currentGenebank,
          "male",
          fromDate,
          undefined,
          showDead
        )
      )
    );
  }, [fromDate, currentGenebank, herdId, showDead]);

  React.useEffect(() => {
    if (!!genebank && !success && !newSibling) {
      setCurrentGenebank(genebank);
      setIndividual({
        ...individual,
        mother: null,
        father: null,
        origin_herd: null,
        number: null,
      });
    } else {
      if (!!herdId) {
        const originGenebank = genebanks.find((g) =>
          g.herds.some((herd) => herd.herd == herdId)
        );
        setCurrentGenebank(originGenebank);
      } else {
        const originGenebank = genebanks.find((g) =>
          g.herds.some((herd) => herd.herd == individual?.origin_herd?.herd)
        );
        setCurrentGenebank(originGenebank);
      }
    }
    if (herdId) {
      handleUpdateIndividual("herd", herdId); // backend right now requires a string for field herd. Inconsistent with other database entries.
    }
  }, [herdId, genebank]);

  // add the field genebank to the individual to get the color options in the form
  // make sure it also is triggered after resetBlank has been called
  React.useEffect(() => {
    if (currentGenebank) {
      handleUpdateIndividual("genebank", currentGenebank.name);
    }
  }, [currentGenebank]);

  // remove error layout from input fields when user has added an input
  React.useEffect(() => {
    if (individual?.color) {
      setColorError(false);
    }
    if (individual?.number) {
      setNumberError(false);
    }
    if (individual?.sex) {
      setSexError(false);
    }
    if (individual?.birth_date) {
      setBirthDateError(false);
    }
    if (individual?.litter_size) {
      setLitterError(false);
    }
    if (individual?.litter_size6w) {
      setLitterError6w(false);
    }
  }, [
    individual?.color,
    individual?.number,
    individual?.sex,
    individual?.birth_date,
    individual?.litter_size,
    individual?.litter_size6w,
  ]);
  //Searches for existing breedings and update form with data from that found breeding
  //Suggest the next individual number
  React.useEffect(() => {
    const getBreeding = async () => {
      if (
        individual?.birth_date &&
        individual?.father &&
        individual?.mother &&
        individual?.origin_herd
      ) {
        let limitedBreedingInput: LimitedBreeding = {
          birth_date: individual.birth_date,
          herd: individual.origin_herd.herd,
          breeding_herd: individual.origin_herd.herd,
          mother: individual.mother.number,
          father: individual.father.number,
        };
        const Breedingmatch = await post(
          `/api/breeding/${individual.origin_herd.herd}`,
          limitedBreedingInput
        );
        setBreedingMatch(Breedingmatch.breedings);
        if (Breedingmatch.breedings != null) {
          userMessage(
            `Hittade ett befintligt parningstillfälle med parningsdatum : ${Breedingmatch.breedings.breed_date}. Kontrollera att uppgifterna stämmer`,
            "success"
          );
          if (individual.birth_date != Breedingmatch.breedings.birth_date) {
            userMessage(
              `Födelsedatumet du har angett: ${individual.birth_date} skiljer sig från det existerande: ${Breedingmatch.breedings.birth_date}. Lägger du till en ny kanin med kommer födelsedatumet att uppdateras.`,
              "warning"
            );
          }
          let BreedHerd: LimitedHerd = await get(
            `/api/herd/${Breedingmatch.breedings.breeding_herd}`
          );
          const IndNumber = await post(
            `/api/breeding/nextind/`,
            Breedingmatch.breedings
          );
          setIndividual({
            ...individual,
            origin_herd: BreedHerd,
            number: IndNumber,
            litter_size: Breedingmatch.breedings.litter_size,
            litter_size6w: Breedingmatch.breedings.litter_size6w,
          });
        } else {
          userMessage(
            `Hittade inget befintligt parningstillfälle kommer skapa ett nytt!`,
            "info"
          );
          const IndNumber1 = await post(
            `/api/breeding/nextind/`,
            limitedBreedingInput
          );
          setIndividual({ ...individual, number: IndNumber1 });
        }
      }
    };
    getBreeding();
  }, [individual?.birth_date, individual?.father, individual?.mother]);

  const validateUserInput = (individual: Individual) => {
    setSuccess(false);
    let error: boolean = false;
    if (!individual?.number) {
      setNumberError(true);
      error = true;
    }
    if (!individual?.color) {
      setColorError(true);
      error = true;
    }
    if (!individual?.sex) {
      setSexError(true);
      error = true;
    }
    if (!individual?.birth_date) {
      setBirthDateError(true);
      error = true;
    }
    if (!individual?.litter_size) {
      setLitterError(true);
      error = true;
    }
    if (!individual?.litter_size6w) {
      setLitterError6w(true);
      error = true;
    }
    if (error) {
      userMessage("Fyll i alla obligatoriska fält.", "warning");
      return false;
    }
    if (!/^([a-zA-Z][0-9]+-[0-9][0-9][0-9][0-9]+)$/.test(individual.number)) {
      userMessage("Individens nummer har fel format.", "warning");
      return false;
    }
    if (individual.litter_size <= 0) {
      userMessage("Kullstorleken måste vara störren än 0.", "warning");
      return false;
    }
    if (individual.litter_size6w < 1) {
      userMessage(
        "Det borde vara minst en levande kvar efter 6 veckor",
        "warning"
      );
      return false;
    }
    if (individual.litter_size6w > individual.litter_size) {
      userMessage(
        "Kullstorleken efter 6 veckor får inte vara större än kullstorleken vid födseln.",
        "warning"
      );
      return false;
    }
    if (individual?.selling_date < individual?.birth_date) {
      userMessage(
        "Säljdatum får inte vara tidigare än födelsedatum",
        "warning"
      );
      return false;
    }
    return true;
  };

  const getParentHerd = async (individualNumber: string) => {
    const parent: Individual = await get(`/api/individual/${individualNumber}`);
    const herd: string = parent.herd.herd;
    if (!herd) {
      userMessage("Något gick fel.", "error");
      return;
    }
    return herd;
  };

  const getOriginHerd = async (individual: Individual) => {
    const originHerdNumber: string = individual.number.split("-")[0];
    if (herdId && herdId !== originHerdNumber) {
      userMessage(
        "Du kan bara lägga till individer som har fötts i din besättning.",
        "warning"
      );
      return;
    }
    const motherHerd = await getParentHerd(individual.mother.number);
    const fatherHerd = await getParentHerd(individual.father.number);
    if (originHerdNumber !== motherHerd && originHerdNumber !== fatherHerd) {
      userMessage(
        `Individens nummer ska börja med antingen moderns eller faderns nuvarande besättning. 
         I det här fallet ${motherHerd} eller ${fatherHerd}.`,
        "warning"
      );
      return;
    }
    const originHerd = currentGenebank?.herds.find(
      (herd: LimitedHerd) => herd.herd == originHerdNumber
    );
    if (!(originHerd && originHerd.herd && originHerd.id)) {
      userMessage(
        "Första delen i individens nummer motsvarar ingen besättning.",
        "warning"
      );
      return;
    }
    const originHerdNameID: HerdNameID = {
      herd_name: originHerd.herd_name ?? null,
      herd: originHerd.herd,
      id: originHerd.id,
    };
    return originHerdNameID;
  };

  const getBreedingDate = (birthDate: string) => {
    let breedingString = "";
    let breedingDate: Date | number = new Date(birthDate);
    breedingDate.setDate(breedingDate.getDate() - 30);
    breedingString = breedingDate.toLocaleDateString(locale);
    return breedingString;
  };

  const getBreedingId = async (individual: Individual) => {
    const breedingDate = getBreedingDate(individual.birth_date);

    let breedingInput: Breeding = {
      breed_notes: "",
      breeding_herd: individual.origin_herd?.herd,
      father: individual.father.number,
      mother: individual.mother.number,
      birth_date: individual.birth_date,
      birth_notes: "",
      litter_size: individual.litter_size,
      litter_size6w: individual.litter_size6w,
    };

    let limitedBreedingInput: LimitedBreeding = {
      date: breedingDate,
      breeding_herd: individual.origin_herd.herd,
      mother: individual.mother.number,
      father: individual.father.number,
    };

    // Check if there already is a breeding
    //const herdBreedings = await get(`/api/breeding/${herdId}`);
    //'const breedingMatch = await findBreedingMatch(
    //  breedingInput,
    //  herdBreedings
    //);

    // If there is a breeding, update it
    if (breedingMatch) {
      const modifiedBreedingUpdates = modifyBreedingUpdates(
        breedingInput,
        breedingMatch
      );
      const updatedBreeding = await updateBreeding(modifiedBreedingUpdates);
      if (!!updatedBreeding) {
        return modifiedBreedingUpdates.id;
      }
    }

    // If there is no breeding, create breeding and birth
    if (!breedingMatch) {
      const newBreeding = await createBreeding(limitedBreedingInput);
      if (!newBreeding) {
        return;
      }
      const birthData: Birth = {
        date: individual.birth_date,
        litter_size: individual.litter_size,
        litter_size6w: individual.litter_size6w,
        id: newBreeding.breeding_id,
      };
      const newBirth = await createBirth(birthData);
      if (!!newBirth) {
        return newBreeding.breeding_id;
      }
    }
  };

  const createIndividual = (individual: Individual) => {
    post("/api/individual", individual).then(
      (json) => {
        switch (json.status) {
          case "success": {
            if (herdId) {
              userMessage(
                "Kaninen har lagts till i din besättning.",
                "success"
              );
              if (herdListener == individual.herd) {
                setHerdChangeListener(herdChangeListener + 1);
                setSuccess(true);
              }
            } else {
              userMessage("Kaninen har lagts till!", "success");
              loadData(["genebanks"]);
              setSuccess(true);
            }
            break;
          }
          case "error": {
            switch (json.message) {
              case "Not logged in": {
                userMessage("Du är inte inloggad.", "error");
                break;
              }
              case "Individual must have a valid herd": {
                userMessage("Besättningen kunde inte hittas.", "error");
                break;
              }
              case "Forbidden": {
                userMessage(
                  "Du saknar rättigheterna för att lägga till en kanin i besättningen.",
                  "error"
                );
                break;
              }
              case "Individual number already exists": {
                userMessage(
                  "Det finns redan en kanin med detta nummer i databasen.",
                  "error"
                );
                break;
              }
              default: {
                userMessage(
                  "Något gick fel. Det här borde inte hända.",
                  "error"
                );
              }
            }
          }
        }
      },
      (error) => {
        userMessage("Något gick fel.", "error");
      }
    );
  };

  const onSaveIndividual = async (individual: Individual) => {
    let newIndividual = individual;
    const inputValid = validateUserInput(individual);
    if (!inputValid) {
      return;
    }

    const originHerd = await getOriginHerd(individual);
    if (!originHerd) {
      return;
    }
    newIndividual = {
      ...newIndividual,
      origin_herd: originHerd,
    };

    // if the user hasn't put in a current herd, use origin_herd as the current herd
    if (!newIndividual.herd) {
      newIndividual = {
        ...newIndividual,
        herd: originHerd.herd,
      };
    }

    const breedingId = await getBreedingId(newIndividual);
    if (!breedingId) {
      return;
    }

    newIndividual = {
      ...newIndividual,
      breeding: breedingId,
    };
    createIndividual(newIndividual);
  };

  const resetBlank = () => {
    // change the keys to something new to cause rerender of the Autocompletes
    setHerdKey(Date.now());
    setColorKey(Date.now());
    setIndividual({} as Individual);
    setSuccess(false);
  };

  const resetSibling = () => {
    const numberParts: string[] = individual?.number?.split("-");
    const sibling: Individual = {
      number: numberParts
        ? numberParts[0] +
          "-" +
          numberParts[1][0] +
          numberParts[1][1] +
          numberParts[1][2]
        : null,
      origin_herd: individual.origin_herd,
      birth_date: individual.birth_date,
      mother: individual.mother,
      father: individual.father,
      litter_size: individual.litter_size,
      litter_size6w: individual.litter_size6w,
      genebank: individual.genebank,
    };
    setIndividual(sibling);
    setSibling(true);
    setSuccess(false);
  };

  return (
    <>
      <div className={style.inputWrapper}>
        <div className={style.inputBox}>
          <h1>Registrera en ny kanin</h1>
          <div className={style.ancestorBox}>
            <h2>Lägg till härstamningen</h2>
            <div className={style.datum}>
              <Button
                color="primary"
                onClick={() => setShowFromDateFilter(!showFromDateFilter)}
              >
                {showFromDateFilter == false
                  ? is_admin
                    ? "Filtrera kaniner"
                    : "Filtrera hanar"
                  : "Dölj"}
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
            <Autocomplete
              className={style.ancestorInput}
              options={activeFemalesLimited}
              getOptionLabel={(option: LimitedIndividual) =>
                individualLabel(option)
              }
              value={individual.mother ?? null}
              onChange={(event, newValue) =>
                handleUpdateIndividual("mother", newValue)
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Välj mor"
                  variant={inputVariant}
                />
              )}
            />
            <div className={style.lineBreak}></div>
            <Autocomplete
              className={style.ancestorInput}
              options={activeMalesLimited}
              getOptionLabel={(option: LimitedIndividual) =>
                individualLabel(option)
              }
              value={individual.father ?? null}
              onChange={(event, newValue) =>
                handleUpdateIndividual("father", newValue)
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Välj far"
                  variant={inputVariant}
                />
              )}
            />
          </div>
          <div className={style.ancestorBox}>
            <h2>Fyll i uppgifterna om kaninen</h2>
            <IndividualForm
              genebank={currentGenebank}
              onUpdateIndividual={handleUpdateIndividual}
              individual={individual}
              formAction={FormAction.AddIndividual}
              colorKey={colorKey}
              colorError={colorError}
              numberError={numberError}
              sexError={sexError}
              birthDateError={birthDateError}
              litterError={litterError}
              litterError6w={litterError6w}
            />
          </div>
          {!herdId && (
            <>
              <div className={style.ancestorBox}>
                <h2 className={style.sellingTitle}>
                  Fyll i bara om kaninen har sålts
                </h2>
                <IndividualSellingForm
                  individual={individual}
                  herdOptions={genebank ? genebank.herds : []}
                  herdKey={herdKey}
                  onUpdateIndividual={handleUpdateIndividual}
                />
              </div>
            </>
          )}
          {success && (
            <>
              <div className={style.bottomBox}>
                <Box
                  border={3}
                  borderRadius={8}
                  borderColor="success.light"
                  className={style.responseBox}
                >
                  <div className={style.boxTitle}>
                    <h2>Kaninen har lagts till!</h2>
                    <CheckCircle className={style.successIcon} />
                  </div>
                  <div className={style.paneControls}>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={resetBlank}
                    >
                      Ny kanin
                    </Button>
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={resetSibling}
                    >
                      Ny kull-syskon
                    </Button>
                  </div>
                </Box>
              </div>
            </>
          )}
        </div>
        <div className={style.paneControls}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => popup(<HerdView id={herdId} />)}
          >
            Tillbaka
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => onSaveIndividual(individual)}
          >
            Skapa
          </Button>
        </div>
      </div>
    </>
  );
}
