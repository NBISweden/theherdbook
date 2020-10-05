
import * as React from 'react'
import { makeStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import HomeIcon from '@material-ui/icons/Home';
import AccountBalanceIcon from '@material-ui/icons/AccountBalance';
import VpnKeyIcon from '@material-ui/icons/VpnKey';
import MeetingRoom from '@material-ui/icons/MeetingRoom';
import GroupIcon from '@material-ui/icons/Group';
import {Login} from './login'
import {Genebanks} from './genebanks'
import {HerdView} from './herd_view'
import {Manage} from './manage'
import {IndividualPedigree} from './individual_pedigree'
import {HerdPedigree} from './herd_pedigree'
import {Switch, Route} from 'react-router-dom'
import {useUserContext} from './user_context'
import * as ui from './ui_utils'

// Define styles for tab menu
const useStyles = makeStyles({
  root: {
    flexGrow: 1,
  },
  main: {
    height: "calc(100% - 72px)",
  }
});

export function Navigation() {

  const classes = useStyles();
  const {logout} = useUserContext();
  const {user} = useUserContext();
  const is_admin = !!(user?.is_manager || user?.is_admin)
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
      icon: <AccountBalanceIcon />
    },
    {
      label: "Administrera",
      path: "/manage",
      component: <Manage/>,
      visible: is_admin,
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

  const {Tabs, TabbedRoutes} = ui.useRoutedTabs(tabs)

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
        {TabbedRoutes}
        <ui.Routed path="/herd/:id">
          {params => <HerdView id={params.id}/>}
        </ui.Routed>
        <ui.Routed path="/individual/:id/:generations?">
          {params => <IndividualPedigree id={params.id} generations={params.generations ? +params.generations : 5}/>}
        </ui.Routed>
        <ui.Routed path="/herd-pedigree/:id">
          {params => <HerdPedigree id={params.id}/>}
        </ui.Routed>
        <Route path="/">
          Welcome!
        </Route>
      </Switch>
    </div>
  </>
}
