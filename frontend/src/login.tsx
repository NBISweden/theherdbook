import React, {useState} from 'react'
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField';
import Dialog from '@material-ui/core/Dialog';
import DialogActions from '@material-ui/core/DialogActions';
import DialogContent from '@material-ui/core/DialogContent';
import DialogContentText from '@material-ui/core/DialogContentText';
import DialogTitle from '@material-ui/core/DialogTitle';
import {useHistory} from 'react-router-dom'

import {useUserContext} from './user_context'

/**
 * Shows login and logout in a form, submits it to the user context callbacks
 */
export function Login() {
  const [open, setOpen] = React.useState(true);
  const {login} = useUserContext()
  const [username, set_username] = useState('')
  const [password, set_password] = useState('')
  const history = useHistory()

  const close = () => {
    setOpen(false)
    history.push("/")
  }

  const submitLogin = () => {
    login(username, password).then(
      status => {
        if (status == 'logged_in') {
          history.goBack()
        }
      }
    )
  }

  const keydown = (e: React.KeyboardEvent<any>) => {
    // Cannot get TextField to trigger onSubmit so listen for keydown instead
    if (e.key == 'Enter') {
      submitLogin()
    }
  }

  return <>
    <Dialog open={open} onClose={close} aria-labelledby="form-dialog-title">
      <DialogTitle>Logga in</DialogTitle>
      <form onSubmit={submitLogin} onKeyDown={keydown}>
        <DialogContent>
          <DialogContentText>
            Logga in med ditt användarnamn eller e-postadress och ditt lösenord.
          </DialogContentText>
          <TextField
            id="username"
            variant="outlined"
            autoFocus
            margin="dense"
            label="Användarnamn eller E-postadress"
            type="email"
            value={username}
            onChange={e => set_username(e.target.value)}
            onSubmit={submitLogin}
            fullWidth
          />
          <TextField
            id="password"
            variant="outlined"
            margin="dense"
            label="Lösenord"
            type="password"
            value={password}
            onChange={e => set_password(e.target.value)}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={close} color="primary">
            Avbryt
          </Button>
          <Button onClick={submitLogin} color="primary" aria-label="Logga in">
            Logga in
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  </>
}
