/**
 * @file This file shows the calculated COI and resulting recommendations based on that COI. 
 * All coefficientOfInbreeding logic/info is only a template of how it could function when 
 * we have possibility to calculate the coefficient Current numbers and recommendations 
 * are more or less humbug
 */
import React from 'react'
import { Autocomplete } from '@material-ui/lab'
import { TextField, Switch, FormControlLabel } from '@material-ui/core'
import { makeStyles } from '@material-ui/core/styles'
import { LimitedIndividual, individualLabel, inputVariant} from './data_context_global'
import { useDataContext } from '@app/data_context'
import { testBreedPedigree } from '@app/pedigree'
import { PedigreeNetwork } from '@app/pedigree_plot'
import { IndividualView } from '@app/individual_view'
import { useMessageContext } from '@app/message_context';

const useStyles = makeStyles({
  netWorkConfiguration: {
    width: '20%',
  },
  generationsInput: {
    width: '50%',
    margin: '5px 0px 5px 0px'
  },
  toggle: {
    margin: '10px 0px 5px 0px',
  }
})

// TODO, write docstring when functon is legitimate
export function InbreedingRecommendation({chosenFemaleAncestors, chosenMaleAncestors, femaleGrandParents, maleGrandParents} : {chosenFemaleAncestors: LimitedIndividual[], chosenMaleAncestors: LimitedIndividual[], femaleGrandParents: boolean, maleGrandParents: boolean}) {
  const { popup } = useMessageContext()
  const { genebanks } = useDataContext()
  const style = useStyles()
  const [generations, setGenerations] = React.useState(4 as number)
  const [showCommonAncestors, setshowCommonAncestors] = React.useState(false as boolean)
  let generationsOptions: number[] = []
  for (let i=3; i < 8; i++) {
    generationsOptions.push(i)
  }
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

    // FEEDBACK, not sure if useMemo makes any sense with configurable number of generations and coloring common Ancestors
    // Also not sure if reasonable to rerender for coloring common Ancestors, maybe better with color method in this file
    const res = React.useMemo(() => testBreedPedigree(genebanks, chosenFemaleAncestors, chosenMaleAncestors, femaleGrandParents, maleGrandParents,
      generations, showCommonAncestors), [genebanks, chosenFemaleAncestors, chosenMaleAncestors, generations, showCommonAncestors])
    let pedigree = res.pedigree
    let commonAncestors = res.commonAncestors

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
        <div className={style.netWorkConfiguration}>
          <Autocomplete className = {style.generationsInput}
                            options={generationsOptions}
                            getOptionLabel={(option: number) => option.toString()}
                            value={generations}
                            onChange={(event, newValue) => {
                              setGenerations(newValue ? newValue : 4)
                            }}
                            renderInput={(params) => <TextField {...params}
                              label='Antal generationer'
                              variant={inputVariant}
                              />}
          />
          <FormControlLabel className= {style.toggle}
          value={showCommonAncestors}
          control={<Switch color="primary" onChange={(event) => {
            setshowCommonAncestors(!showCommonAncestors)
          }} disabled={commonAncestors ? false : true}/>}
          label= "Markera ev. gemensamma släktingar"
          labelPlacement="end"
        />
        </div>
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
