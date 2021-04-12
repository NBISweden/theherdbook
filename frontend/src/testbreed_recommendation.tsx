/**
 * @file This file shows the calculated COI and resulting recommendations based on that COI. 
 * All coefficientOfInbreeding logic/info is only a template of how it could function when 
 * we have possibility to calculate the coefficient Current numbers and recommendations 
 * are more or less humbug
 */
import React from 'react'
import { Autocomplete } from '@material-ui/lab'
import { TextField, Switch, FormControlLabel, Tooltip, CircularProgress, Table, TableBody, TableHead, TableRow, TableCell } from '@material-ui/core'
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
import { testBreedIndividuals } from '@app/testbreed_form'
import { TestbreedPedigreView } from '@app/testbreed_pedigree_view'

const useStyles = makeStyles({
  loading: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  inbreedCoefficient: {
    width: '30%',
    borderStyle: 'solid',
    borderColor: '#d3d3d3',
    borderWidth: '1px'
  },
  tableCell: {
    padding: '5px',
  },
  recommendation: {
    display: 'flex',
    alignItems: 'center'
  },
  fillWidth: {
    width: '100%',
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

// TODO, write docstring when functon is legitimate
export function InbreedingRecommendation({chosenAncestors, genebankId}
  : {chosenAncestors: testBreedIndividuals, genebankId: number | undefined}) {
  const { popup, userMessage } = useMessageContext()
  const { genebanks } = useDataContext()
  const style = useStyles()
  const [offspringCOI, setOffspringCOI] = React.useState(undefined as number | undefined)
  const [generations, setGenerations] = React.useState(4 as number)
  const [showCommonAncestors, setshowCommonAncestors] = React.useState(false as boolean)
  let generationsOptions: number[] = []
  for (let i=3; i < 8; i++) {
    generationsOptions.push(i)
  }
  /* TODO, develop function to calculate coefficientOfInbreeding and if there are sufficient generations*/

  
  React.useEffect(() => {
    setOffspringCOI(undefined)
    let payload = {genebankId: genebankId}
    Object.entries(chosenAncestors).forEach(([key, value]) => {
      if (value) {
        payload[key] = value.number
      }
    })
    post('/api/testbreed', payload).then(
      (data: any) => { 
        setOffspringCOI(data.offspringCOI)
        console.log('R-api data', data)
      },
      error => {
      console.error(error);
      userMessage(error, 'error')
      } )
    }, [chosenAncestors])

  let sufficientGenerations = true
  let thresholdCOI = 4.5
  let beneficialCOI = offspringCOI? offspringCOI <= thresholdCOI : false

  let mother = chosenAncestors['female'] ? individualLabel(chosenAncestors['female']) : 
  `♀(${chosenAncestors['femaleGM'].name}+${chosenAncestors['femaleGF'].name})`
  
  let father = chosenAncestors['male'] ? individualLabel(chosenAncestors['male']) : 
  `♂(${chosenAncestors['maleGM'].name}+${chosenAncestors['maleGF'].name})`

  let recommendationText
  let recommendationSymbol
  if (!sufficientGenerations) {
    recommendationText = 'För få generationer tillgängliga för att göra tillförlitlig beräkning av inavelskoefficient'
    recommendationSymbol = <CancelSharpIcon style={{ color: '#F44304', paddingRight: '4px'}} />
  } else if (beneficialCOI) {
    recommendationText = 'Parning rekommenderas'
    recommendationSymbol = <CheckCircleSharpIcon  style={{ color: '#4CB950', paddingRight: '4px' }}/>
  } else {
    recommendationText = 'Parning rekommenderas ej'
    recommendationSymbol = <CancelSharpIcon style={{ color: '#F44304', paddingRight: '4px'}} />

  }

  let toolTip = <Tooltip title={`Rekommenderad maxvärde på inavelskoefficent är ${thresholdCOI}`}>
                  <HelpOutlineIcon style={{ width: '0.55em', padding: '0px', color: 'grey'}} />
                  </Tooltip>

  // FEEDBACK, not sure if useMemo makes any sense with configurable number of generations and coloring common Ancestors
  // Also not sure if reasonable to rerender for coloring common Ancestors, maybe better with color method in this file
  const res = React.useMemo(() => testBreedPedigree(genebanks, chosenAncestors,
    generations, showCommonAncestors), [genebanks, chosenAncestors, generations, showCommonAncestors])
  let pedigree = res.pedigree
  let commonAncestors = res.commonAncestors

  return <>
    {offspringCOI ? 
      <div>
        <h1> Provparning {mother} och {father}</h1>
        <div>
          <Table className={style.inbreedCoefficient} size="small">
            <TableHead>
              <TableRow>
                <TableCell className={style.tableCell}></TableCell>
                <TableCell className={style.tableCell} align="left">Beräknad för avkomma</TableCell>
                <TableCell className={style.tableCell} align="left">Rekommenderat värde</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
                <TableRow>
                  <TableCell className={style.tableCell} component="th" scope="row">
                    Inavelskoefficient
                  </TableCell>
                  <TableCell className={style.tableCell} align="left">{offspringCOI}</TableCell>
                  <TableCell className={style.tableCell} align="left">{thresholdCOI}</TableCell>
                </TableRow>
            </TableBody>
          </Table>
      <p className={style.recommendation}> {recommendationSymbol} {recommendationText} </p>
      </div>
      <div className={style.fillWidth}>
        <h3>Släktträd</h3>
        <TestbreedPedigreView chosenAncestors={chosenAncestors} generations={4}></TestbreedPedigreView>
      </div>
      </div> : 
      <div className={style.loading}>
            <h2>Beräknar provparning</h2>
            <CircularProgress />
      </div>}
  </>
}
