import React from "react";

import { Genebank, Individual } from "@app/data_context_global";
import { useDataContext } from "@app/data_context";
import { IndividualSellingform } from "./individual_sellingform";

export function IndividualSell({ individual }: { individual: Individual }) {
  const [genebank, setGenebank] = React.useState(
    undefined as Genebank | undefined
  );
  const { genebanks } = useDataContext();

  React.useEffect(() => {
    const currentGenebank = genebanks.find((genebank) =>
      genebank.individuals.some((i) => i.number == individual.number)
    );
    setGenebank(currentGenebank);
  }, [individual]);

  return (
    <>
      <IndividualSellingform
        individual={individual}
        herdOptions={genebank ? genebank.herds : []}
        herdKey={3}
        onUpdateIndividual={() => console.log(individual)}
      />
    </>
  );
}
