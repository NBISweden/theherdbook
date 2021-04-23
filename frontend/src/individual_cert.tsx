import React from 'react';

import { Button, Checkbox, CircularProgress, FormControlLabel, makeStyles, TextField, Typography } from '@material-ui/core';
import { MuiPickersUtilsProvider, KeyboardDatePicker } from '@material-ui/pickers';
import { Autocomplete } from '@material-ui/lab';
import DateFnsUtils from '@date-io/date-fns';

import { get, patch } from '@app/communication';
import { useUserContext } from '@app/user_context';
import { useDataContext } from '@app/data_context';
import { useMessageContext } from '@app/message_context';
import { dateFormat, Individual, inputVariant, OptionType, ServerMessage } from '@app/data_context_global';

const useStyles = makeStyles({
    adminPane: {
        width: '100%',
        padding: '15px 0 5px 10px',
        border: '1px solid lightgrey',
        position: 'relative',
        display: 'flex',
        flexDirection: 'row',
        background: 'repeating-linear-gradient(135deg, white, white 25px, rgba(0,0,0,0.05) 25px, rgba(0,0,0,0.05) 50px )',
    },
    control: {
        margin: '5px',
        minWidth: '195px',
        paddingRight: '5px',
    },
    flexRow: {
        display: 'flex',
        flexDirection: 'row',
    },
    flexRowOrColumn: {
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
        overflowY: 'auto',
        ['@media (min-width:600px)']: {
            flexDirection: 'row',
        },
    },
    form: {
        display: 'flex',
        height: '100%',
        overflow: 'hidden',
        flexDirection: 'column',
        width: '95%',
    },
    formPane: {
        borderRight: 'none',
        minWidth: '410px',
        ['@media (min-width:660px)']: {
            borderRight: '1px solid lightgrey',
        },
        paddingRight: '5px',
        '&:last-child': {
            paddingLeft: '5px',
            paddingRight: '0',
            borderRight: 'none',
        }
    },
    loading: {
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
    },
    paneControls: {
        display: 'flex',
        flexDirection: 'row',
    },
    paneTitle: {
        position: 'absolute',
        top: '0px',
        left: '10px',
    },
    titleText: {
        width: '100%',
        borderBottom: '1px solid lightgrey',
        padding: '0 20px',
        fontSize: '2.3em',
    },
    wideControl: {
        margin: '5px',
        minWidth: '195px',
        width: '100%',
        paddingRight: '5px',
    },
})


