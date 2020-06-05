import * as React from 'react'

import {post, get} from './communication'

/** The currently logged in user, if any */
export interface User {
  email: string | null
  validated: boolean
  is_admin: boolean
  is_manager: Array<number> | undefined
  is_owner: Array<number> | undefined
}

/** The currently logged in user, if any, and functionality to log in and log out */
export interface UserContext {
  user: User | undefined
  login(username: string, password: string): void
  logout(): void
}

const dummy_user_context: UserContext = {
  user: undefined,
  login() {},
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
export function WithUserContext(props: {children: React.ReactNode}) {
  const [user, set_state] = React.useState(undefined as undefined | User)

  async function handle_promise(promise: Promise<{user: User | null}>) {
    return await promise.then(
      data => {
        console.log(data)
        set_state(data ?? undefined as any)
        return data && true
      },
      error => {
        console.error(error)
        set_state(undefined)
          return false
      })
  }

  async function login(username: string, password: string) {
    return await handle_promise(post('/api/login', {username, password})).then(
      success => success
    )
  }

  function logout() {
    handle_promise(get('/api/logout'))
  }

  function on_mount() {
    handle_promise(get('/api/user'))
  }

  React.useEffect(on_mount, [])

  return (
    <UserContext.Provider value={{user, login, logout}}>
      {props.children}
    </UserContext.Provider>
  )
}

