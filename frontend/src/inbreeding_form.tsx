/**
 * @file This file contains the form that allows a user to choose mother and father to calculate coefficient of inbreeding
 */
import React from 'react'
import { Link, useRouteMatch, useHistory } from 'react-router-dom'

import { makeStyles } from '@material-ui/core/styles'
import { Autocomplete } from '@material-ui/lab'
import { createFilterOptions } from '@material-ui/lab/Autocomplete'
import { TextField, Button, Typography, Paper } from '@material-ui/core'

import { individualLabel, Individual, LimitedIndividual, Genebank } from '@app/data_context_global'
import { useDataContext } from '@app/data_context'
import { useMessageContext } from '@app/message_context'
import { InbreedingRecommendation } from '@app/inbreeding_recommendation'


const useStyles = makeStyles({
  title: {
    fontSize: '2em',
    fontWeight: 'bold',
    paddingLeft: '20px'
  },
  buttonBar: {
    margin: '5px 5px 5px 20px'
  },
  form: {
    width: '100%',
    height: '100%',
    padding: '10px',
    paddingBottom: '90px',
    display: 'flex',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  chooseAncestor: {
    padding: '2px',
    margin: '20px',
    borderSizing: 'border-box',
    display: 'flex',
    flexWrap: 'wrap',
    justifyContent: 'center',
    flexBasis: '45%',
  },
  lineBreak: {
    flexBasis: '100%',
    height: '0px',
  },
  inputAncestor: {
    padding: '3px',
    flexBasis: '45%',
    margin: '6px'
  },
  bottomButton: {
    margin: '15px',
    padding: '10px',
    flexBasis: '15%',
    borderRadius: '5px'
  },
})

const inputVariant = 'outlined'


/**
 * Returns active individuals of given sex in the genebank
 * @param genebank the genebank data to filter active individuals from
 * @param sex the sex of the active individuals
 */
function activeIndividuals(genebank: Genebank | undefined, sex: string){
  return React.useMemo(() => {
    if (!genebank) {
      return []
    }
    return genebank?.individuals.filter(i => i.sex == sex && i.active == true)
  }, [genebank])
}

/**
 * Simple form where mother and father can be chosen out of the active 
 * females and males in chosen genebank. All individuals are searchable, but the 
 * amount of individuals to display can be configured through filterOptions. 
 */
export function InbreedingForm() {
  const style = useStyles()
  const {url} = useRouteMatch()
  const history = useHistory()
  const {genebanks} = useDataContext()
  const [genebank, setGenebank] = React.useState(undefined as Genebank | undefined)
  const { popup } = useMessageContext()
  const [female, setFemale] = React.useState(null as Individual | null)
  const [male, setMale] = React.useState(null as Individual | null)
  const [grandMomFem, setGrandMomFem] = React.useState(null as LimitedIndividual | null)
  const [grandDadFem, setGrandDadFem] = React.useState(null as LimitedIndividual | null)
  const [grandMomMale, setGrandMomMale] = React.useState(null as LimitedIndividual | null)
  const [grandDadMale, setGrandDadMale] = React.useState(null as LimitedIndividual | null)
  const [GDML, setGDML] = React.useState('' as string)

 // Updates which genebank is targeted
 const subpath = location.pathname.replace(url, '').trim().replace(/\//, '')
 React.useLayoutEffect(() => {
  if (!subpath && genebanks.length > 0) {
    history.push(`${url}/${genebanks[0].name}`)
  } else if (genebanks.length > 0) {
    const targetGenebank = genebanks.find((g: Genebank) => g.name.toLowerCase() == subpath.toLowerCase())
    if (targetGenebank && targetGenebank !== genebank) {
      setGenebank(targetGenebank)
    }
  }
}, [subpath, genebank, genebanks])


  
  const activeFemales : Individual[] = activeIndividuals(genebank, 'female')
  const activeFemalesLimited : LimitedIndividual[] = activeFemales.map(i => {
    return {id: i.id, name: i.name, number: i.number}
  })

  const activeMales : Individual[] = activeIndividuals(genebank, 'male')
  const activeMalesLimited : LimitedIndividual[] = activeMales.map(i => {
    return {id: i.id, name: i.name, number: i.number}
  })

  const filterOptions = createFilterOptions<Individual>({
  limit: 300,
  })

  const femaleGrandParentDefined = grandMomFem && grandDadFem
  const maleGrandParentDefined = grandMomMale && grandDadMale
  
  const inbreedCalcPossible = (female && male) || (femaleGrandParentDefined && maleGrandParentDefined)
  || (female && maleGrandParentDefined) || (male && femaleGrandParentDefined)
  return <>
          <Paper>
          <Typography variant='h5'className={style.title}>Provparning</Typography>
          <div className={style.buttonBar}>
         {genebanks.length > 1 && genebanks.map((g: Genebank, i: number) => {
             return <Link to={`${url}/${g.name}`} key={g.id}>
                 <Button variant='contained'
                         value={g.id}
                         color={genebank && genebank.id == g.id ? 'primary' : 'default'}
                         >
                   {g.name}
                 </Button>
               </Link>
           })
         }
       </div>
            <form className={style.form}>
                <div className={style.chooseAncestor}>
                  <Autocomplete className={style.inputAncestor}
                          options={activeFemales}
                          getOptionLabel={(option: Individual) => individualLabel(option)}
                          value={female}
                          onChange={(event, newValue) => {
                            setFemale(newValue)
                            setGrandMomFem(null)
                            setGrandDadFem(null)

                          }}
                          filterOptions={filterOptions}
                          renderInput={(params) => <TextField {...params}
                            label='Välj mor'
                            helperText='Om ännu ej registrerad, välj morföräldrar nedan'
                            variant={inputVariant}
                            />}
                  />
                  <div className={style.lineBreak}></div>
                  <Autocomplete className={style.inputAncestor}
                          disabled={female ? true : false}
                          options={activeFemalesLimited}
                          getOptionLabel={(option: LimitedIndividual) => individualLabel(option)}
                          getOptionSelected={(option, value) => option.id === value.id}
                          value={grandMomFem}
                          // FEEDBACK, is there a possibility for individuals to not have a registered mother/father?
                          // Is '' a valid input in those cases?
                          inputValue={female?.mother ? individualLabel(female.mother) : grandMomFem ? individualLabel(grandMomFem) : ''}
                          onChange={(event, newValue) => {
                            setGrandMomFem(newValue)
                          }}
                          filterOptions={filterOptions}
                          renderInput={(params) => <TextField {...params}
                            label='Välj mormor'
                            variant={inputVariant}
                            />}
                  />
                  <Autocomplete className={style.inputAncestor}
                          disabled={female ? true : false}
                          getOptionSelected={(option, value) => option.id === value.id}
                          options={activeMalesLimited}
                          getOptionLabel={(option: LimitedIndividual) => individualLabel(option)}
                          value={grandDadFem}
                          inputValue={female?.father ? individualLabel(female.father) : grandDadFem ? individualLabel(grandDadFem) : ''}
                          onChange={(event, newValue) => {
                            setGrandDadFem(newValue)
                          }}
                          filterOptions={filterOptions}
                          renderInput={(params) => <TextField {...params}
                            label='Välj morfar'
                            variant={inputVariant} />}
                  />
                </div>
                <div className={style.chooseAncestor}>
                  <Autocomplete className={style.inputAncestor}
                          options={activeMales}
                          getOptionLabel={(option: Individual) => individualLabel(option)}
                          value={male}
                          onChange={(event, newValue) => {
                            setMale(newValue)
                            setGrandMomMale(null)
                            setGrandDadMale(null)
                            setGDML(newValue? individualLabel(newValue.father) : '')
                          }}
                          filterOptions={filterOptions}
                          renderInput={(params) => <TextField {...params}
                            label='Välj far'
                            helperText='Om ännu ej registrerad, välj farföräldrar nedan'
                            variant={inputVariant}
                            />}
                  />
                  <div className={style.lineBreak}></div>
                  <Autocomplete className={style.inputAncestor}
                          disabled={male ? true : false}
                          options={activeFemalesLimited}
                          getOptionLabel={(option: LimitedIndividual) => individualLabel(option)}
                          getOptionSelected={(option, value) => option.id === value.id}
                          value={grandMomMale}
                          inputValue={male?.mother ? individualLabel(male.mother) : grandMomMale ? individualLabel(grandMomMale) : ''}
                          onChange={(event, newValue) => {
                            setGrandMomMale(newValue)
                          }}
                          filterOptions={filterOptions}
                          renderInput={(params) => <TextField {...params}
                            label='Välj farmor'
                            variant={inputVariant}
                            />}
                  />
                  <Autocomplete className={style.inputAncestor}
                          disabled={male ? true : false}
                          options={activeMalesLimited}
                          getOptionLabel={(option: LimitedIndividual) => individualLabel(option)}
                          getOptionSelected={(option, value) => option.id === value.id}
                          value={grandDadMale}
                          inputValue={GDML}
                          onInputChange={(event, newValue) => {
                            if(event) {
                              setGDML(newValue)
                            }
                          }}
                          onChange={(event, newValue) => {
                            setGrandDadMale(newValue)
                          }}
                          filterOptions={filterOptions}
                          renderInput={(params) => <TextField {...params}
                            label='Välj farfar'
                            variant={inputVariant} />}
                  />
                </div>
              <div className={style.lineBreak}></div>
              <Button className={style.bottomButton}
                            variant='contained'
                            color='primary'
                            disabled={!inbreedCalcPossible}
                            onClick={() => popup(<InbreedingRecommendation chosenFemaleAncestors={femaleGrandParentDefined ? [grandMomFem, grandDadFem] : [female]} chosenMaleAncestors={maleGrandParentDefined ? [grandMomMale, grandDadMale] : [male]} femaleGrandParents={femaleGrandParentDefined} maleGrandParents={maleGrandParentDefined} genebankId={genebank?.id}/>, undefined)}
                >
                      Beräkna inavelkoefficient
              </Button>
            </form>
          </Paper>
      </>
}
