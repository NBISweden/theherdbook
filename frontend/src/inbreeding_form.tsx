/**
 * @file This file contains the form that allows a user to choose mother and father to calculate coefficient of inbreeding
 */
import React from 'react'

import { makeStyles } from '@material-ui/core/styles'
import { Autocomplete } from '@material-ui/lab'
import { createFilterOptions } from '@material-ui/lab/Autocomplete'
import { TextField, Button, Typography, Paper } from '@material-ui/core'

import { individualLabel, inputVariant, Individual, LimitedIndividual, Genebank } from '@app/data_context_global'
import { useDataContext } from './data_context'
import { useMessageContext } from '@app/message_context'
import { InbreedingRecommendation } from '@app/inbreeding_recommendation'


const useStyles = makeStyles({
  form: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
    padding: '20px',
    paddingBottom: '120px'
  },
  formBox: {
    padding: '2px',
    display: 'flex',
    justifyContent: 'center',
  },
  input: {
    padding: '3px',
    paddingBottom: '5px',
    margin: '10px',
    flexBasis: '22%',
    /*border: '3px solid darkblue',
    borderRadius: '5px',
    textAlign: 'center'*/
    /*display: 'flex',
    justifyContent: 'center',
    alignContent: 'center'*/
  },
  inputGrandParents: {
    margin: '5px',
    flexBasis: '22%',
  },
  wideControl: {
  },
  bottomButton: {
    float: 'left',
    margin: '30px',
  },
  testInput: {
    paddingLeft: '15px'
  },
});

/**
 * Returns active individuals of given sex in the genebank
 * @param genebank the genebank data to filter active individuals from
 * @param sex the sex of the active individuals
 */
function activeIndividuals(genebank: Genebank, sex: string){
  return React.useMemo(() => {
    if (!genebank) {
      return []
    }
    return genebank?.individuals.filter(i => i.sex == sex && i.active == true)
  }, [genebank])
}

/**
 * Simple form where mother and father can be chosen out of the active 
 * females and males in current herd. All individuals are searchable, but the 
 * mount of individuals to display can be configured through filterOptions. 
 */
export function InbreedingForm() {
  const { genebanks } = useDataContext()
  const { popup } = useMessageContext()
  const style = useStyles()
  // FEEDBACK, gather ancestors into a dict or something?
  const [female, setFemale] = React.useState(null as Individual | null)
  const [male, setMale] = React.useState(null as Individual | null)
  const [grandMomFem, setGrandMomFem] = React.useState(null as LimitedIndividual | null)
  const [grandDadFem, setGrandDadFem] = React.useState(null as LimitedIndividual | null)
  const [grandMomMale, setGrandMomMale] = React.useState(null as LimitedIndividual | null)
  const [grandDadMale, setGrandDadMale] = React.useState(null as LimitedIndividual | null)

  /* TODO, add ability to choose genebank when several are present in DB. Copy or rewrite genebanks? */
  const genebank = genebanks[0]

  const activeFemales : Individual[] = activeIndividuals(genebank, 'female')
  const activeFemalesLimited : LimitedIndividual[] = activeFemales.map(i => {
    return {id: i.id, name: i.name, number: i.number}
  })

  const activeMales : Individual[] = activeIndividuals(genebank, 'male')
  const activeMalesLimited : LimitedIndividual[] = activeMales.map(i => {
    return {id: i.id, name: i.name, number: i.number}
  })

  const filterOptions = createFilterOptions<Individual>({
  limit: 30,
  });

  const parentsUndefined = !female || !male
  const grandParentsUndefined = !grandMomFem || !grandDadFem || !grandMomMale || !grandDadMale
  
  const inbreedCalcPossible = (female && male) || (grandMomFem && grandDadFem && grandMomMale && grandDadMale)
  || (female && grandMomMale && grandDadMale) || (male && grandMomFem && grandDadFem)

  /* TODO, develop function to calculate coefficientOfInbreeding and if there are sufficient generations*/
  let coefficientOfInbreeding = 3
  
  return <>
          <Paper>
            <form className={style.form}>
              <Typography variant='h6'>Provparning</Typography>
              <div className={style.formBox}>
                <Autocomplete className={style.input}
                        style={{ marginRight: '180px' }}
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
                          label="Välj mor"
                          helperText="Om ännu ej registrerad, välj morföräldrar nedan"
                          className={style.wideControl}
                          variant={"outlined"}
                          />}
                />
                <Autocomplete className={style.input}
                        style={{ marginLeft: '180px' }}
                        options={activeMales}
                        getOptionLabel={(option: Individual) => individualLabel(option)}
                        value={male}
                        onChange={(event, newValue) => {
                          setMale(newValue)
                          setGrandMomMale(null)
                          setGrandDadMale(null)
                        }}
                        filterOptions={filterOptions}
                        renderInput={(params) => <TextField {...params}
                          placeholder="Placeholder value"
                          label="Välj far"
                          className={style.wideControl}
                          variant={inputVariant} />}
                />
              </div>
              <div className={style.formBox}>
                <Autocomplete className={style.inputGrandParents}
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
                          label="Välj mormor"
                          className={style.wideControl}
                          variant={"outlined"}
                          />}
                />
                <Autocomplete className={style.inputGrandParents}
                        style={{ marginRight: '15px' }}
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
                          label="Välj morfar"
                          className={style.wideControl}
                          variant={"outlined"} />}
                />
                <Autocomplete className={style.inputGrandParents}
                        style={{ marginLeft: '15px' }}
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
                          label="Välj farmor"
                          className={style.wideControl}
                          variant={"outlined"}
                          />}
                />
                <Autocomplete className={style.inputGrandParents}
                        disabled={male ? true : false}
                        options={activeMalesLimited}
                        getOptionLabel={(option: LimitedIndividual) => individualLabel(option)}
                        getOptionSelected={(option, value) => option.id === value.id}
                        value={grandDadMale}
                        inputValue={male?.father ? individualLabel(male.father) : grandDadMale ? individualLabel(grandDadMale) : ''}
                        onChange={(event, newValue) => {
                          setGrandDadMale(newValue);
                        }}
                        filterOptions={filterOptions}
                        renderInput={(params) => <TextField {...params}
                          placeholder="Test"
                          label="Välj farfar"
                          className={style.wideControl}
                          variant={"outlined"} />}
                />
              </div>
              <Button className={style.bottomButton}
                            variant='contained'
                            color='primary'
                            disabled={!inbreedCalcPossible}
                            onClick={() => popup(<InbreedingRecommendation female={female} male={male} coefficientOfInbreeding={coefficientOfInbreeding} sufficientGenerations={true}/>, undefined)}
                >
                      Beräkna inavelkoefficient
              </Button>  
            </form>
          </Paper>
      </>
}
