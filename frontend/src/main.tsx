import * as React from "react";
import * as ReactDOM from "react-dom";
import styled, * as sc from "styled-components";
import CssBaseline from "@material-ui/core/CssBaseline";
import CookieConsent from "react-cookie-consent";
import { BrowserRouter } from "react-router-dom";
import { SnackbarProvider } from "notistack";

import { WithUserContext } from "@app/user_context";
import { WithDataContext } from "@app/data_context";
import { WithMessageContext } from "@app/message_context";
import { WithBreedingContext } from "@app/breeding_context";
import { Navigation } from "@app/navigation";
import { StylesProvider } from "@material-ui/core";
import hotjar from "react-hotjar";

const Main = (
  <>
    <StylesProvider injectFirst>
      <CssBaseline />
      <CookieConsent buttonText="Okej! Jag förstår!">
        För att få Stamboken att fungera måste vi lagra några kakor på din
        enhet. Genom att fortsätta använda sidan godkänner du detta.
      </CookieConsent>
      <BrowserRouter>
        <WithDataContext>
          <WithUserContext>
            <WithBreedingContext>
              <SnackbarProvider maxSnack={3} autoHideDuration={10000}>
                <WithMessageContext>
                  <Navigation />
                </WithMessageContext>
              </SnackbarProvider>
            </WithBreedingContext>
          </WithUserContext>
        </WithDataContext>
      </BrowserRouter>
    </StylesProvider>
  </>
);

ReactDOM.render(Main, document.querySelector("#root"));

hotjar.hotjar.initialize(3243614, 6);
// https://www.snowpack.dev/#hot-module-replacement
import.meta?.hot?.accept(); // Dan: OK to ignore esbuild warning on this line
