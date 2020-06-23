/**
 * @file This file contains the ManageUser function. This function is used for
 * add users and set user permissions.
 */
import React from 'react'
import { TextField, Checkbox, FormControlLabel, Button } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { get, post, update } from './communication';
import { useDataContext } from './data_context'

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
  const [user, setUser] = React.useState(undefined as ManagedUser | undefined)
  const [isNew, setNew] = React.useState(false)
  const {loadData} = useDataContext()
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
          case "updated": console.debug("updated successfully"); break; // updated user
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
    <h3>Roles</h3>
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
  </>
}
