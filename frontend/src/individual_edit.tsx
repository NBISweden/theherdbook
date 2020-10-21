/**
 * @file This file contains the IndividualEdit function. This function allows a
 * user (with the required permissions) to edit an individual given by `id`, or
 * add a new individual if `herdId` is given.
 */
import React from 'react'
import { makeStyles } from '@material-ui/core/styles';
import { get, update } from '@app/communication';
import { Individual, ServerMessage
        } from '@app/data_context_global';
import { useMessageContext } from '@app/message_context';
import { Button, CircularProgress, TextField,
        } from '@material-ui/core';
import { useUserContext } from '@app/user_context';
import { useDataContext } from '@app/data_context';

const useStyles = makeStyles({
  loading: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    width: '95%',
  },
  flexRow: {
    display: 'flex',
    flexDirection: 'column',
    ['@media (min-width:600px)']: {
      flexDirection: 'row',
    },
  },
  control: {
    margin: '5px',
  },
  formPane: {
    borderRight: 'none',
    ['@media (min-width:600px)']: {
      borderRight: '1px solid lightgrey',
    },
    paddingRight: '5px',
    '&:last-child': {
      paddingLeft: '5px',
      paddingRight: '0',
      borderRight: 'none',
    }
  },
  adminPane: {
    width: '100%',
    padding: '15px 0 5px 10px',
    border: '1px solid lightgrey',
    position: 'relative',
    display: 'flex',
    flexDirection: 'row',
    background: 'repeating-linear-gradient(135deg, white, white 25px, rgba(0,0,0,0.05) 25px, rgba(0,0,0,0.05) 50px )',
  },
  titleText: {
    width: '100%',
    borderBottom: '1px solid lightgrey',
    padding: '0 20px',
    fontSize: '2.3em',
  },
  paneTitle: {
    position: 'absolute',
    top: '0px',
    left: '10px',
  },
  paneControls: {
    display: 'flex',
    flexDirection: 'row',
  }
});


/**
 * This function allows a user (with the required permissions) to edit an
 * individual given by `id`, or add a new individual if no `id` is given.
 */
export function IndividualEdit({id}: {id: string | undefined}) {
  const [individual, setIndividual] = React.useState(undefined as Individual | undefined)
  const { user } = useUserContext()
  const { genebanks, colors } = useDataContext()
  const {userMessage} = useMessageContext()
  const style  = useStyles()
  const inputVariant = 'standard' as 'filled' | 'outlined' | 'standard'

  /**
   * Fetch individual data from the backend
   */
  React.useEffect(() => {
    user && user.canEdit(id) ?
      get(`/api/individual/${id}`).then(
        (data: Individual) => setIndividual(data),
        error => {
          console.error(error);
          userMessage(error, 'error')
        }
      )
      : userMessage('You do not have permission to edit this individual', 'error')
  }, [id, user])

  /**
   * Updates a single field in `individual`.
   *
   * @param field field name to update
   * @param value the new value of the field
   */
  const updateField = <T extends keyof Individual>(field: T, value: Individual[T]) => {
    individual && setIndividual({...individual, [field]: value})
  }

  /**
   * Sends a request to save the current data in the database. Returns a
   * ServerMessage.
   *
   * @param data The Individual data to save.
   */
  const save = (data: Individual) => {
    const postData = {...data}
    update('/api/individual', postData).then(
      (retval: ServerMessage) => {
        switch (retval.status) {
          case 'success': userMessage(retval.message ?? 'Individual updated', 'success'); break;
          default: userMessage(retval.message ?? 'something went wrong', 'error')
        }
      },
      error => {
        userMessage('' + error, 'error')
        console.error(error)
      }
    )
  }

  return <>
  {individual
    ? <div className={style.form}>
        <div className={style.flexRow}>
          <div className={style.formPane}>
            <div className={style.titleText}>
              Redigera Individ
            </div>
            <div className={style.adminPane}>
              <div className={style.paneTitle}>
                Admin Fields
              </div>

              <TextField
                disabled
                label="Nummer"
                className={style.control}
                variant={inputVariant}
                value={individual.number ?? ''}
                onChange={(event) => {updateField('number', event.currentTarget.value)}}
              />
              <TextField
                disabled
                label="Certifikat"
                className={style.control}
                variant={inputVariant}
                value={individual.certificate ?? ''}
                onChange={(event) => {updateField('certificate', event.currentTarget.value)}}
              />
            </div>
            <TextField
              label="Namn"
              className={style.control}
              variant={inputVariant}
              value={individual.name ?? ''}
              onChange={(event) => {updateField('name', event.currentTarget.value)}}
            />
            <TextField label='Födelsedatum' className={style.control}
              value={individual.birth_date ?? ''}
              type='date'
              variant={inputVariant}
              InputLabelProps={{
                shrink: true,
              }}
              onChange={(e: any) => {updateField('birth_date', e.target.value)}}
              />
            <TextField
              label="Anteckningar"
              variant={inputVariant}
              className={style.control}
              multiline
              rows={4}
              value={individual.notes ?? ''}
              onChange={(event) => {updateField('notes', event.currentTarget.value)}}
            />
          </div>
          <div className={style.formPane}>
            <div className={style.titleText}>
              Mått
            </div>
          </div>
        </div>
        <div className={style.paneControls}>
          <Button variant="contained"
                  color="primary"
                  onClick={() => save(individual)}>
            {'Spara'}
          </Button>
        </div>
      </div>
    : <div className={style.loading}>
        <h2>Loading data</h2>
        <CircularProgress />
      </div>
  }
  </>
}
