/**
 * @file This file shows the calculated COI and resulting recommendations based on that COI
 */
import React from 'react'
import { LimitedIndividual, individualLabel} from './data_context_global'
import { useDataContext } from '@app/data_context'
import { testBreedPedigree } from '@app/pedigree'
import { PedigreeNetwork } from '@app/pedigree_plot'
import { IndividualView } from '@app/individual_view'
import { useMessageContext } from '@app/message_context';

// TODO, write docstring when functon is legitimate
export function InbreedingRecommendation({chosenFemaleAncestors, chosenMaleAncestors, femaleGrandParents, maleGrandParents} : {chosenFemaleAncestors: LimitedIndividual[], chosenMaleAncestors: LimitedIndividual[], femaleGrandParents: boolean, maleGrandParents: boolean}) {
  const { popup } = useMessageContext()
  const { genebanks } = useDataContext()
  /* TODO, develop function to calculate coefficientOfInbreeding and if there are sufficient generations*/
  let coefficientOfInbreeding = 3
  let sufficientGenerations = true
  let breedCouple

  // TODO, style
  if (!femaleGrandParents && !maleGrandParents){
    breedCouple = `${individualLabel(chosenFemaleAncestors[0])} och ${individualLabel(chosenMaleAncestors[0])}`
  } else if (!maleGrandParents) {
    breedCouple = `${individualLabel(chosenFemaleAncestors[0])} och ${individualLabel(chosenFemaleAncestors[1])} gemensamma avkomma och ${individualLabel(chosenMaleAncestors[0])}`
  } else {
    breedCouple = `${individualLabel(chosenFemaleAncestors[0])} och gemensam avkomma från ${individualLabel(chosenMaleAncestors[0])} och ${individualLabel(chosenMaleAncestors[1])}`
  }

    const pedigree = React.useMemo(() => testBreedPedigree(genebanks, chosenFemaleAncestors, chosenMaleAncestors, femaleGrandParents, maleGrandParents, 4), [genebanks, chosenFemaleAncestors, chosenMaleAncestors])

    // All coefficientOfInbreeding logic/info is only a template of how it could function when we have possibility to calculate the coefficient
    // Current numbers and recommendations are more or less humbug

    const beneficialCOI = 5
    const badCOI = 10
    let recommendation
    if (!sufficientGenerations) {
      recommendation = <p> Too few generations available to make accurate assessment of inbreed coefficient </p>
    } else if (coefficientOfInbreeding == 0) {
      recommendation = <p> No common anscestors, ok to breed {breedCouple} </p>
    } else if (coefficientOfInbreeding <= beneficialCOI) {
      recommendation = <p> Common anscestors but should not have deleterious effects to breed {breedCouple}</p>
    } else if (coefficientOfInbreeding <= badCOI) {
      recommendation = <p> Common anscestors, modest detrimental effects to breed {breedCouple} </p>
    } else {
      recommendation = <p> Common anscestors, significant effects on the offspring and detrimental effects on the breed to breed {breedCouple} </p>
    }
    return <>
      <div>
        <h1> Resultat beräkning </h1>
        <p> Inavelskoefficient {coefficientOfInbreeding} </p>
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
