/**
 * @file This file contains the IndividualEdit function. This function allows a
 * user (with the required permissions) to edit an individual given by `id`, or
 * add a new individual if `herdId` is given.
 */
import React from 'react'
import { makeStyles } from '@material-ui/core/styles';
import { get, update } from '@app/communication';
import { asLocale, BodyFat, DateBodyfat, dateFormat, DateWeight, Individual,
         individualLabel, inputVariant, LimitedIndividual, OptionType, ServerMessage,
        } from '@app/data_context_global';
import { useMessageContext } from '@app/message_context';
import { Button, CircularProgress, InputAdornment, TextField,
        } from '@material-ui/core';
import { MuiPickersUtilsProvider } from '@material-ui/pickers'
import DateFnsUtils from '@date-io/date-fns'
import { KeyboardDatePicker } from '@material-ui/pickers';
import { useUserContext } from '@app/user_context';
import { useDataContext } from '@app/data_context';
import { Autocomplete } from '@material-ui/lab';

const useStyles = makeStyles({
  loading: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  form: {
    display: 'flex',
    height: '100%',
    overflow: 'hidden',
    flexDirection: 'column',
    width: '95%',
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
  flexRow: {
    display: 'flex',
    flexDirection: 'row',
  },
  control: {
    margin: '5px',
    minWidth: '195px',
    paddingRight: '5px',
  },
  wideControl: {
    margin: '5px',
    minWidth: '195px',
    width: '100%',
    paddingRight: '5px',
  },
  measureList: {
    position: 'relative',
  },
  listButton: {
    position: 'absolute',
    right: '50px',
    top: 0,
  },
  scriptLink: {
    color: 'blue',
    cursor: 'pointer',
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
  const [isNew, setIsNew] = React.useState(!!id as boolean)
  const [bodyfat, setBodyfat] = React.useState('normal')
  const [weight, setWeight] = React.useState(3.0)
  const [hullDate, setHullDate] = React.useState(asLocale())
  const [weightDate, setWeightDate] = React.useState(asLocale())
  const { user } = useUserContext()
  const { genebanks, colors } = useDataContext()
  const {userMessage} = useMessageContext()
  const canManage: boolean = React.useMemo(() => {
    return user?.canEdit(individual?.genebank)
  }, [user, individual])
  const style  = useStyles()

  const sexOptions = [{value: 'female', label: 'Hona'},
                      {value: 'male', label: 'Hane'},
                      {value: 'unknown', label: 'Okänd'}]
  const bodyfatOptions: OptionType[] = [{value: 'low', label: 'Låg'},
                                        {value: 'normal', label: 'Normal'},
                                        {value: 'high', label: 'Hög'},]
  const colorOptions: OptionType[] = React.useMemo(() => {
    if (individual && colors && Object.keys(colors).includes(individual.genebank)) {
      return colors[individual.genebank].map(c => {
        return {value: c.name, label: `${c.id} - ${c.name}`}
      })
    }
    return []
  }, [colors, individual])
  const genebankIndividuals = React.useMemo(() => {
    if (individual && colors) {
      const genebank = genebanks.find(g => g.name == individual.genebank)
      if (genebank) {
        return genebank.individuals
      }
    }
    return []
  }, [genebanks, individual])
  const motherOptions: OptionType[] = React.useMemo(() => {
    return genebankIndividuals.filter(i => i.sex == 'female').map(i => {
      return {value: i.number, label: individualLabel(i)}
    })
  }, [genebankIndividuals])
  const fatherOptions: OptionType[] = React.useMemo(() => {
    return genebankIndividuals.filter(i => i.sex == 'male').map(i => {
      return {value: i.number, label: individualLabel(i)}
    })
  }, [genebankIndividuals])

  const asIndividual = (number: string | undefined): LimitedIndividual | null => {
    if (number === null) {
      return null
    }
    const individual = genebankIndividuals.find(i => i.number == number)
    return individual ? individual : null
  }

  const removeMeasure = (field: 'weights' | 'bodyfat', index: number) => {
    console.debug('Deleting ', field, 'number', index)
    if (individual && individual[field]) {
      individual[field].splice(index, 1)
      updateField(field, individual[field])
    }
  }

  /**
   * Fetch individual data from the backend
   */
  React.useEffect(() => {
    user && user.canEdit(id) ?
      get(`/api/individual/${id}`).then(
        (data: Individual) => {
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
        <MuiPickersUtilsProvider utils={DateFnsUtils}>
          <div className={style.flexRowOrColumn}>
            <div className={style.formPane}>
              <div className={style.titleText}>
                Redigera Individ
              </div>
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
                  onChange={(event) => {updateField('number', event.currentTarget.value)}}
                />
                <TextField
                  disabled={!(isNew || canManage)}
                  label="Certifikat"
                  className={style.control}
                  variant={inputVariant}
                  value={individual.certificate ?? ''}
                  onChange={(event) => {updateField('certificate', event.currentTarget.value)}}
                />
              </div>
              <TextField
                disabled={!(isNew || canManage)}
                label="Namn"
                className={style.control}
                variant={inputVariant}
                value={individual.name ?? ''}
                onChange={(event) => {updateField('name', event.currentTarget.value)}}
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
                    updateField('sex', newValue?.value ?? '')
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
                  onChange={(date, value) => {value && updateField('birth_date', value)}}
                />
              </div>
              <div className={style.flexRow}>
                <Autocomplete
                  disabled={!(isNew || canManage)}
                  options={motherOptions ?? []}
                  value={motherOptions.find(option => option.value == individual?.mother?.number) ?? motherOptions[0]}
                  getOptionLabel={(option: OptionType) => option.label}
                  renderInput={(params) => <TextField {...params}
                    label="Mor"
                    className={style.control}
                    variant={inputVariant}
                    margin="normal" />}
                  onChange={(event: any, newValue: OptionType | null) => {
                    updateField('mother', asIndividual(newValue?.value))
                  }}
                />
                <Autocomplete
                  disabled={!(isNew || canManage)}
                  options={fatherOptions ?? []}
                  value={fatherOptions.find(option => option.value == individual?.father?.number) ?? fatherOptions[0]}
                  getOptionLabel={(option: OptionType) => option.label}
                  renderInput={(params) => <TextField {...params}
                    label="Far"
                    className={style.control}
                    variant={inputVariant}
                    margin="normal" />}
                  onChange={(event: any, newValue: OptionType | null) => {
                    updateField('father', asIndividual(newValue?.value))
                  }}
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
                    updateField('color', newValue?.value ?? '')
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
                  onChange={(event) => {updateField('color_note', event.currentTarget.value)}}
                />
              </div>
              <TextField
                label="Anteckningar"
                variant={inputVariant}
                className={style.wideControl}
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
              <h3>Vikter</h3>
              <ul>
                {individual.weights && individual.weights.map((w: DateWeight, i: number) =>
                  <li key={i} className={style.measureList}>
                    {`${asLocale(w.date)} - ${w.weight} kg`}
                    <span className={style.listButton}>
                      [<a className={style.scriptLink} onClick={() => removeMeasure('weights', i)}>
                        Delete
                      </a>]
                    </span>
                  </li>)}
              </ul>
              <div className={style.flexRow}>
                <KeyboardDatePicker
                    autoOk
                    variant="inline"
                    className={style.control}
                    inputVariant={inputVariant}
                    label="Mätningsdatum"
                    format={dateFormat}
                    value={weightDate}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    onChange={(date, value) => {value && setWeightDate(value)}}
                  />
                <TextField label='Vikt' className={style.control}
                  value={weight}
                  type='number'
                  variant={inputVariant}
                  InputProps={{
                    endAdornment: <InputAdornment position='end'>Kg</InputAdornment>
                  }}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  onChange={(e: any) => {setWeight(e.target.value)}}
                  />
              </div>

              <Button variant="contained"
                      color="primary"
                      onClick={() => {updateField('weights', [...individual.weights, {date: weightDate, weight: weight}])}}>
                {'Lägg till viktmätning'}
              </Button>
              <h3>Hull</h3>
              <ul>
                {individual.bodyfat && individual.bodyfat.map((b: DateBodyfat, i: number) =>
                  <li key={i} className={style.measureList}>
                    {`${asLocale(b.date)} - ${b.bodyfat}`}
                    <span className={style.listButton}>
                      [<a className={style.scriptLink} onClick={() => removeMeasure('bodyfat', i)}>
                        Delete
                      </a>]
                    </span>
                  </li>)}
              </ul>
              <div className={style.flexRow}>
                <KeyboardDatePicker
                    autoOk
                    variant="inline"
                    className={style.control}
                    inputVariant={inputVariant}
                    label="Mätningsdatum"
                    format={dateFormat}
                    value={hullDate}
                    InputLabelProps={{
                      shrink: true,
                    }}
                    onChange={(date, value) => {value && setHullDate(value)}}
                  />
                <Autocomplete
                  options={bodyfatOptions ?? []}
                  value={bodyfatOptions.find(option => option.value == bodyfat) ?? sexOptions[1]}
                  getOptionLabel={(option: OptionType) => option.label}
                  renderInput={(params) => <TextField {...params}
                    label="Hull"
                    className={style.control}
                    variant={inputVariant}
                    margin="normal" />}
                  onChange={(event: any, newValue: OptionType | null) => {
                    setBodyfat(newValue?.value ?? 'normal')
                  }}
                />
              </div>
              <Button variant="contained"
                      color="primary"
                      onClick={() => {updateField('bodyfat', [...individual.bodyfat, {date: hullDate, bodyfat: bodyfat as BodyFat}])}}>
                {'Lägg till hullmätning'}
              </Button>
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
