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

function triple<A,B,C>(a: A, b: B, c: C): [A, B, C] {
  return [a, b, c]
}

function useMartinState<State extends Record<string, any>>(init: State) {
  const [state, set_state] = useState(init)
  return triple(
    state,
    (field: keyof State) => ({
      value: state[field],
      onChange: (e: React.ChangeEvent<any>) => {
        const value = e.target.value
        set_state(state => ({...state, [field]: value}))
      }
    }),
    set_state,
  )
}

/**
 * Shows login and logout in a form, submits it to the user context callbacks
 */
export function Login() {
  const [open, setOpen] = React.useState(true);
  const {login} = useUserContext()
  const [state, bind_state] = useMartinState({username: '', password: ''})
  const history = useHistory()

  const close = () => {
    setOpen(false)
    history.push("/")
  }

  const submitLogin = () => {
    login(state.username, state.password).then(
      status => {
        if (status == 'logged_in') {
          history.push("/")
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
            Logga in med din e-postadress och ditt lösenord.
          </DialogContentText>
          <TextField
            id="username"
            variant="outlined"
            autoFocus
            margin="dense"
            label="E-postadress"
            type="email"
            {...bind_state('username')}
            onSubmit={submitLogin}
            fullWidth
          />
          <TextField
            id="password"
            variant="outlined"
            margin="dense"
            label="Lösenord"
            type="password"
            {...bind_state('password')}
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
