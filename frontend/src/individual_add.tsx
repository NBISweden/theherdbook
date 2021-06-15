import React from "react";

import { Button, makeStyles, TextField } from "@material-ui/core";
import { Autocomplete } from "@material-ui/lab";

import { IndividualForm, FormAction } from "@app/individual_form";
import { HerdView } from "@app/herd_view";
import {
  activeIndividuals,
  HerdNameID,
  Individual,
  individualLabel,
  LimitedHerd,
  LimitedIndividual,
  Genebank,
  herdLabel,
  OptionType,
} from "@app/data_context_global";
import { useMessageContext } from "@app/message_context";
import { post } from "@app/communication";
import { useUserContext } from "./user_context";
import { useDataContext } from "./data_context";
import { IndividualAncestry } from "./individual_ancestry";

const useStyles = makeStyles({
  paneControls: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: "0 3em 3em 3em ",
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
    /*     padding: "3em", */
    alignItems: "center",
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
    genebank ? genebank : (undefined as Genebank | undefined)
  );
  const [herdOptions, setHerdOptions] = React.useState(
    genebank ? genebank.herds : ([] as LimitedHerd[])
  );
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

  const createIndividual = (individual: Individual) => {
    // first generate the individuals origin herd
    if (individual?.number) {
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

          post("/api/individual", newIndividual).then(
            (json) => {
              switch (json.status) {
                case "success": {
                  userMessage(
                    "Kaninen har lagts till i din besättning.",
                    "success"
                  );
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

  return (
    <>
      <div className={style.inputBox}>
        <IndividualForm
          onUpdateIndividual={handleUpdateIndividual}
          individual={individual}
          canEdit={user?.canEdit(herdId)}
          formAction={FormAction.AddIndividual}
        />
        <div className={style.ancestorBox}>
          <h2>Lägg till härstamningen</h2>
          <Autocomplete
            className={style.ancestorInput}
            options={limitedFemales}
            getOptionLabel={(option: LimitedIndividual) =>
              individualLabel(option)
            }
            value={individual.mother}
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
            value={individual.father}
            onChange={(event, newValue) =>
              handleUpdateIndividual("father", newValue)
            }
            renderInput={(params) => (
              <TextField {...params} label="Välj far" variant="outlined" />
            )}
          />
          {!herdId && (
            <>
              <h2>I vilken besättning ska kaninen läggas till?</h2>
              <Autocomplete
                options={herdOptions}
                value={individual.herd}
                getOptionLabel={(option: LimitedHerd) => herdLabel(option)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Besättning"
                    variant="outlined"
                    margin="normal"
                  />
                )}
                onChange={(event, newValue) => {
                  handleUpdateIndividual("herd", newValue?.herd);
                }}
              />
            </>
          )}
        </div>
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
          onClick={() => createIndividual(individual)}
        >
          Skapa
        </Button>
      </div>
    </>
  );
}
