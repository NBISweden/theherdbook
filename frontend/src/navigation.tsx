
import * as React from 'react'
import * as Router from 'react-router-dom'
import {Switch, Route, Redirect} from 'react-router-dom'

import { makeStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';

import HomeIcon from '@material-ui/icons/Home';
import AccountBalanceIcon from '@material-ui/icons/AccountBalance';
import VpnKeyIcon from '@material-ui/icons/VpnKey';
import MeetingRoom from '@material-ui/icons/MeetingRoom';
import GroupIcon from '@material-ui/icons/Group';

import { Login } from '@app/login'
import { Genebanks } from '@app/genebanks'
import { HerdView } from '@app/herd_view'
import { Manage } from '@app/manage'
import { Owner } from '@app/owner';
import { IndividualPedigree } from '@app/individual_pedigree'
import { IndividualView } from '@app/individual_view'
import { HerdPedigree } from '@app/herd_pedigree'
import { useUserContext } from '@app/user_context'
import * as ui from '@app/ui_utils'

// Define styles for tab menu
const useStyles = makeStyles({
  root: {
    flexGrow: 1,
  },
  main: {
    height: "calc(100% - 72px)",
  }
});

function RoutedInner(props: {children: (params: Record<string, string>) => React.ReactNode}) {
  const params = Router.useParams()
  return <>
    {props.children(params)}
  </>
}

/**
 * Public route, which exposes router parameters to make it easy to pass them on
 * to children.
 */
export function PublicRoute(props: {path: string, children: (params: Record<string, string>) => React.ReactNode}) {
  return (
    <Route path={props.path}>
      <RoutedInner>
        {props.children}
      </RoutedInner>
    </Route>
  )
}

/**
 * Authenticated Route, that behaves just like PublicRoute, except that it
 * redirects to /login if no user is logged in.
 */
function AuthRoute(props: {path: string, children: (params: Record<string, string>) => React.ReactNode}) {
  const {user} = useUserContext();
  return (
    <Route path = {props.path}
      render={({ location }) =>
        user ? <RoutedInner>
                 {props.children}
               </RoutedInner>
             : <Redirect to={{ pathname: "/login", state: { from: location } }}/>
      }
    />
  );
}

export function Navigation() {

  const classes = useStyles();
  const {logout} = useUserContext();
  const {user} = useUserContext();
  const is_admin = !!(user?.is_manager || user?.is_admin)
  const is_owner = !!(user?.is_owner && user.is_owner.length > 0)
  const is_logged_in = !!user

  const tabs: ui.RoutedTab[] = [
    {
      label: "Hem",
      path: "/",
      exact: true,
      component: 'Welcome!',
      visible: true,
      icon: <HomeIcon />
    },
    {
      label: "Genbanker",
      path: "/genebank",
      component: <Genebanks/>,
      visible: is_logged_in,
      restricted: true,
      icon: <AccountBalanceIcon />
    },
    {
      label: user?.is_owner && user.is_owner.length > 1
             ? 'Mina besättningar'
             : 'Min besättning',
      path: "/owner",
      component: <Owner/>,
      visible: is_owner,
      restricted: true,
      icon: <GroupIcon />
    },
    {
      label: "Administrera",
      path: "/manage",
      component: <Manage/>,
      visible: is_admin,
      restricted: true,
      icon: <GroupIcon />
    },
    {
      label: "Logga in",
      path: "/login",
      component: <Login/>,
      visible: !is_logged_in,
      icon: <MeetingRoom />
    },
    {
      label: "Logga ut",
      path: "/",
      exact: true,
      visible: is_logged_in,
      on_click: logout,
      icon: <VpnKeyIcon />
    },
  ]

  const {Tabs} = ui.useRoutedTabs(tabs)

  const url = Router.useRouteMatch().url.replace(/\/$/, '')
  const matchprops = (tab: ui.RoutedTab): ui.MatchProps => {
    const {path, exact, strict, sensitive} = tab
    return {path: url + path, exact, strict, sensitive}
  }

  return <>
    {/* Insert the tab menu */}
    <Paper className={classes.root}>
      <Tabs centered/>
    </Paper>

    {/* Declare routes, and what component should be rendered for each
      * route.
      */}

    <div className={classes.main}>
      <Switch>
        {// Route all tabs that are restricted to /login, if the user isn't
         // already logged in.
        }
        {tabs.map((tab, i) =>
          tab.path && tab.component &&
            <Route {...matchprops(tab)} key={i}
              render={({ location }) =>
                !tab.restricted || user
                  ? tab.component
                  : <Redirect to={{ pathname: "/login", state: { from: location } }}/>
              }
            />
          )
        }
        <AuthRoute path="/herd/:id">
          {params => <HerdView id={params.id}/>}
        </AuthRoute>
        <AuthRoute path="/individual/:id">
          {params => <IndividualView id={params.id} />}
        </AuthRoute>
        <AuthRoute path="/individual-pedigree/:id/:generations?">
          {params => <IndividualPedigree id={params.id} generations={params.generations ? +params.generations : 5}/>}
        </AuthRoute>
        <AuthRoute path="/herd-pedigree/:id">
          {params => <HerdPedigree id={params.id}/>}
        </AuthRoute>
        <Route path="/">
          Welcome!
        </Route>
      </Switch>
    </div>
  </>
}
