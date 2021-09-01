import * as React from "react";
import * as ReactDOM from "react-dom";
import styled, * as sc from "styled-components";
import CssBaseline from "@material-ui/core/CssBaseline";
import { BrowserRouter } from "react-router-dom";

import { WithUserContext } from "@app/user_context";
import { WithDataContext } from "@app/data_context";
import { WithMessageContext } from "@app/message_context";
import { WithBreedingContext } from "@app/breeding_context";
import { Navigation } from "@app/navigation";

const Main = (
  <>
    <CssBaseline />
    <BrowserRouter>
      <WithDataContext>
        <WithUserContext>
          <WithMessageContext>
            <WithBreedingContext>
              <Navigation />
            </WithBreedingContext>
          </WithMessageContext>
        </WithUserContext>
      </WithDataContext>
    </BrowserRouter>
  </>
);

ReactDOM.render(Main, document.querySelector("#root"));

// https://www.snowpack.dev/#hot-module-replacement
import.meta?.hot?.accept(); // Dan: OK to ignore esbuild warning on this line
