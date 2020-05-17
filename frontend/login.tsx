import React, {useState} from 'react';

import {post} from './communication';

/**
 * Returns a login form that will send a POST request to the given url.
 *
 * @param props A properties object, including a "url" key. If no url key is
 *     given, the submission url will default to '/login'.
 */
export function Login(props: any) {
  const url = props.url ?? '/login'
  const [username, set_username] = useState('')
  const [password, set_password] = useState('')

  /**
   * Submits the form (using the values stored in `state`) to the url given to
   * this module.
   */
  const submitLogin = () => {
    const state = {username, password}
    post(url, state).then(
      data => console.debug("user:", data),
      error => console.error(error)
    );
    return false;
  }

  return <>
    <form>
      user: <input type='text'
                   id='username'
                   value={username}
                   onChange={e => set_username(e.target.value)}
            />
      pass: <input type='password'
                   id='password'
                   value={password}
                   onChange={e => set_password(e.target.value)}
            />
      <button type="button" onClick={submitLogin}>Login</button>
    </form>
  </>
}
