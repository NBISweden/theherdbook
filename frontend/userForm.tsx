/**
 * @file This file contains the UserForm function. This function is used to
 * change user information and permissions.
 */
import React from 'react'
import { unstable_batchedUpdates } from 'react-dom'
import { TextField, Checkbox, FormControlLabel,
         Button, TableContainer, Paper, Table, TableBody, TableRow, TableCell, TableHead } from '@material-ui/core';
import Select from 'react-select';
import { makeStyles } from '@material-ui/core/styles';
import { get, post, update } from './communication';
import { useDataContext } from './data_context'
import { Herd, Genebank, herdLabel } from '~data_context_global';
import { useHistory } from 'react-router-dom';
import { useMessageContext } from '~message_context';

// Define styles for tab menu
const useStyles = makeStyles({
  form: {
    borderLeft: "1px solid rgba(0,0,0,0.1)",
    paddingLeft: "0.5cm",
    display: "flex",
    flexDirection: "column",
  },
  simpleField: {
    width: "400px",
  },
  permissionTable: {
  },
  permissionTitle: {
    fontWeight: "bold",
    textTransform: "capitalize",
  },
  hidden: {
    visibility: "hidden",
  }
});

/** description of a user to manage */
export interface ManagedUser {
  id: number | 'new'
  email: string
  validated: boolean
  privileges: any
  password?: string
}

const defaultValues: ManagedUser = {
  id: -1,
  email: "",
  validated: false,
  privileges: [],
  password: ""
}

/** These are the permission levels that can be added using the user form */
const PermissionLevels = [{value: 'owner', label: 'Owner'},
                          {value: 'manager', label: 'Manager'},
                          {value: 'specialist', label: 'Genetic Specialist'},
                          ];
/**
 * Provides a form for changing user metadata and user roles. The form will
 * load data for the user id `id` if it's a number, or for a new user if `id` is
 * `undefined` or `'new'`.
 */
