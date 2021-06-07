import React from "react";

import { Button, makeStyles } from "@material-ui/core";

import { CertificateForm } from "@app/certificate_form";
import { Individual } from "@app/data_context_global";
import { useMessageContext } from "@app/message_context";
import { post } from "@app/communication";
import { useUserContext } from "./user_context";
import { Usecase } from "@app/certificate_form";

const useStyles = makeStyles({
  paneControls: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: "20px 0",
  },
});

export function IndividualAdd() {
  const [individual, setIndividual] = React.useState({} as Individual);
  const { userMessage } = useMessageContext();
  const { user } = useUserContext();
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

  const createIndividual = (individual: Individual) => {
    if (individual) {
      post("/api/individual", individual).then(
        () => {
          console.log("individual sent");
        },
        (error) => {
          console.log(error);
          userMessage("Något gick fel.", "error");
        }
      );
    } else {
      userMessage("Fyll i uppgifterna först", "warning");
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
