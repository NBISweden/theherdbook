import * as React from 'react'
import * as ReactDOM from 'react-dom'
import styled, * as sc from 'styled-components'
import {
  BrowserRouter,
  Switch,
  Route,
  Link
} from 'react-router-dom'

import {Login} from './login'
import {UserInfo} from './user_info'
import {WithUserContext} from './user_context'
import {Genebanks} from './genebanks'
import {Genebank} from './genebank'
import {Herd} from './herd'
import {Individual} from './individual'

const CSS = sc.createGlobalStyle`
  body {
    font-family: 'Roboto';
    margin: 1cm;
  }
  nav {
    margin: 10px;
    padding: 10px;
    border-bottom: 1px solid lightgrey;
  }
  nav a {
    margin: 0 20px;
  }
`

function Main() {
  return <>
    <WithUserContext>
      <BrowserRouter>
        <h1>The herdbook</h1>
        <nav>
          <Link to="/">Home</Link>
          <Link to="/genebanks">Genebanks</Link>
          <Link to="/login">Login</Link>
          <UserInfo/>
        </nav>
        <div>
          <Switch>
            <Route path="/login">
              <Login/>
            </Route>
            <Route path="/genebanks">
              <Genebanks/>
            </Route>
            <Route path="/genebank/:genebankId">
              <Genebank/>
            </Route>
            <Route path="/herd/:herdId">
              <Herd/>
            </Route>
            <Route path="/individual/:individualId">
              <Individual/>
            </Route>
            <Route path="/">
              Welcome!
            </Route>
          </Switch>
        </div>
      </BrowserRouter>
    </WithUserContext>
    <CSS/>
  </>
}

ReactDOM.render(<Main/>, document.querySelector('#root'))

declare const module: {hot?: {accept: Function}}
module.hot && module.hot.accept()
