/**
 * @file This file contains the ManageUser function. This function is used for
 * add users and set user permissions.
 */
import React from 'react'
import { MenuItem, InputLabel, Select, TextField, Checkbox, FormControlLabel, Button } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { get, post, update } from './communication';
import { useDataContext } from './data_context'
import { Genebank, Herd } from '~data_context_global';

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
});

/** description of a user to manage */
export interface ManagedUser {
  id: number
  email: string
  validated: boolean
  privileges: any
  password?: string
}

/**
 * Provides a form for changing user metadata and user roles.
 */
export function ManageUser({id}: {id: number | string | undefined}) {
  const {genebanks, loadData} = useDataContext()
  const [user, setUser] = React.useState(undefined as ManagedUser | undefined)
  const [isNew, setNew] = React.useState(false)
  const [level, setLevel] = React.useState("owner")
  const [genebank, setGenebank] = React.useState(0)
  const [herds, setHerds] = React.useState([] as Herd[])
  const [herd, setHerd] = React.useState(0)
  const classes = useStyles();

  const loadUser = (id: number) => {
    setNew(false)
    get(`/api/manage/user/${id}`).then(
      data => data && setUser(data),
      error => console.error(error)
    );
  }

  React.useEffect(() => {
    if (typeof id == 'number') {
      loadUser(id)
    } else if (id == 'new') {
      setNew(true)
      setUser({id: -1, email: '', validated: false, privileges: []})
    }
  }, [id])

  React.useEffect(() => {
    if (genebanks.length > 0) {
      selectGenebank(genebanks[0].id)
    }
  }, [genebanks])

  const selectGenebank = (gId: number) => {
    setGenebank(gId);
    const genebankData = genebanks.find(g => g.id == gId);
    if (genebankData) {
      setHerds(genebankData.herds)
      if (herds.length > 0 && herds.filter(h => herd == h.id).length == 0) {
        setHerd(herds[0].id)
      }
    } else {
      setHerds([])
      setHerd(0)
    }
  }

  const submitForm = () => {
    let postData = Object.assign({}, user);
    delete postData["privileges"];
    let protocol = isNew ? post : update;
    protocol(`/api/manage/user/${id == 'new' ? 0 : id}`, postData).then(
      data => {
        switch (data.status) {
          case "updated": console.info("updated."); break; // updated user
          case "success":
            loadData(["users"]).then(
              success => loadUser(data.id)
            )
            break; // added user
          default: console.warn("status:", data)// "failed" or other erro
        }
      },
      error => console.error(error)
    )
  }

  const updateRole = (operation: any) => {
    post('/api/manage/role', operation).then(
      data => {
        switch (data.status) {
          case "updated": loadUser(id)
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
        Spara
      </Button>
    </>
    }

    {!isNew && <>
      <h3>Behörigheter</h3>
      <ul>
        {user && <>
          {user.privileges.map((role: any, i: number) => {
              return <li key={i}>
                {role.level}
                {role.genebank && `, Genebank: ${role.genebank}`}
                {role.herd && `, herd: ${role.herd}`}
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
              </li>
            })
          }
        </>}
      </ul>

      <h3>Lägg till behörighet</h3>
      <form className={classes.form} noValidate autoComplete="off">
        <InputLabel>Behörighetsnivå</InputLabel>
        <Select value={level} onChange={(e: any) => setLevel(e.target.value)}>
          <MenuItem value="owner">Ägare</MenuItem>
          <MenuItem value="manager">Manager</MenuItem>
          <MenuItem value="specialist">Genetisk Specialist</MenuItem>
        </Select>

        <InputLabel>Genbank</InputLabel>
        <Select value={genebank} onChange={(e: any) => selectGenebank(e.target.value)}>
          {genebanks.map((g: Genebank) =>
            <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
          )}
        </Select>
        { level == 'owner' ? <>
          <InputLabel>Besättning</InputLabel>
          <Select value={herd} onChange={(e: any) => setHerd(e.target.value)}>
            {herds.map((h: Herd) =>
              <MenuItem key={h.id} value={h.id}>G{h.herd}{h.herd_name ? ` - ${h.herd_name}` : ''}</MenuItem>
             )
            }
          </Select>
          </>
          : ''
        }
        <Button variant="contained"
                color="primary"
                onClick={() => updateRole({action: 'add',
                                          role: level,
                                          user: user ? user.id : -1,
                                          genebank: level != 'owner' ? genebank : undefined,
                                          herd: level == 'owner' ? herd : undefined}
                        )}>
          Lägg till
        </Button>
      </form>
    </>
    }
  </>
}
