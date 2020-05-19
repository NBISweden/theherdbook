import React, {useState} from 'react'

import {useUserContext} from './user_context'

/**
 * Shows login and logout in a form, submits it on the callbacks in the
 * User context
 */
export function Login() {
  const {login, logout} = useUserContext()
  const [username, set_username] = useState('')
  const [password, set_password] = useState('')

  return <>
    <form>
      user: <input type='text'
                   value={username}
                   onChange={e => set_username(e.target.value)}
            />
      pass: <input type='password'
                   value={password}
                   onChange={e => set_password(e.target.value)}
            />
      <button type="button" onClick={() => login(username, password)}>Login</button>
    </form>
    <button type="button" onClick={logout}>Logout</button>
  </>
}
