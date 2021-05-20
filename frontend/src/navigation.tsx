import * as React from "react";
import { Switch, Route, useLocation, Redirect } from "react-router-dom";

import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import HomeIcon from "@material-ui/icons/Home";
import AccountBalanceIcon from "@material-ui/icons/AccountBalance";
import VpnKeyIcon from "@material-ui/icons/VpnKey";
import MeetingRoom from "@material-ui/icons/MeetingRoom";
import GroupIcon from "@material-ui/icons/Group";

import { Login } from "@app/login";
import { Genebanks } from "@app/genebanks";
import { HerdView } from "@app/herd_view";
import { Manage } from "@app/manage";
import { Owner } from "@app/owner";
import { IndividualPedigree } from "@app/individual_pedigree";
import { IndividualView } from "@app/individual_view";
import { HerdPedigree } from "@app/herd_pedigree";
import { useUserContext } from "@app/user_context";
import { InbreedingForm } from '@app/testbreed_form'
import * as ui from "@app/ui_utils";

// Define styles for tab menu
const useStyles = makeStyles({
  root: {
    flexGrow: 1,
  },
  main: {
    height: "calc(100% - 72px)",
  },
});

function Restricted(props: { children: React.ReactElement }) {
  const { user } = useUserContext();
  const location = useLocation();
  return user ? (
    props.children
  ) : (
    <Redirect to={{ pathname: "/login", state: { from: location } }} />
  );
}

export function Navigation() {
  const classes = useStyles();
  const { logout } = useUserContext();
  const { user } = useUserContext();
  const is_admin = !!(user?.is_manager || user?.is_admin);
  const is_owner = !!(user?.is_owner && user.is_owner.length > 0);
  const is_logged_in = !!user;

  const tabs: ui.RoutedTab[] = [
    {
      label: "Hem",
      path: "/",
      exact: true,
      component: "Welcome!",
      visible: true,
      icon: <HomeIcon />,
    },
    {
      label: "Genbanker",
      path: "/genebank",
      component: (
        <Restricted>
          <Genebanks />
        </Restricted>
      ),
      visible: is_logged_in,
      icon: <AccountBalanceIcon />,
    },
    {
      label: "Provparning",
      path: "/provparning",
      component:  (
        <Restricted>
          <InbreedingForm />
        </Restricted>
      ),
      visible: is_logged_in,
      icon: <AccountBalanceIcon />
    },
    {
      label:
        user?.is_owner && user.is_owner.length > 1
          ? "Mina besättningar"
          : "Min besättning",
      path: "/owner",
      component: (
        <Restricted>
          <Owner />
        </Restricted>
      ),
      visible: is_owner,
      icon: <GroupIcon />,
    },
    {
      label: "Administrera",
      path: "/manage",
      component: (
        <Restricted>
          <Manage />
        </Restricted>
      ),
      visible: is_admin,
      icon: <GroupIcon />,
    },
    {
      label: "Inställningar",
      path: "/settings",
      component: (
        <Restricted>
          <Settings />
        </Restricted>
      ),
      visible: is_logged_in,
      icon: <GroupIcon />,
    },

    {
      label: "Logga in",
      path: "/login",
      component: <Login />,
      visible: !is_logged_in,
      icon: <MeetingRoom />,
    },
    {
      label: "Logga ut",
      path: "/",
      exact: true,
      visible: is_logged_in,
      on_click: logout,
      icon: <VpnKeyIcon />,
    },
  ];

  const { Tabs, TabbedRoutes } = ui.useRoutedTabs(tabs);

  return (
    <>
      {/* Insert the tab menu */}
      <Paper className={classes.root}>
        <Tabs centered />
      </Paper>

      {/* Declare routes, and what component should be rendered for each
       * route.
       */}

      <div className={classes.main}>
        <Switch>
          {TabbedRoutes}
          <ui.Routed path="/herd/:id">
            {(params) => (
              <Restricted>
                <HerdView id={params.id} />
              </Restricted>
            )}
          </ui.Routed>
          <ui.Routed path="/individual/:id">
            {(params) => (
              <Restricted>
                <IndividualView id={params.id} />
              </Restricted>
            )}
          </ui.Routed>
          <ui.Routed path="/individual-pedigree/:id/:generations?">
            {(params) => (
              <Restricted>
                <IndividualPedigree
                  id={params.id}
                  generations={params.generations ? +params.generations : 5}
                />
              </Restricted>
            )}
          </ui.Routed>
          <ui.Routed path="/herd-pedigree/:id">
            {(params) => (
              <Restricted>
                <HerdPedigree id={params.id} />
              </Restricted>
            )}
          </ui.Routed>
          <Route path="/">Welcome!</Route>
        </Switch>
      </div>
    </>
  );
}
