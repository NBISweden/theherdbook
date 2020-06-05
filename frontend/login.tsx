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
export function Login(props) {
  const [open, setOpen] = React.useState(true);
  const {login, logout} = useUserContext()
  const [username, set_username] = useState('')
  const [password, set_password] = useState('')
  const history = useHistory()

  const close = () => {
    setOpen(false)
    history.push("/")
  }

  const submitLogin = () => {
    login(username, password).then(
      success => success && history.push("/")
    )
  }


  return <>
    <Dialog open={open} onClose={close} aria-labelledby="form-dialog-title">
      <DialogTitle id="form-dialog-title">Logga in</DialogTitle>
      <DialogContent>
        <DialogContentText>
          Logga in med din E-post-adress och ditt lösenord.
        </DialogContentText>
        <TextField
          autoFocus
          margin="dense"
          label="E-postadress"
          type="email"
          value={username}
          onChange={e => set_username(e.target.value)}
          fullWidth
        />
        <TextField
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
        <Button onClick={submitLogin} color="primary">
          Logga in
        </Button>
      </DialogActions>
    </Dialog>
  </>
}
