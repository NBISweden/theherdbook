
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
import {Genebank} from './genebank'
import {HerdView} from './herd_view'
import {Manage} from './manage'
import {Individual} from './individual'
import {Pedigree} from './pedigree-family-tree'
import {PedigreeD3} from './pedigree-d3'
import {PedigreeVisNetwork} from './pedigree-vis-network'
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
      path: "/genebanks",
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
        <ui.Routed path="/genebank/:id">
          {params => <Genebank id={params.id}/>}
        </ui.Routed>
        <ui.Routed path="/herd/:id">
          {params => <HerdView id={params.id}/>}
        </ui.Routed>
        <ui.Routed path="/individual/:id">
          {params => <Individual id={params.id}/>}
        </ui.Routed>
        <ui.Routed path="/pedigree-family/:id">
          {params => <Pedigree id={params.id}/>}
        </ui.Routed>
        <ui.Routed path="/pedigreeD3/:id">
          {params => <PedigreeD3 id={params.id}/>}
        </ui.Routed>
        <ui.Routed path="/pedigree/:id">
          {params => <PedigreeVisNetwork id={params.id}/>}
        </ui.Routed>
        <Route path="/">
          Welcome!
        </Route>
      </Switch>
    </div>
  </>
}
