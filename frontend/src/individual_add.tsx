import React from "react";

import { Button, makeStyles } from "@material-ui/core";

import { CertificateForm } from "@app/certificate_form";
import {
  activeIndividuals,
  HerdNameID,
  Individual,
  LimitedHerd,
  Genebank,
} from "@app/data_context_global";
import { useMessageContext } from "@app/message_context";
import { post } from "@app/communication";
import { useUserContext } from "./user_context";
import { Usecase } from "@app/certificate_form";
import { useDataContext } from "./data_context";

const useStyles = makeStyles({
  paneControls: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: "20px 0",
  },
});

export function IndividualAdd({ id }: { id: string }) {
  const [individual, setIndividual] = React.useState({} as Individual);
  const [genebank, setGenebank] = React.useState(
    undefined as Genebank | undefined
  );
  const { userMessage } = useMessageContext();
  const { user } = useUserContext();
  const { genebanks } = useDataContext();
  const style = useStyles();

  //returns true if you own the herd the indvidual belongs to, are an admin or the manager of the individual's genebank
  const canEdit: boolean = React.useMemo(() => {
    return user?.canEdit(individual?.number);
  }, [user, individual]);

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
        userMessage("Individens nummer ha inget giltigt format.", "warning");
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
        canEdit={canEdit}
        usecase={Usecase.AddIndividual}
      />
      <h2>Lägg till härstamningen</h2>
      <div></div>
      <div className={style.paneControls}>
        <Button variant="contained" color="primary">
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
