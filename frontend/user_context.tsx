import * as React from 'react'

import {post, get} from './communication'

/** The currently logged in user, if any */
export interface User {
  email: string | null
  validated: boolean
}

/** The currently logged in user, if any, and functionality to log in and log out */
export interface UserContext {
  user: User | undefined
  login(username: string, password: string)
  logout()
}

const dummy_user_context: UserContext = {
  user: undefined,
  login(username: string, password: string) {},
  logout() {}
}

const UserContext = React.createContext(dummy_user_context)

/** Get the currently logged in user, if any, and functionality to log in and log out */
export function useUserContext(): UserContext {
  return React.useContext(UserContext)
}

/** Setup context for the logged in user and functionality to log in and log out

  Wrap the main app in this to have access to the user context:
    <WithUserContext>
      // app...
    </WithUserContext>

  The actual user state is stored in a cookie synced with a session on the backend.
  When this component is mounted it checks if there is currently a cookie and sets
  the state accordingly if so.

*/
export function WithUserContext(props: {children: React.ReactNode[]}) {
  const [user, set_state] = React.useState(undefined)

  function handle_promise(promise: Promise<User | undefined>) {
    promise.then(
      data => {
        console.log(data)
        set_state(data['user'] as any)
      },
      error => {
        console.error(error)
        set_state(undefined)
      })
  }

  function login(username: string, password: string) {
    handle_promise(post('/api/login', {username, password}))
  }

  function logout() {
    handle_promise(get('/api/logout'))
  }

  function on_mount() {
    handle_promise(get('/api/user'))
  }

  React.useLayoutEffect(on_mount, [])

  return (
    <UserContext.Provider value={{user, login, logout}}>
      {props.children}
    </UserContext.Provider>
  )
}

