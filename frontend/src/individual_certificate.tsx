import React from 'react';

import { Button, Checkbox, CircularProgress, FormControlLabel, makeStyles, TextField, Typography } from '@material-ui/core';
import { MuiPickersUtilsProvider, KeyboardDatePicker } from '@material-ui/pickers';
import { Autocomplete } from '@material-ui/lab';
import DateFnsUtils from '@date-io/date-fns';

import { IndividualView } from '@app/individual_view';
import { CertificateSummary } from '@app/certificate_summary';
import { get, patch, post } from '@app/communication';
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


export function IndividualCertificate({id}: {id: string }) {
    const [individual, setIndividual] = React.useState(undefined as Individual | undefined)
    const [father, setFather] = React.useState(undefined as Individual | undefined)
    const [mother, setMother] = React.useState(undefined as Individual | undefined)
    const [fathersFather, setFathersFather] = React.useState(undefined as Individual | undefined)
    const [fathersMother, setFathersMother] = React.useState(undefined as Individual | undefined)
    const [mothersFather, setMothersFather] = React.useState(undefined as Individual | undefined)
    const [mothersMother, setMothersMother] = React.useState(undefined as Individual | undefined)
    const [isNew, setIsNew] = React.useState(!!id as boolean) // probably unnecessary in the cert form
    const [showForm, setShowForm] = React.useState(false as boolean)
    const [showSummary, setShowSummary] = React.useState(false as boolean)
    const [showComplete, setShowComplete] = React.useState(false as boolean)
    const [username, setUsername] = React.useState('')
    const [password, setPassword] = React.useState('')
    const [isUserGood, setIsUserGood] = React.useState(false)
    const { user } = useUserContext()
    const { genebanks, colors } = useDataContext()
    const { popup } = useMessageContext()
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
          setShowForm(true)
        },
        error => {
          console.error(error);
          userMessage(error, 'error')
        }
      )
      : userMessage('You do not have permission to edit this individual', 'error')
  }, [id, user])

  //Fetch data for inddividuals parents
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

  //Fetch data for individuals grandparents on father's side
  React.useEffect(() => {
      get(`/api/individual/${father?.father?.number}`).then(
        (data: Individual) => {
          setFathersFather(data)
        },
        error => {
          console.error(error);
          userMessage(error, 'error')
        }
      )
      get(`/api/individual/${father?.mother?.number}`).then(
        (data: Individual) => {
          setFathersMother(data)
          console.log(mother)
        },
        error => {
          console.error(error);
          userMessage(error, 'error')
        }
      )
  }, [father])

  //Fetch data for individuals grandparents on mother's side
  React.useEffect(() => {
    get(`/api/individual/${mother?.father?.number}`).then(
      (data: Individual) => {
        setMothersFather(data)
      },
      error => {
        console.error(error);
        userMessage(error, 'error')
      }
    )
    get(`/api/individual/${mother?.mother?.number}`).then(
      (data: Individual) => {
        setMothersMother(data)
        console.log(mother)
      },
      error => {
        console.error(error);
        userMessage(error, 'error')
      }
    )
}, [mother])
    
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

  
  async function authenticate(username: string, password: string) {
    return await post('/api/login', {username, password}).then(
      data => {
        data ? setIsUserGood(true) : setIsUserGood(false)
        return data
      }, 
      error => {
        userMessage('Något gick fel.')
        return 'error'
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
      {individual && showForm ?
      <div className={style.form}>
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
            </div>     
          </div>
          <div className={style.paneControls}>
            <Button variant="contained"
                    color="primary"

                    onClick={() => popup(<IndividualView id={id} />, `/individual/${id}`)}>
              {'Tillbaka'}
            </Button>
          </div>
          <div className={style.paneControls}>
            <Button variant="contained"
                    color="primary"
                    onClick={() => {
                      setShowForm(false);
                      setShowSummary(true);
                    }}>                    
              {'Nästa steg'}
            </Button>
          </div>
        </MuiPickersUtilsProvider>
      </div>
    : !individual && !showSummary ?
      <div className={style.loading}>
        <h2>Loading data</h2>
        <CircularProgress />
      </div>
    : individual && showSummary ?
    <>
      <h1>Är allt korrekt?</h1>
      <div>
        <h2>Identitet</h2>
        <p>Ras: {individual.genebank}</p>
        <p>Namn: {individual.name} </p>
        <p>Genbanksnummer: {individual.number} </p>
        <p>Kön: {individual.sex} </p>
        <p>Födelsedatum: {individual.birth_date} </p>
        <p>Foto finns:  </p>
        <p>Färg/kännetecken: {individual.color} </p>
        <p>Avvikande hårlag:  {individual.hair_notes}</p>
        <p>Färg på buken: {individual.belly_color} </p>
        <p>Ögonfärg: {individual.eye_color} </p>
        <p>Klofärg(er): {individual.claw_color} </p>
        <p>Antal totalt födda i kullen: {individual.litter} </p>
        <p>Antal levande i kullen: </p>
        <p>Övriga upplysningar: {individual.notes}</p>
      </div>
      <div>
        <h2>Härstammning</h2>
        <div>
          <h3>Far</h3>
          <p>Genbanksnummer: {father?.number}</p>
          <p>Namn: {father?.name}</p>
          <p>Färg/kännetecken: {father?.color}</p>
        </div>
        <div>
          <h3>Mor</h3>
          <p>Genbanksnummer: {mother?.number}</p>
          <p>Namn: {mother?.name}</p>
          <p>Färg/kännetecken: {mother?.color}</p>
        </div>
        <div>
          <h3>Farfar</h3>
          <p>Genbanksnummer: {fathersFather?.number}</p>
          <p>Namn: {fathersFather?.name}</p>
          <p>Färg/kännetecken: {fathersFather?.color}</p>
        </div> <div>
          <h3>Farmor</h3>
          <p>Genbanksnummer: {fathersMother?.number}</p>
          <p>Namn: {fathersMother?.name}</p>
          <p>Färg/kännetecken: {fathersMother?.color}</p>
        </div>
        <div>
          <h3>Morfar</h3>
          <p>Genbanksnummer: {mothersFather?.number}</p>
          <p>Namn: {mothersFather?.name}</p>
          <p>Färg/kännetecken: {mothersFather?.color}</p>
        </div> <div>
          <h3>Mormor</h3>
          <p>Genbanksnummer: {mothersMother?.number}</p>
          <p>Namn: {mothersMother?.name}</p>
          <p>Färg/kännetecken: {mothersMother?.color}</p>
        </div>
      </div>
      <div>
        <h2>Bekräftelse</h2>
        <p>För att intyga att allt är korrekt, ange ditt användernamn 
          eller e-postadress och ditt lösenord igen.</p>
        <TextField
          id="username"
          variant={inputVariant}
          autoFocus
          margin="dense"
          label="Användarnamn eller E-postadress"
          type="email"
          value={username}
          onChange={e => setUsername(e.target.value)}
          fullWidth
        />
        <TextField
          id="password"
          variant={inputVariant}
          margin="dense"
          label="Lösenord"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          fullWidth
        />
        <Button variant="contained"
          color="primary"
          onClick={() => authenticate(username, password)}>
          {'Bekräfta'}
        </Button>

        <p>Jag intyger att alla uppgifter är korrekta.</p>
          <Button variant="contained"
                  color="primary"
                  disabled={isUserGood ? false : true}
                  onClick={() => {
                    save(individual);
                    setShowSummary(false);
                    setShowComplete(true)
                  }}>                    
            {'Beställ certifikat'}
          </Button>
      </div>
      <div className={style.paneControls}>
            <Button variant="contained"
                    color="primary"
                    onClick={() => {
                      setShowForm(true)
                      setShowSummary(false)
                    }}>
              {'Tillbaka'}
            </Button>
          </div>
    </>
    : individual && showComplete ? 
      <>
        <h1>Här är ditt certifikat!</h1>
      </>
    : <> 
      </>
  }
  </>
}