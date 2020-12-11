import * as React from 'react'

import {post, get} from '@app/communication'
import {useDataContext} from '@app/data_context'

/** The currently logged in user, if any */
export interface User {
  email: string | null
  username: string | undefined
  validated: boolean
  is_admin: boolean
  is_manager: Array<number> | undefined
  is_owner: Array<string> | undefined
  canEdit: Function
}

export type Result = 'logged_in' | 'logged_out' | 'error'

/**
 * The user state is either a user object or `undefined` (waiting for login) or
 * `null` (anonymous/logged out). This is convienent since we can identify the
 * state of the user login check if needed, but we can also easily find if a
 * user object is available by boolean checking.
 */
export type UserState = User | undefined | null

/** The currently logged in user, if any, and functionality to log in and log out */
export interface UserContext {
  user: UserState
  login(username: string, password: string): Promise<Result>
  logout(): Promise<Result>
}

const dummy_user_context: UserContext = {
  user: null,
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
  const [user, setUser] = React.useState(null as UserState)
  const {loadData} = useDataContext()
  const {genebanks} = useDataContext()

  async function handleLogin(promise: Promise<User | null>): Promise<Result> {
    return await promise.then(
      data => {
        console.log(data)
        setUser(data ?? null)
        return data ? 'logged_in' : 'logged_out'
      },
      error => {
        console.error(error)
        setUser(null)
        return 'error'
      })
  }

  async function login(username: string, password: string) {
    setUser(undefined)
    return await handleLogin(post('/api/login', {username, password})).then(
      success => {
        if (success == 'logged_in') {
          loadData('all')
        }
        return success;
      }
    )
  }

  function canEdit(id: string) {
    if (!user) {
      return false
    }
    // administrators can edit everything
    if (user.is_admin) {
      return true
    }

    // id is an individual.
    // currently no permissions are on the individual level, but it's added as
    // a future-proofing option.
    if (/^([a-zA-Z][0-9]+-[0-9]+)$/.test(id)) {
      const herd:string = id.split('-')[0]
      const genebank = genebanks.find(genebank => genebank.herds.some(h => h.herd == herd))
      // you can edit if you own the herd, or are manager of the genebank
      if (user.is_owner?.includes(herd) || (genebank && user.is_manager?.includes(+genebank.id))) {
        return true
      }
    }
    // id is a herd
    else if (/^([a-zA-Z]X?[0-9]+)$/.test(id)) {
      const genebank = genebanks.find(genebank => genebank.herds.some(h => h.herd == id))
      // you can edit if you own the herd, or are manager of the genebank
      if (user.is_owner?.includes(id) || (genebank && user.is_manager?.includes(+genebank.id))) {
        return true
      }
    }
    // id is a genebank
    else if (genebanks.find(genebank => genebank.name == id)) {
      const genebank = genebanks.find(genebank => genebank.name == id)
      // you can edit if you are manager of the genebank
      if (genebank && user.is_manager?.includes(+genebank.id)) {
        return true
      }
    }
    return false
  }

  function logout() {
    let status = handleLogin(get('/api/logout'))
    loadData('none')
    return status
  }

  function on_mount() {
    handleLogin(get('/api/user'))
  }

  React.useEffect(on_mount, [])

  const value = React.useMemo(() => {
    if (user) {
      user.canEdit = canEdit
    }
    return {user, login, logout}
  }, [user, loadData, canEdit])

  return (
    <UserContext.Provider value={value}>
      {props.children}
    </UserContext.Provider>
  )
}

