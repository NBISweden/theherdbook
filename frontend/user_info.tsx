import * as React from 'react'

import {useUserContext} from './user_context'

export function UserInfo() {
  const {user} = useUserContext()
  return <>
    {user ? <>Email: {user.email ? user.email : 'anonymous'}</> : ''}
  </>
}
