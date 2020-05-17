import * as React from 'react'
import * as ReactDOM from 'react-dom'
import styled, * as sc from 'styled-components'

import { Login } from './login';

const CSS = sc.createGlobalStyle`
  body {
    font-family: 'Roboto';
    margin: 1cm;
  }
`

function Main() {
  return <>
    <h1>The herdbook</h1>
    <Login url="/api/login"/>
    <CSS/>
  </>
}

ReactDOM.render(<Main/>, document.querySelector('#root'))

declare const module: {hot?: {accept: Function}}
module.hot && module.hot.accept()
