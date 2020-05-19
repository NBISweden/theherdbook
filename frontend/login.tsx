import React, {useContext, useState} from 'react';

import {UserContext} from './user-context';

import {get, post} from './communication';

/**
 * Returns a login form that will send a POST request to the given url.
 *
 * @param props A properties object, including a "url" key. If no url key is
 *     given, the submission url will default to '/login'.
 */
export function Login(props: any) {
  const url = props.url ?? '/login'
  const {user, setUser} = useContext(UserContext);
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  /**
   * Submits the form (using the values stored in `state`) to the url given to
   * this module.
   */
  const submitLogin = (e) => {
    e.preventDefault();
    const state = {username, password}
    post(url, state).then(
      data => setUser(data),
      error => console.error(error)
    );
  }

  const logout = () => {
    get('/api/logout').then(
      data => setUser(data),
      error => console.error(error)
    );
  }

  return <>
    <form>
      user: <input type='text'
                   id='username'
                   value={username}
                   onChange={e => setUsername(e.target.value)}
            />
      pass: <input type='password'
                   id='password'
                   value={password}
                   onChange={e => setPassword(e.target.value)}
            />
      <button type="button" onClick={submitLogin}>Login</button>
    </form>
    <button onClick={logout}>Logout</button>
  </>
}