export function UserForm({id}: {id: number | 'new' | undefined}) {
  const {genebanks, loadData} = useDataContext()
  const {userMessage} = useMessageContext()
  const [user, setUser] = React.useState({...defaultValues} as ManagedUser)
  const [isNew, setNew] = React.useState(false)
  const [level, setLevel] = React.useState(PermissionLevels[0])
  const [genebank, setGenebank] = React.useState(genebanks.length > 0 ? {value: genebanks[0].id, label: genebanks[0].name} : null)
  const [herd, setHerd] = React.useState(null as any)
  const history = useHistory()
  const classes = useStyles();

  const loadUser = (id: number) => {
    get(`/api/manage/user/${id}`).then(
      data => {
        if (data) {
          unstable_batchedUpdates(() => {
            setUser(data)
            setNew(false)
          })
        } else {
          setNew(true)
        }
      },
      error => console.error(error)
    );
  }

  /**
   * Loads the user information for `id`, or sets the form to accept a new user.
   */
  React.useEffect(() => {
    setUser({...defaultValues})
    if (typeof id == 'number') {
      loadUser(id)
      setNew(false)
    } else if (id == 'new' || !id) {
      setNew(true)
    }
  }, [id])

  /**
   * If `isNew` is set, this function creates a POST request to create a new
   * user in the backend, and then navigates to edit the new user. Otherwise
   * the current form is sent as an UPDATE request to update the user `id`.
   */
  const submitForm = () => {
    let postData = {...user};
    delete postData["privileges"];
    let protocol = isNew ? post : update;
    protocol(`/api/manage/user/${id == 'new' ? 0 : id}`, postData).then(
      data => {
        switch (data.status) {
          case "updated":
            userMessage('Changes saved', 'success')
            break; // updated user
          case "success":
            history.push(`/manage/user/${data.id}`)
            unstable_batchedUpdates(() => {
              setNew(false);
              userMessage('User saved', 'success')
            })
            break; // added user
          default:
            userMessage('Error: ' + data?.status ?? data, 'error')
            console.warn("status:", data)// "failed" or other error
        }
      },
      error => console.error(error)
    )
  }

  /**
   * Returns a list of all herds of the genebank identified by `genebankId`,
   * formatted as react-select options, i.e. `{value: <id>, label: <name>}`.
   *
   * @param genebankId Id of the genebank to get herds from.
   */
  const genebankHerds = (genebankId: number | undefined) => {
    if (genebankId === undefined || genebank === null) {
      return []
    }

    const currentGenebank = genebanks.find((g: Genebank) => g.id == genebank.value);
    if (currentGenebank === undefined) {
      return []
    }
    return currentGenebank.herds.map((h: Herd) => {
      return {value: h.id, label: herdLabel(h)}
    })
  }

  /**
   * Converts a herd database id to a human readable label formatted as:
   * '<herd-id>' or '<herd-id> - <herd-name>' depending on if the herd has a
   * herd name or not.
   *
   * @param herdId database id of the herd to convert.
   */
  const herdIdToLabel = (herdId: number) => {
    let allHerds: Herd[] = genebanks.flatMap((g: Genebank) => g.herds);
    const targetHerd = allHerds.find((h: Herd) => h.id == herdId)
    if (!targetHerd) {
      return 'Unknown'
    }
    return herdLabel(targetHerd)
  }

  /**
   * Sends an UPDATE request to update a user role in the database. Reloads the
   * user data on success.
   * @param operation an object describing an update operation.
   */
  type Operation = {action: 'remove' | 'add',
                    user: number}
  type HerdOperation = Operation & {role: 'owner',
                                    herd: number}
  type GenebankOperation = Operation & {role: 'manager' | 'specialist',
                                       genebank: number}
  const updateRole = (operation: HerdOperation | GenebankOperation) => {
    update('/api/manage/role', operation).then(
      data => {
        switch (data.status) {
          case "updated": if (id) {
                            loadUser(+id)
                          }
                          loadData(["users"])
                          break; // updated user
          default: console.error("error:", data)// "failed" or other error
        }
      },
      error => console.error(error)
    )
  }

  return <>
    {user && <>
      <h2>{isNew ? 'Ny användare' : user.email}</h2>
      <form className={classes.form} noValidate autoComplete="off">
          <TextField label='E-mail'
                     type='email'
                     className={classes.simpleField}
                     value={user.email ?? undefined}
                     onChange={e => setUser({...user, email: e.target.value})}
            />
          {isNew ? <TextField label='Lösenord'
                      type='password'
                      hidden={true}
                      className={classes.simpleField}
                      value={user.password ?? undefined}
                      onChange={e => setUser({...user, password: e.target.value})}
          /> : ''}
          <FormControlLabel
            control={
              <Checkbox color="primary"
                        checked={user.validated ?? undefined}
                        onChange={e => setUser({...user, validated: e.target.checked})}
                />
            }
            label="Validated"
            labelPlacement="end"
          />
      </form>
      <Button variant="contained"
              color="primary"
              onClick={() => submitForm()}>
        {isNew ? "Skapa" : "Spara" }
      </Button>
    </>
    }

    {!isNew && <>
      <h3>Behörigheter</h3>
      <TableContainer component={Paper}>
        <Table className={classes.permissionTable}>
          <TableHead>
            <TableRow>
              <TableCell>Behörighet</TableCell>
              <TableCell align="right"></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {user && user.privileges.map((role: any, i: number) => {
              return <TableRow key={i}>
                <TableCell component="th" scope="row">
                  <span className={classes.permissionTitle}>{role.level}</span>
                  {role.genebank && `, ${genebanks.find((g:Genebank) => g.id == role.genebank)?.name}`}
                  {role.herd && `, ${herdIdToLabel(role.herd)}`}
                </TableCell>
                <TableCell align="right">
                  <Button variant="contained"
                          color="primary"
                          onClick={() => updateRole({action: 'remove',
                                                    role: role.level,
                                                    user: user.id,
                                                    genebank: role?.genebank,
                                                    herd: role?.herd}
                                  )}>
                          Ta bort
                  </Button>
                </TableCell>
              </TableRow>
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <h3>Lägg till behörighet</h3>

        <Table className={classes.permissionTable}>
          <TableHead>
            <TableRow>
              <TableCell>Behörighet</TableCell>
              <TableCell>Genbank</TableCell>
              <TableCell>Besättning</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>
                <Select options={PermissionLevels}
                        onChange={setLevel}
                        value={level}
                        />
              </TableCell>
              <TableCell>
                <Select options={genebanks.map((g: Genebank) => {return {value: g.id, label: g.name}})}
                        onChange={(current: any) => {setGenebank(current); setHerd(null)}}
                        value={genebank}
                        />
              </TableCell>
              <TableCell>
                <Select options={genebankHerds(genebank?.value)}
                        onChange={setHerd}
                        className={level.value != 'owner' ? classes.hidden : null}
                        isDisabled={level.value != 'owner'}
                        value={herd}
                        />

              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        <Button variant="contained"
                color="primary"
                onClick={() => updateRole({action: 'add',
                                          role: level.value,
                                          user: user ? user.id : -1,
                                          genebank: level.value != 'owner' ? genebank?.value : undefined,
                                          herd: level.value == 'owner' ? herd?.value : undefined}
                        )}>
          Lägg till
        </Button>
    </>
    }
  </>
}
