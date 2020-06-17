import * as React from 'react'
import * as ReactDOM from 'react-dom'
import styled, * as sc from 'styled-components'
import CssBaseline from '@material-ui/core/CssBaseline';
import {makeStyles} from '@material-ui/core/styles';
import {
  BrowserRouter,
  Switch,
  Route,
  useParams
} from 'react-router-dom'

import {Login} from './login'
import {WithUserContext} from './user_context'
import {WithDataContext} from './data_context'
import {TabMenu} from './navigation'
import {Genebanks} from './genebanks'
import {Genebank} from './genebank'
import {Herd} from './herd'
import {Manage} from './manage'
import {Individual} from './individual'

const CSS = sc.createGlobalStyle`
  html, #root {
    margin: 0;
    padding: 0;
    height: 100%;
    width: 100%;
  }
  body {
    font-family: 'Roboto';
    height: calc(100% - 1.1cm);
    padding: 0;
    margin: 1cm;
    margin-bottom: 0.1cm;
    overflow-y: hidden;
  }
`
const useMainStyle = makeStyles({
  main: {
    height: "calc(100% - 72px)",
  }
});

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
  const classes = useMainStyle();
  return <>
    <CssBaseline />
    <WithDataContext>
      <WithUserContext>
        <BrowserRouter>
          {/* Insert the tab menu */}
          <TabMenu/>

          {/* Declare routes, and what component should be rendered for each
            * route.
            */}

          <div className={classes.main}>
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
              <Route path="/manage">
                <Manage/>
              </Route>
              <Route path="/">
                Welcome!
              </Route>
            </Switch>
          </div>
        </BrowserRouter>
      </WithUserContext>
    </WithDataContext>
    <CSS/>
  </>
}

ReactDOM.render(<Main/>, document.querySelector('#root'))

declare const module: {hot?: {accept: Function}}
module.hot && module.hot.accept()
