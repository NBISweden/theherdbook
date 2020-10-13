import * as React from 'react'
import * as ReactDOM from 'react-dom'
import styled, * as sc from 'styled-components'
import CssBaseline from '@material-ui/core/CssBaseline';
import {makeStyles} from '@material-ui/core/styles';
import {BrowserRouter} from 'react-router-dom'

import {WithUserContext} from './user_context'
import {WithDataContext} from './data_context'
import {WithMessageContext} from './message_context'
import {Navigation} from './navigation'

const CSS = sc.createGlobalStyle`
  html, #root {
    margin: 0;
    padding: 0;
    height: 100%;
    width: 100%;
  }
  body {
    font-family: 'Roboto';
    padding: 0;
    margin: 1cm;
    margin-bottom: 0.1cm;
  }
`

const Main =
  <>
    <CssBaseline />
    <BrowserRouter>
      <WithDataContext>
        <WithUserContext>
          <WithMessageContext>
              <Navigation/>
          </WithMessageContext>
        </WithUserContext>
      </WithDataContext>
    </BrowserRouter>
    <CSS/>
  </>

ReactDOM.render(Main, document.querySelector('#root'))

// https://www.snowpack.dev/#hot-module-replacement
if (import.meta.hot) {
  import.meta.hot.accept();
}

