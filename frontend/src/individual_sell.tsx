import React from "react";

import { Button } from "@material-ui/core";

import { Genebank, Individual } from "@app/data_context_global";
import { useDataContext } from "@app/data_context";
import { IndividualSellingform } from "./individual_sellingform";
import { patch } from "./communication";

export function IndividualSell({ individual }: { individual: Individual }) {
  const [genebank, setGenebank] = React.useState(
    undefined as Genebank | undefined
  );
  const [individualForSale, setIndividualForSale] = React.useState(
    individual as Individual
  );
  const [herdKey, setHerdKey] = React.useState(0 as number);
  const { genebanks } = useDataContext();

  React.useEffect(() => {
    const currentGenebank = genebanks.find((genebank) =>
      genebank.individuals.some((i) => i.number == individual.number)
    );

    setGenebank(currentGenebank);
  }, [individual]);

  /**
   * Updates a single field in `individualForSale`.
   *
   * @param field field name to update
   * @param value the new value of the field
   */
  const handleUpdateIndividual = <T extends keyof Individual>(
    field: T,
    value: Individual[T]
  ) => {
    individualForSale &&
      setIndividualForSale({ ...individualForSale, [field]: value });
  };

  /*
  delete the herd field from individualForSale to get the dropdown input for 
  herd empty when component is rendered
  */
  React.useEffect(() => {
    let currentIndividual = individualForSale;
    delete currentIndividual.herd;
    setIndividualForSale(currentIndividual);
  }, []);

  const sellIndividual = () => {
    patch("/api/individual", individualForSale).then((json) =>
      console.log(json)
    );
  };

  return (
    <>
      <h2>
        Sälja {individual.name} {individual.number}
      </h2>
      <p>
        Ange besättningen som individen ska flyttas till, samt ett datum för
        flytten. Individen kommer tas bort från din besättning och läggas till i
        besättningen du anger.
      </p>
      <p>
        Observera att du då inte längre kan ändra informationen om individen.
        Det går inte heller att utfärda eller uppdatera digitala certifikat för
        individen när den har flyttats.
      </p>
      <IndividualSellingform
        individual={individualForSale}
        herdOptions={genebank ? genebank.herds : []}
        herdKey={herdKey}
        onUpdateIndividual={handleUpdateIndividual}
      />
      <Button variant="contained" color="primary" onClick={sellIndividual}>
        Sälj
      </Button>
    </>
  );
}
