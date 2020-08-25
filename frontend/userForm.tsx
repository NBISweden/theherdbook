/**
 * @file This file contains the UserForm function. This function is used to
 * change user information and permissions.
 */
import React from 'react'
import { TextField, Checkbox, FormControlLabel,
         Button, TableContainer, Paper, Table, TableBody, TableRow, TableCell, TableHead } from '@material-ui/core';
import Select from 'react-select';
import { makeStyles } from '@material-ui/core/styles';
import { get, post, update } from './communication';
import { useDataContext } from './data_context'
import { Herd, Genebank } from '~data_context_global';
import { useHistory } from 'react-router-dom';

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

const PermissionLevels = [{value: 'owner', label: 'Owner'},
                          {value: 'manager', label: 'Manager'},
                          {value: 'specialist', label: 'Genetic Specialist'},
                          ];
/**
 * Provides a form for changing user metadata and user roles.
 */
export function UserForm({id}: {id: number | 'new' | undefined}) {
  const {genebanks, loadData} = useDataContext()
  const [user, setUser] = React.useState({...defaultValues} as ManagedUser)
  const [isNew, setNew] = React.useState(false)
  const [level, setLevel] = React.useState(PermissionLevels[0])
  const [genebank, setGenebank] = React.useState(genebanks.length > 0 ? {value: genebanks[0].id, label: genebanks[0].name} : null)
  const [herd, setHerd] = React.useState(null as any)
  const history = useHistory()
  const classes = useStyles();

  const loadUser = (id: number) => {
    setNew(false)
    get(`/api/manage/user/${id}`).then(
      data => data && setUser(data),
      error => console.error(error)
    );
  }

  React.useEffect(() => {
    console.debug(genebanks)
    setUser({...defaultValues})
    if (typeof id == 'number') {
      loadUser(id)
      setNew(false)
    } else if (id == 'new' || !id) {
      setNew(true)
    }
  }, [id])

  const submitForm = () => {
    let postData = {...user};
    delete postData["privileges"];
    let protocol = isNew ? post : update;
    protocol(`/api/manage/user/${id == 'new' ? 0 : id}`, postData).then(
      data => {
        switch (data.status) {
          case "updated": console.info("updated."); break; // updated user
          case "success": history.push(`/manage/user/${data.id}`); setNew(false); break; // added user
          default: console.warn("status:", data)// "failed" or other erro
        }
      },
      error => console.error(error)
    )
  }

  const genebankHerds = (genebankId: number | undefined) => {
    if (genebankId === undefined || genebank === null) {
      return []
    }

    const currentGenebank = genebanks.find((g: Genebank) => g.id == genebank.value);
    if (currentGenebank === undefined) {
      return []
    }
    return currentGenebank.herds.map((h: Herd) => {return {value: h.id, label: `${h.herd}${h.herd_name ? ` - ${h.herd_name}` : ''}`}})
  }

  const herdIdToLabel = (herdId: number) => {
    let allHerds: Herd[] = [];
    allHerds = allHerds.concat.apply(allHerds, genebanks.map((g: Genebank) => g.herds));
    console.debug("id", herdId)
    console.debug("all", allHerds)
    const targetHerd = allHerds.find((h: Herd) => h.id == herdId)
    console.debug("target", targetHerd)
    if (!targetHerd) {
      return 'Unknown'
    }
    return `${targetHerd.herd}${targetHerd.herd_name ? ` - ${targetHerd.herd_name}` : ''}`
  }

  const updateRole = (operation: any) => {
    post('/api/manage/role', operation).then(
      data => {
        switch (data.status) {
          case "updated": if (id) {
                            loadUser(+id)
                          }
                          loadData(["users"])
                          console.debug("updated successfully");
                          break; // updated user
          default: console.debug("error:", data)// "failed" or other error
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
