/**
 * @file This file shows the calculated COI and resulting recommendations based on that COI. 
 * All coefficientOfInbreeding logic/info is only a template of how it could function when 
 * we have possibility to calculate the coefficient Current numbers and recommendations 
 * are more or less humbug
 */
import React from 'react'
import { Autocomplete } from '@material-ui/lab'
import { TextField, Switch, FormControlLabel, Tooltip } from '@material-ui/core'
import { makeStyles } from '@material-ui/core/styles'
import CheckCircleSharpIcon from '@material-ui/icons/CheckCircleSharp'
import CancelSharpIcon from '@material-ui/icons/CancelSharp'
import HelpOutlineIcon from '@material-ui/icons/HelpOutline';
import { Individual, LimitedIndividual, individualLabel, inputVariant} from './data_context_global'
import { useDataContext } from '@app/data_context'
import { get, post } from '@app/communication'
import { testBreedPedigree } from '@app/pedigree'
import { PedigreeNetwork } from '@app/pedigree_plot'
import { IndividualView } from '@app/individual_view'
import { useMessageContext } from '@app/message_context'
import { testBreedIndividuals } from '@app/inbreeding_form'

const useStyles = makeStyles({
  inbreedCoefficient: {
    width: '70%'
  },
  recommendation: {
    display: 'flex',
    alignItems: 'center'
  },
  netWorkConfiguration: {
    width: '30%',
    height: '30%',
    marginTop: '30px'
  },
  generationsInput: {
    width: '140px',
    margin: '5px 0px 5px 0px'
  },
  toggle: {
    margin: '5px 0px 5px 0px',
  },
})

function calculateOffspringCOI(chosenAncestors: testBreedIndividuals, genebankId: number | undefined) {
    //TODO, error handling
    let payload = {genebankId: genebankId}
    Object.entries(chosenAncestors).forEach(([key, value]) => {
      console.log(`${key}: ${value}`)
      if (value) {
        payload[key] = value.number
      }
  })
  
  post('/api/testbreed', payload).then(
    (data: any) => {
      console.log('R-api data', data)
    } )
}

// TODO, write docstring when functon is legitimate
export function InbreedingRecommendation({chosenAncestors, genebankId}
  : {chosenAncestors: testBreedIndividuals, genebankId: number | undefined}) {
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
  let coefficientOfInbreeding = 4.3
  let temp = calculateOffspringCOI(chosenAncestors, genebankId)
  let thresholdCOI = 4.3
  let beneficialCOI = coefficientOfInbreeding <= thresholdCOI ? true : false

  let mother = chosenAncestors['female'] ? individualLabel(chosenAncestors['female']) : 
  `♀(${chosenAncestors['femaleGM'].name}+${chosenAncestors['femaleGF'].name})`
  
  let father = chosenAncestors['male'] ? individualLabel(chosenAncestors['male']) : 
  `♂(${chosenAncestors['maleGM'].name}+${chosenAncestors['maleGF'].name})`

  let recommendationText
  let recommendationSymbol = <CancelSharpIcon style={{ color: '#F44304', paddingRight: '4px'}} />
  if (!sufficientGenerations) {
    recommendationText = 'För få generationer tillgängliga för att göra tillförlitlig beräkning av inavelskoefficient'
  } else if (beneficialCOI) {
    recommendationText = 'Parning rekommenderas'
    recommendationSymbol = <CheckCircleSharpIcon  style={{ color: '#4CB950', paddingRight: '4px' }}/>
  } else {
    recommendationText = 'Parning rekommenderas ej'

  }

  let toolTip = <Tooltip title={`Rekommenderad maxvärde på inavelskoefficent är ${thresholdCOI}`}>
                  <HelpOutlineIcon style={{ width: '0.55em', padding: '0px', color: 'grey'}} />
                  </Tooltip>
  
  let recTemp = <p> Rekommenderad maxvärde på inavelskoefficent är {thresholdCOI} % {toolTip}</p>
  

  // FEEDBACK, not sure if useMemo makes any sense with configurable number of generations and coloring common Ancestors
  // Also not sure if reasonable to rerender for coloring common Ancestors, maybe better with color method in this file
  /*const res = React.useMemo(() => testBreedPedigree(genebanks, chosenFemaleAncestors, chosenMaleAncestors, femaleGrandParents, maleGrandParents,
    generations, showCommonAncestors), [genebanks, chosenFemaleAncestors, chosenMaleAncestors, generations, showCommonAncestors])
  let pedigree = res.pedigree
  let commonAncestors = res.commonAncestors*/
  let pedigree = undefined
  let commonAncestors = false

  return <>
    <div>
      <h1> Provparning {mother} och {father}</h1>
      <div className={style.inbreedCoefficient}>
        <p className={style.recommendation}> {recommendationSymbol} Inavelskoefficient hos avkomma {coefficientOfInbreeding} %</p>
        <p> {recommendationText} {toolTip}</p>
        
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
