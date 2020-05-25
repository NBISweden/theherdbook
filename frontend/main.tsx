import * as React from 'react'
import * as ReactDOM from 'react-dom'
import styled, * as sc from 'styled-components'

import {Login} from './login'
import {UserInfo} from './user_info'
import {WithUserContext} from './user_context'

const CSS = sc.createGlobalStyle`
  body {
    font-family: 'Roboto';
    margin: 1cm;
  }
`

function Main() {
  return <>
    <WithUserContext>
      <h1>The herdbook</h1>
      <Login/>
      <div>
        <UserInfo/>
      </div>
    </WithUserContext>
    <CSS/>
  </>
}

ReactDOM.render(<Main/>, document.querySelector('#root'))

declare const module: {hot?: {accept: Function}}
module.hot && module.hot.accept()
