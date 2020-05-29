import React, {useState} from 'react'

import {useUserContext} from './user_context'

/**
 * Shows login and logout in a form, submits it to the user context callbacks
 */
export function Login() {
  const {login, logout} = useUserContext()
  const [username, set_username] = useState('')
  const [password, set_password] = useState('')

  return <>
    <form>
      <label>
        user: <input type='text'
                     value={username}
                     onChange={e => set_username(e.target.value)}
              />
      </label>
      <label>
        pass: <input type='password'
                     value={password}
                     onChange={e => set_password(e.target.value)}
              />
      </label>
      <button type="button" onClick={() => login(username, password)}>Login</button>
    </form>
    <button type="button" onClick={logout}>Logout</button>
  </>
}
