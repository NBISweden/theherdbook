/**
 * @file This file contains the ManageUser function. This function is used for
 * add users and set user permissions.
 */
import React from 'react'
import { TextField, Checkbox, FormControlLabel, Button } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { get, post, update } from './communication';

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
}

/**
 * Provides a form for changing user metadata and user roles.
 */
export function ManageUser({id}: {id: number | undefined}) {
  const [user, setUser] = React.useState(undefined as ManagedUser | undefined)
  const classes = useStyles();

  React.useEffect(() => {
    if (id) {
      get(`/api/manage/user/${id}`).then(
        data => data && setUser(data),
        error => console.error(error)
      );
    }
  }, [id])

  const submitForm = () => {
    let postData = Object.assign({}, user);
    delete postData["privileges"];
    update(`/api/manage/user/${id}`, postData).then(
      data => {
        switch (data.status) {
          case "updated": console.debug("updated successfully"); break;
          default: console.debug("status:", data)// "failed" or other erro
        }
      },
      error => console.error(error)
    )
  }

  const updateRole = (operation: any) => {
    post('/api/manage/role', operation).then(
      data => {
        switch (data.status) {
          case "updated": console.debug("updated successfully"); break;
          default: console.debug("status:", data)// "failed" or other erro
        }
      },
      error => console.error(error)
    )
  }

  return <>
    {user && <>
      <h2>{user.email}</h2>
      <form className={classes.form} noValidate autoComplete="off">
          <TextField label='E-mail'
                     className={classes.simpleField}
                     value={user.email ?? undefined}
                     onChange={e => setUser({...user, email: e.target.value})}
            />
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
