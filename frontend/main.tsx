import React, {useState} from 'react'
import * as ReactDOM from 'react-dom'
import styled, * as sc from 'styled-components'

import { Login } from './login';
import { User, UserContext } from './user-context';
import { UserInfo } from './user';

const CSS = sc.createGlobalStyle`
  body {
    font-family: 'Roboto';
    margin: 1cm;
  }
`

function Main() {
  const [user, setUser] = useState(new User());
  const userState = { user, setUser };
  return <>
    <h1>The herdbook</h1>
    <UserContext.Provider value={userState}>
      <Login url="/api/login"/>
      <UserInfo/>
    </UserContext.Provider>
    <CSS/>
  </>
}

ReactDOM.render(<Main/>, document.querySelector('#root'))

declare const module: {hot?: {accept: Function}}
module.hot && module.hot.accept()
