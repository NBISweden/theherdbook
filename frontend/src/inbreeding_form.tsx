/**
 * @file This file contains the form that allows a user to choose mother and father to calculate coefficient of inbreeding
 */
import React from 'react'

import { makeStyles } from '@material-ui/core/styles'
import { Autocomplete } from '@material-ui/lab'
import { createFilterOptions } from '@material-ui/lab/Autocomplete'
import { TextField, Button, Typography, Paper } from '@material-ui/core'

import { individualLabel, inputVariant, Individual, Genebank } from '@app/data_context_global'
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
    padding: '10px',
  },
  wideControl: {
    width: '25%',
  },
  bottomButton: {
    float: 'left',
    marginTop: '20px',
  }
});

/* TODO, decide if type Indivial, useMemo and unpacking makes sense*/

/* Filter genebank for active individuals of given sex*/
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
  const [female, setFemale] = React.useState(undefined as Individual | undefined)
  const [male, setMale] = React.useState(undefined as Individual | undefined)
  

  /* TODO, add ability to choose genebank when several are present in DB. Copy or rewrite genebanks? */
  const genebank = genebanks[0]

  const activeFemales : Individual[] = activeIndividuals(genebank, 'female')

  const activeMales : Individual[] = activeIndividuals(genebank, 'male')

  const filterOptions = createFilterOptions<Individual>({
  limit: 30,
  });
  
  /* TODO, develop function to calculate COI and if there are sufficient generations*/
  let COI = 3
  
  return <>
          <Paper>
          <form className={style.form}>
          <Typography variant='h6'>Inavelkoefficient</Typography>
          <div className={style.formBox}>
          <Autocomplete
                  options={activeFemales}
                  getOptionLabel={(option: Individual) => individualLabel(option)}
                  value={female}
                  // FEEDBACK, not sure if onChange "typing" solution optimal
                  onChange={(event, newValue) => {
                    setFemale(newValue ? newValue : undefined);
                  }}
                  filterOptions={filterOptions}
                  renderInput={(params) => <TextField {...params}
                    label="Välj mor"
                    className={style.wideControl}
                    variant={inputVariant} />}
          />
          <Autocomplete
                  options={activeMales}
                  getOptionLabel={(option: Individual) => individualLabel(option)}
                  value={male}
                  // FEEDBACK, not sure if onChange "typing" solution optimal
                  onChange={(event, newValue) => {
                    setMale(newValue ? newValue : undefined);
                  }}
                  filterOptions={filterOptions}
                  renderInput={(params) => <TextField {...params}
                    label="Välj far"
                    className={style.wideControl}
                    variant={inputVariant} />}
          />

          <Button className={style.bottomButton}
                         variant='contained'
                         color='primary'
                         disabled={!female || !male}
                         onClick={() => popup(<InbreedingRecommendation female={female} male={male} COI={COI} sufficientGenerations={true}/>, undefined)}
            >
                  Beräkna inavelkoefficient
          </Button>

    </div>
    </form>
    </Paper>
    </>
}
