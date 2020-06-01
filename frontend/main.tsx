import * as React from 'react'
import * as ReactDOM from 'react-dom'
import styled, * as sc from 'styled-components'
import {
  BrowserRouter,
  Switch,
  Route,
  Link,
  useParams
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

function Routed(props: {path: string, children: (params: Record<string, string>) => React.ReactNode}) {
  function Inner() {
    const params = useParams()
    return <>
      {props.children(params)}
    </>
  }
  return (
    <Route path={props.path}>
      <Inner/>
    </Route>
  )
}

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
            <Routed path="/genebank/:id">
              {params => <Genebank id={params.id}/>}
            </Routed>
            <Routed path="/herd/:id">
              {params => <Herd id={params.id}/>}
            </Routed>
            <Routed path="/individual/:id">
              {params => <Individual id={params.id}/>}
            </Routed>
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
