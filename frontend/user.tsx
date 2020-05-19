import React, {useContext, useEffect} from 'react';
import {get} from './communication';
import {UserContext} from './user-context';

/**
 * Shows the user information stored in `UserContext`. If no user is active, the
 * component will check /api/user to see if user information can be fetched from
 * the user session.
 */
export function UserInfo() {
  const {user, setUser} = useContext(UserContext);
  useEffect(() => {
    if (user.email === null) {
      get('/api/user').then(
        data => setUser(data),
        error => console.error(error),
      )
    }
  }, []) // empty list of dependencies: is never rerun (only run on component mount)

  return <>
    {user ? <>Email: {user.email ? user.email : 'anonymous'}</> : ''}
  </>
}
