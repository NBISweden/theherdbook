import React from "react";

import { Button } from "@material-ui/core";

import { CertificateForm } from "@app/certificate_form";
import { Individual } from "@app/data_context_global";
import { useMessageContext } from "@app/message_context";
import { post } from "@app/communication";

export function IndividualAdd() {
  const [individual, setIndividual] = React.useState(
    undefined as Individual | undefined
  );
  const { userMessage } = useMessageContext();

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
    post("/api/individual", individual).then(
      () => {
        console.log("individual sent");
      },
      (error) => {
        console.log(error);
        userMessage("Något gick fel.", "error");
      }
    );
  };

  return (
    <>
      <h1>Fyll i uppgifterna om kaninen</h1>
      <CertificateForm onUpdateIndividual={handleUpdateIndividual} />
      <div>
        <Button variant="contained" color="primary">
          Tillbaka
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={
            individual
              ? createIndividual(individual)
              : userMessage("Fyll i uppgifterna först", "warning")
          }
        >
          Skapa
        </Button>
      </div>
    </>
  );
}
