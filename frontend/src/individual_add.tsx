import React from "react";

import { Button, makeStyles, TextField } from "@material-ui/core";

import { CertificateForm, Usecase } from "@app/certificate_form";
import { HerdView } from "@app/herd_view";
import {
  activeIndividuals,
  HerdNameID,
  Individual,
  LimitedIndividual,
  individualLabel,
  LimitedHerd,
  Genebank,
} from "@app/data_context_global";
import { useMessageContext } from "@app/message_context";
import { post } from "@app/communication";
import { useUserContext } from "./user_context";
import { useDataContext } from "./data_context";
import { Autocomplete } from "@material-ui/lab";

const useStyles = makeStyles({
  paneControls: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: "20px 0",
  },
  ancestorBox: {
    display: "flex",
    flexDirection: "column",
    margin: "0 0 4em 0",
  },
  ancestorInput: {
    margin: "1em 0",
  },
});

export function IndividualAdd({ id }: { id: string }) {
  const [individual, setIndividual] = React.useState({} as Individual);
  const [genebank, setGenebank] = React.useState(
    undefined as Genebank | undefined
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
    // id here is the id of the herd the user is adding the individual to.
    // assumes that the new individual originates from a herd belonging to the same genebank.
    const originGenebank = genebanks.find((genebank) =>
      genebank.herds.filter((herd) => herd.herd == id)
    );
    setGenebank(originGenebank);
  }, [id]);

  const activeFemales: Individual[] = activeIndividuals(genebank, "female");
  const activeMales: Individual[] = activeIndividuals(genebank, "male");

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
      const originHerdNumber: string = numberParts[0];
      const originHerd = genebank?.herds.find(
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
          herd: id,
        };

        post("/api/individual", newIndividual).then(
          () => {
            console.log("individual sent");
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
      userMessage("Fyll i ett nummer först.", "warning");
    }
  };

  return (
    <>
      <h1>Fyll i uppgifterna om kaninen</h1>
      <CertificateForm
        onUpdateIndividual={handleUpdateIndividual}
        individual={individual}
        canEdit={user?.canEdit(id)}
        usecase={Usecase.AddIndividual}
      />
      <h2>Lägg till härstamningen</h2>
      <div className={style.ancestorBox}>
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
      </div>
      <div className={style.paneControls}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => popup(<HerdView id={id} />)}
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
