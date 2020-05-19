import * as React from 'react'

import {post, get} from './communication'

interface User {
  email: string | null
  active: boolean
}

const null_user: User = {
  email: null,
  active: false
}

const dummy_user_context = {
  user: null_user,
  login(username: string, password: string) {},
  logout() {}
}

const UserContext = React.createContext(dummy_user_context)

export function useUserContext() {
  return React.useContext(UserContext)
}

export function WithUserContext(props: {children: React.ReactNode[]}) {
  const [user, set_state] = React.useState(null_user)

  function handle_promise(promise: Promise<User | undefined>) {
    promise.then(
      data => {
        console.log(data)
        set_state(data as any)
      },
      error => {
        console.error(error)
        set_state(null_user)
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

