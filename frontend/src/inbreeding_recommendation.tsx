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
  inbreedCoefficient: {
    width: '70%'
  },
  netWorkConfiguration: {
    width: '30%',
    height: '30%'
  },
  generationsInput: {
    width: '140px',
    margin: '5px 0px 5px 0px'
  },
  toggle: {
    margin: '5px 0px 5px 0px',
  },
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
  let sufficientGenerations = true
  let coefficientOfInbreeding = 6
  let thresholdCOI = 4
  let beneficialCOI = coefficientOfInbreeding <= thresholdCOI ? true : false

  let breedCouple
  if (!femaleGrandParents && !maleGrandParents){
    breedCouple = `${individualLabel(chosenFemaleAncestors[0])} och ${individualLabel(chosenMaleAncestors[0])}`
  } else if (!maleGrandParents) {
    breedCouple = `${individualLabel(chosenFemaleAncestors[0])} och ${individualLabel(chosenFemaleAncestors[1])} gemensamma avkomma och ${individualLabel(chosenMaleAncestors[0])}`
  } else {
    breedCouple = `${individualLabel(chosenFemaleAncestors[0])} och gemensam avkomma från ${individualLabel(chosenMaleAncestors[0])} och ${individualLabel(chosenMaleAncestors[1])}`
  }

  let recommendation
  if (!sufficientGenerations) {
    recommendation = <p> För få generationer tillgängliga för att göra tillförlitlig beräkning av inavelskoefficient </p>
  } else if (beneficialCOI) {
    recommendation = <p> Ok att para {breedCouple}</p>
  } else {
    recommendation = <p> Rekommenderas ej att para {breedCouple}</p>
  }

  // FEEDBACK, not sure if useMemo makes any sense with configurable number of generations and coloring common Ancestors
  // Also not sure if reasonable to rerender for coloring common Ancestors, maybe better with color method in this file
  const res = React.useMemo(() => testBreedPedigree(genebanks, chosenFemaleAncestors, chosenMaleAncestors, femaleGrandParents, maleGrandParents,
    generations, showCommonAncestors), [genebanks, chosenFemaleAncestors, chosenMaleAncestors, generations, showCommonAncestors])
  let pedigree = res.pedigree
  let commonAncestors = res.commonAncestors

  return <>
    <div>
      <h1> Resultat beräkning </h1>
      <div className={style.inbreedCoefficient}>
        <p> Inavelskoefficient {coefficientOfInbreeding} %</p>
        <p> Rekommenderad maxvärde på inavelskoefficent är {thresholdCOI} %</p>
        {recommendation}
      </div>
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
          }} disabled={commonAncestors ? false : true} edge='start'/>}
          label= "Markera gemensamma släktingar"
          labelPlacement="end"
        />
      </div>
      <div>
        {pedigree &&
              <PedigreeNetwork
                pedigree={pedigree}
                onClick={(node: string) => popup(<IndividualView id={node} />, `/individual/${node}`)}
              />
            }
      </div>
    </div>
  </>
}
