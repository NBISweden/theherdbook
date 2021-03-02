/**
 * @file This file shows the calculated COI and resulting recommendations based on that COI
 */
import React from 'react'
import { Individual, Genebank } from './data_context_global'
import { useDataContext } from '@app/data_context'
import { parentPedigree } from '@app/pedigree'
import { PedigreeNetwork } from '@app/pedigree_plot'
import { IndividualView } from '@app/individual_view'
import { useMessageContext } from '@app/message_context';

export function InbreedingRecommendation({female, male, COI, sufficientGenerations = true} : {female: Individual, male: Individual, COI: number, sufficientGenerations: boolean}) {
  const { popup } = useMessageContext()
  const { genebanks } = useDataContext()
  
  let parents: Individual[] = [female, male]
  
  const pedigree = React.useMemo(() => parentPedigree(genebanks, parents, 4), [genebanks, parents])
  const beneficialCOI = 5
  const badCOI = 10
  let breedCouple = `${female.name} och ${male.name}`
  let recommendation
  if (!sufficientGenerations) {
    recommendation = <p> Too few generations available to make accurate assessment of inbreed coefficient </p>
  } else if (COI == 0) {
    recommendation = <p> Inga gemensamma förfäder, ok att para {breedCouple} </p>
  } else if (COI <= beneficialCOI) {
    recommendation = <p> Gemensamma förfäder, men bör ej ha deleterious effects att para {breedCouple}</p>
  } else if (COI <= badCOI) {
    recommendation = <p> Gemensamma förfäder, modest detrimental effects att para {breedCouple} </p>
  } else {
    recommendation = <p> Gemensamma förfäder, significant effects on the offspring and detrimental effects on the breed att para {breedCouple} </p>
  }
  return <>
    <div>
      <h1> Resultat beräkning </h1>
      <p> Inavelskoefficient {COI} </p>
      {recommendation}
    </div>

    <div>
    {pedigree &&
          <PedigreeNetwork
            pedigree={pedigree}
            onClick={(node: string) => popup(<IndividualView id={node} />, `/individual/${node}`)}
          />
        }
    </div>
  </>
}