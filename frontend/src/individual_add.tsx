import React from "react";

import { Box, Button, makeStyles, TextField } from "@material-ui/core";
import { Autocomplete } from "@material-ui/lab";
import { CheckCircle } from "@material-ui/icons";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";

import { IndividualForm, FormAction } from "@app/individual_form";
import { HerdView } from "@app/herd_view";
import {
  locale,
  activeIndividuals,
  HerdNameID,
  Individual,
  individualLabel,
  inputVariant,
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

const useStyles = makeStyles({
  paneControls: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: "0 3em 3em 3em ",
  },
  control: {
    margin: "0.3em",
    minWidth: "18em",
    paddingRight: "0.5em",
  },
  ancestorBox: {
    display: "flex",
    flexDirection: "column",
    margin: "0 0 4em 0",
    flexBasis: "30em",
    padding: "0 3em",
  },
  ancestorInput: {
    margin: "1em 0",
  },
  inputBox: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "end",
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
});

interface Breeding {
  birth_date: string;
  birth_notes: string | null;
  breed_date: string | null;
  breed_notes: string | null;
  father: string;
  id: number;
  litter_size: number;
  mother: string;
}

export function IndividualAdd({
  herdId,
  genebank,
}: {
  herdId?: string;
  genebank?: Genebank;
}) {
  const [individual, setIndividual] = React.useState({} as Individual);
  const [currentGenebank, setCurrentGenebank] = React.useState(
    genebank ? genebank : (undefined as Genebank | undefined)
  );
  const [herdOptions, setHerdOptions] = React.useState(
    genebank ? genebank.herds : ([] as LimitedHerd[])
  );
  const [success, setSuccess] = React.useState(false as boolean);
  // states to handle the Autocompletes rerendering
  const [herdKey, setHerdKey] = React.useState(0 as number);
  const [colorKey, setColorKey] = React.useState(0 as number);
  const { userMessage, popup } = useMessageContext();
  const { user } = useUserContext();
  const { genebanks } = useDataContext();
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
    // if there is no genebank, generate it from the herdId
    if (!currentGenebank) {
      const originGenebank = genebanks.find((currentGenebank) =>
        currentGenebank.herds.filter((herd) => herd.herd == herdId)
      );
      setCurrentGenebank(originGenebank);
    }
    if (herdId) {
      handleUpdateIndividual("herd", herdId); // backend right now requires a string for field herd. Inconsistent with other database entries.
    }
  }, [herdId]);

  // add the field genebank to the individual to get the color options in the form
  // make sure it also is triggered after resetBlank has been called
  React.useEffect(() => {
    if (!individual.genebank && currentGenebank) {
      handleUpdateIndividual("genebank", currentGenebank.name);
    }
  }, [currentGenebank, individual]);

  const activeFemales: Individual[] = activeIndividuals(
    currentGenebank,
    "female"
  );
  const activeMales: Individual[] = activeIndividuals(currentGenebank, "male");

  const limitedFemales: LimitedIndividual[] = activeFemales.map(
    (individual) => {
      return {
        id: individual.id,
        name: individual.name,
        number: individual.number,
      };
    }
  );

  const limitedMales: LimitedIndividual[] = activeMales.map((individual) => {
    return {
      id: individual.id,
      name: individual.name,
      number: individual.number,
    };
  });

  // creates a breeding event, updates it with birth information and calls the createIndividual function
  const prepareIndividual = async () => {
    if (individual?.number) {
      // first create the individual's origin herd
      let newIndividual = individual;
      const numberParts: string[] = individual.number.split("-");
      if (!herdId || herdId == numberParts[0]) {
        const originHerdNumber: string = numberParts[0];
        const originHerd = currentGenebank?.herds.find(
          (herd: LimitedHerd) => herd.herd == originHerdNumber
        );

        if (originHerd?.herd_name && originHerd.herd && originHerd.id) {
          const originHerdNameID: HerdNameID = {
            herd_name: originHerd.herd_name,
            herd: originHerd.herd,
            id: originHerd.id,
          };
          newIndividual = {
            ...newIndividual,
            origin_herd: originHerdNameID,
          };
          // if the user doesn't input a current herd, use origin_herd as the current herd
          if (!newIndividual.herd) {
            newIndividual = {
              ...newIndividual,
              herd: originHerd.herd,
            };
          }

          if (individual.birth_date) {
            //first generate the breeding date
            let breedingString = "";
            let breedingDate: Date | number = new Date(individual.birth_date);
            breedingDate.setDate(breedingDate.getDate() - 30);
            breedingString = breedingDate.toLocaleDateString(locale);

            let currentBreeding = {
              mother: individual.mother?.number,
              father: individual.father?.number,
              date: breedingString,
            };
            let birth: {
              date: string;
              litter: number | null;
              id: number | null;
            } = {
              date: individual.birth_date,
              litter: individual.litter,
              id: null,
            };

            // Get all the breedings for the individual's origin herd and see if there is a match
            const breedings: { breedings: Breeding[] } = await get(
              `/api/breeding/${originHerd.herd}`
            );
            console.log("breedings sent");
            console.log(breedings.breedings);
            console.log(currentBreeding);
            const breedingMatch = breedings.breedings.find((item) => {
              item.mother == currentBreeding.mother &&
                item.father == currentBreeding.father &&
                item.breed_date == currentBreeding.date;
            });
            console.log("looked for matches");
            console.log(breedingMatch);
            // if there is no match, create a new breeding
            if (!breedingMatch) {
              birth = { ...birth, id: await createBreeding(currentBreeding) };
            } else {
              birth = { ...birth, id: breedingMatch.id };
            }

            // only continue with registering a birth if there is a breeding
            if (!!birth.id) {
              const birthEvent = await post("/api/birth", birth);

              if (
                birthEvent.status == "success" ||
                birthEvent.message.includes("Birth already registered.")
              ) {
                const individualWithBreeding: Individual = {
                  ...newIndividual,
                  breeding: birth.id,
                };
                createIndividual(individualWithBreeding);
              } else if (
                birthEvent.status == "error" &&
                birthEvent.message == "Not logged in"
              ) {
                userMessage(
                  "Du är inte inloggad. Logga in och försök igen.",
                  "warning"
                );
              } else if (
                birthEvent.status == "error" &&
                birthEvent.message.includes("litter size" || "Litter size")
              ) {
                userMessage("Ange en kullstorlek större än null.", "warning");
              } else if (
                birthEvent.status == "error" &&
                birthEvent.message == "Forbidden"
              ) {
                userMessage(
                  "Du har inte behörighet att lägga till den här individen.",
                  "error"
                );
              } else {
                userMessage(
                  // register_birth in data_access.py requires a litter size.
                  // Thus, the field must be mandatory in the form. Okay for föreningen?
                  "Något gick fel. Kolla så att du har lagt till mor, far, kullstorlek och födelsedatum.",
                  "error"
                );
              }
            }
          } else {
            userMessage("Fyll i ett födelsedatum först.", "warning");
          }
        } else {
          userMessage("Individens nummer har inget giltigt format.", "warning");
        }
      } else {
        userMessage(
          "Du kan bara lägga till individer som har fötts i din besättning.",
          "warning"
        );
      }
    } else {
      userMessage("Fyll i ett nummer först.", "warning");
    }
  };

  const createBreeding = async (breedingData: Object) => {
    const breedingEvent = await post("/api/breeding", breedingData);

    if (breedingEvent.status == "success") {
      return breedingEvent.breeding_id;
    } else if (
      breedingEvent.status == "error" &&
      breedingEvent.message == "Not logged in"
    ) {
      userMessage("Du är inte inloggad. Logga in och försök igen.", "warning");
    } else if (
      breedingEvent.status == "error" &&
      breedingEvent.message.includes("Unknown father" || "Unknown mother")
    ) {
      userMessage(
        "En eller båda föräldrar kunde inte hittas. Både mor och far måste vara aktiva individer i databasen.",
        "warning"
      );
    } else if (
      breedingEvent.status == "error" &&
      breedingEvent.massage == "Forbidden"
    ) {
      userMessage(
        "Du har inte behörighet att lägga till den här individen.",
        "error"
      );
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
            } else setSuccess(true);
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
        console.log(error);
        userMessage("Något gick fel.", "error");
      }
    );
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
      number: numberParts ? numberParts[0] + "-" : null,
      name: null,
      herd: {},
      origin_herd: individual.origin_herd,
      birth_date: individual.birth_date,
      mother: individual.mother,
      father: individual.father,
      color: null,
      certificate: null,
      color_note: null,
      litter: individual.litter,
      notes: null,
      herd_tracking: null,
      sex: undefined,
      eye_color: null,
      claw_color: null,
      hair_notes: "",
    };
    setIndividual(sibling);
    setSuccess(false);
  };

  return (
    <>
      <div className={style.inputBox}>
        <IndividualForm
          onUpdateIndividual={handleUpdateIndividual}
          individual={individual}
          canEdit={user?.canEdit(herdId)}
          formAction={FormAction.AddIndividual}
          colorKey={colorKey}
        />
        <div className={style.ancestorBox}>
          <h2>Lägg till härstamningen</h2>
          <Autocomplete
            className={style.ancestorInput}
            options={limitedFemales}
            getOptionLabel={(option: LimitedIndividual) =>
              individualLabel(option)
            }
            value={individual.mother ?? null}
            onChange={(event, newValue) =>
              handleUpdateIndividual("mother", newValue)
            }
            renderInput={(params) => (
              <TextField {...params} label="Välj mor" variant="outlined" />
            )}
          />
          <Autocomplete
            className={style.ancestorInput}
            options={limitedMales}
            getOptionLabel={(option: LimitedIndividual) =>
              individualLabel(option)
            }
            value={individual.father ?? null}
            onChange={(event, newValue) =>
              handleUpdateIndividual("father", newValue)
            }
            renderInput={(params) => (
              <TextField {...params} label="Välj far" variant="outlined" />
            )}
          />
          {!herdId && (
            <>
              <h2>Lägg till nuvarande besättning</h2>
              <Autocomplete
                key={herdKey}
                options={herdOptions}
                value={individual.herd}
                getOptionLabel={(option: LimitedHerd) => herdLabel(option)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Välj besättning"
                    variant="outlined"
                    margin="normal"
                    helperText="Fyll i om kaninen har bytt besättning"
                  />
                )}
                className={style.ancestorInput}
                onChange={(event, newValue) => {
                  newValue && handleUpdateIndividual("herd", newValue.herd);
                }}
              />
              <MuiPickersUtilsProvider utils={DateFnsUtils}>
                <KeyboardDatePicker
                  autoOk
                  fullWidth={true}
                  className={style.ancestorInput}
                  variant="inline"
                  inputVariant="outlined"
                  label="Köpdatum"
                  format="yyyy-MM-dd"
                  value={individual.selling_date ?? null}
                  helperText="Fyll i om kaninen har bytt besättning"
                  InputLabelProps={{
                    shrink: true,
                  }}
                  onChange={(event, newValue) => {
                    newValue &&
                      handleUpdateIndividual("selling_date", newValue);
                  }}
                />
              </MuiPickersUtilsProvider>
            </>
          )}
        </div>
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
          onClick={() => prepareIndividual()}
        >
          Skapa
        </Button>
      </div>
    </>
  );
}