export function IndividualCert({id}: {id: string | undefined}) {
    const [individual, setIndividual] = React.useState(undefined as Individual | undefined)
    const [father, setFather] = React.useState(undefined as Individual | undefined)
    const [mother, setMother] = React.useState(undefined as Individual | undefined)
    const [isNew, setIsNew] = React.useState(!!id as boolean)
    const { user } = useUserContext()
    const { genebanks, colors } = useDataContext()
    const {userMessage} = useMessageContext()
    const canManage: boolean = React.useMemo(() => {
        return user?.canEdit(individual?.genebank)
      }, [user, individual])
    const style  = useStyles()

    /**
   * Fetch individual data from the backend
   */
  React.useEffect(() => {
    user && user.canEdit(id) ?
      get(`/api/individual/${id}`).then(
        (data: Individual) => {
          console.log(data)
          setIndividual(data)
          setIsNew(false)
        },
        error => {
          console.error(error);
          userMessage(error, 'error')
        }
      )
      : userMessage('You do not have permission to edit this individual', 'error')
  }, [id, user])

  React.useEffect(() => {
    console.log(individual)
      get(`/api/individual/${individual?.father?.number}`).then(
        (data: Individual) => {
          setFather(data)
          console.log(father)
        },
        error => {
          console.error(error);
          userMessage(error, 'error')
        }
      )
      get(`/api/individual/${individual?.mother?.number}`).then(
        (data: Individual) => {
          setMother(data)
          console.log(mother)
        },
        error => {
          console.error(error);
          userMessage(error, 'error')
        }
      )
  }, [individual])
    
    /**
   * Updates a single field in `individual`.
   *
   * @param field field name to update
   * @param value the new value of the field
   */
  const updateIndividual = <T extends keyof Individual>(field: T, value: Individual[T]) => {
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
        patch('/api/individual', postData).then(
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

  const colorOptions: OptionType[] = React.useMemo(() => {
    if (individual && colors && Object.keys(colors).includes(individual.genebank)) {
      return colors[individual.genebank].map(c => {
        return {value: c.name, label: `${c.id} - ${c.name}`}
      })
    }
    return []
  }, [colors, individual])

  const sexOptions = [{value: 'female', label: 'Hona'},
                      {value: 'male', label: 'Hane'},
                      {value: 'unknown', label: 'Okänd'}]

  const photoOptions = [{value: 'no', label: 'Nej'},
                      {value: 'yes', label: 'Ja'},] //should be boolean but doesn't work together with the OptionType


    return <>
       {individual
    ? <div className={style.form}>
        <MuiPickersUtilsProvider utils={DateFnsUtils}>
          <div className={style.flexRowOrColumn}>
            <div className={style.formPane}>
              <h1>Fyll i uppgifterna för certifikatet</h1>
              <div className={style.adminPane}>
                <div className={style.paneTitle}>
                  Kan endast ändras av genbanksansvarig
                </div>
                <TextField
                  disabled
                  label="Nummer"
                  className={style.control}
                  variant={inputVariant}
                  value={individual.number ?? ''}
                  onChange={(event) => {updateIndividual('number', event.currentTarget.value)}}
                />
                <TextField
                  disabled={!(isNew || canManage)}
                  label="Certifikat" //should be generating a new number
                  className={style.control}
                  variant={inputVariant}
                  value={individual.certificate ?? ''}
                  onChange={(event) => {updateIndividual('certificate', event.currentTarget.value)}}
                />
              </div>
              <h2>Identitet</h2>
              <TextField
                disabled={!(isNew || canManage)}
                label="Namn"
                className={style.control}
                variant={inputVariant}
                value={individual.name ?? ''}
                onChange={(event) => {updateIndividual('name', event.currentTarget.value)}}
              />
              <div className={style.flexRow}>
                <Autocomplete
                  disabled={!(isNew || canManage)}
                  options={sexOptions ?? []}
                  value={sexOptions.find(option => option.value == individual.sex) ?? sexOptions[sexOptions.length - 1]}
                  getOptionLabel={(option: OptionType) => option.label}
                  renderInput={(params) => <TextField {...params}
                    label="Kön"
                    className={style.control}
                    variant={inputVariant}
                    margin="normal" />}
                  onChange={(event: any, newValue: OptionType | null) => {
                    updateIndividual('sex', newValue?.value ?? '')
                  }}
                />
                <KeyboardDatePicker
                  disabled={!(isNew || canManage)}
                  autoOk
                  variant="inline"
                  className={style.control}
                  inputVariant={inputVariant}
                  label="Födelsedatum"
                  format={dateFormat}
                  value={individual.birth_date ?? ''}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  onChange={(date, value) => {value && updateIndividual('birth_date', value)}}
                />
              </div>
              <div className={style.flexRow}>
                <Autocomplete
                  disabled={!(isNew || canManage)}
                  options={colorOptions ?? []}
                  value={colorOptions.find(option => option.value == individual.color) ?? colorOptions[0]}
                  getOptionLabel={(option: OptionType) => option.label}
                  renderInput={(params) => <TextField {...params}
                    label="Färg"
                    className={style.control}
                    variant={inputVariant}
                    margin="normal" />}
                  onChange={(event: any, newValue: OptionType | null) => {
                    updateIndividual('color', newValue?.value ?? '')
                  }}
                />
                <TextField
                  disabled={!(isNew || canManage)}
                  label="Färgantecking"
                  variant={inputVariant}
                  className={style.control}
                  multiline
                  rows={3}
                  value={individual.color_note ?? ''}
                  onChange={(event) => {updateIndividual('color_note', event.currentTarget.value)}}
                />
              </div>
              <div className={style.flexRow}>
                <TextField
                  disabled={!(isNew || canManage)}
                  label="Färg på buken"
                  className={style.control}
                  variant={inputVariant}
                  value={individual.belly_color ?? ''}
                  onChange={(event) => {updateIndividual('belly_color', event.currentTarget.value)}}
                />
                <TextField
                  disabled={!(isNew || canManage)}
                  label="Ögonfärg"
                  className={style.control}
                  variant={inputVariant}
                  value={individual.eye_color ?? ''}
                  onChange={(event) => {updateIndividual('eye_color', event.currentTarget.value)}}
                />
              </div>
              <div className={style.flexRow}>
                <TextField
                  disabled={!(isNew || canManage)}
                  label="Klofärg(er)"
                  className={style.control}
                  variant={inputVariant}
                  value={individual.claw_color ?? ''}
                  onChange={(event) => {updateIndividual('claw_color', event.currentTarget.value)}}
                />
                 <Autocomplete
                  disabled={!(isNew || canManage)}
                  options={photoOptions ?? []}
                  getOptionLabel={(option: OptionType) => option.label}
                  renderInput={(params) => <TextField {...params}
                    label="Foto finns"
                    className={style.control}
                    variant={inputVariant}
                    margin="normal" />}
                />
              </div>
              <TextField
                label="Anteckningar"
                variant={inputVariant}
                className={style.wideControl}
                multiline
                rows={4}
                value={individual.notes ?? ''}
                onChange={(event) => {updateIndividual('notes', event.currentTarget.value)}}
              />
              <h2>Härstamning</h2>
              <h3>Far</h3>
              <TextField
                  disabled
                  label="Genbanksnr. (öra höger)"
                  className={style.control}
                  variant={inputVariant}
                  value={father?.number ?? ''}
                  onChange={(event) => {updateIndividual('father.genebank', event.currentTarget.value)}}
                />
              <TextField
                  disabled
                  label="År, kull, individ (öra vänster)"
                  className={style.control}
                  variant={inputVariant}
                  value={father?.number ?? ''}
                  onChange={(event) => {updateIndividual('father.number', event.currentTarget.value)}}
                />
              <TextField
                disabled={!(isNew || canManage)}
                label="Namn"
                className={style.control}
                variant={inputVariant}
                value={father?.name ?? ''}
                onChange={(event) => {updateIndividual('father.name', event.currentTarget.value)}}
              />
              <TextField
                disabled={!(isNew || canManage)}
                label="Färg/ kännetecken"
                className={style.control}
                variant={inputVariant}
                value={father?.color ?? ''}
                onChange={(event) => {updateIndividual('father.name', event.currentTarget.value)}}
              />
              <h3>Mor</h3>
              <TextField
                  disabled
                  label="Genbanksnr. (öra höger)"
                  className={style.control}
                  variant={inputVariant}
                  value={mother?.number ?? ''}
                  onChange={(event) => {updateIndividual('father.genebank', event.currentTarget.value)}}
                />
              <TextField
                  disabled
                  label="År, kull, individ (öra vänster)"
                  className={style.control}
                  variant={inputVariant}
                  value={mother?.number ?? ''}
                  onChange={(event) => {updateIndividual('father.number', event.currentTarget.value)}}
                />
              <TextField
                disabled={!(isNew || canManage)}
                label="Namn"
                className={style.control}
                variant={inputVariant}
                value={mother?.name ?? ''}
                onChange={(event) => {updateIndividual('father.name', event.currentTarget.value)}}
              />
              <TextField
                disabled={!(isNew || canManage)}
                label="Färg/ kännetecken"
                className={style.control}
                variant={inputVariant}
                value={mother?.color ?? ''}
                onChange={(event) => {updateIndividual('father.name', event.currentTarget.value)}}
              />
            </div>     
          </div>
          <div className={style.paneControls}>
            <Button variant="contained"
                    color="primary"
                    onClick={() => save(individual)}>
              {'Spara'}
            </Button>
          </div>
        </MuiPickersUtilsProvider>
      </div>
    : <div className={style.loading}>
        <h2>Loading data</h2>
        <CircularProgress />
      </div>
  }
    </>
}