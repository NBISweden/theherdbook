import * as React from 'react'

import {post, get} from './communication'
import {useDataContext} from './data_context'

/** The currently logged in user, if any */
export interface User {
  email: string | null
  validated: boolean
  is_admin: boolean
  is_manager: Array<number> | undefined
  is_owner: Array<number> | undefined
}

export type Result = 'logged_in' | 'logged_out' | 'error'

/** The currently logged in user, if any, and functionality to log in and log out */
export interface UserContext {
  user: User | undefined
  login(username: string, password: string): Promise<Result>
  logout(): Promise<Result>
}

const dummy_user_context: UserContext = {
  user: undefined,
  async login() { return 'error' },
  async logout() { return 'error' }
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
  const {loadData} = useDataContext()

  async function handle_promise(promise: Promise<User | null>): Promise<Result> {
    return await promise.then(
      data => {
        console.log(data)
        set_state(data ?? undefined)
        return data ? 'logged_in' : 'logged_out'
      },
      error => {
        console.error(error)
        set_state(undefined)
        return 'error'
      })
  }

  async function login(username: string, password: string) {
    return await handle_promise(post('/api/login', {username, password})).then(
      success => {
        if (success == 'logged_in') {
          loadData('all')
        }
        return success;
      }
    )
  }

  function logout() {
    let status = handle_promise(get('/api/logout'))
    loadData('none')
    return status
  }

  function on_mount() {
    handle_promise(get('/api/user'))
  }

  React.useEffect(on_mount, [])

  const value = React.useMemo(() => {
    return {user, login, logout}
  }, [user, loadData])

  return (
    <UserContext.Provider value={value}>
      {props.children}
    </UserContext.Provider>
  )
}

