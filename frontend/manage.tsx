/**
 * @file This file contains the Manage function. This function is used for
 * granting and revoking permissions from users, as well as approving requests
 * for adding individuals to herds in the genebanks you manage.
 */
import React from 'react'
import Breadcrumbs from '@material-ui/core/Breadcrumbs';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import { makeStyles } from '@material-ui/core/styles';
import * as Router from 'react-router-dom'
import {
  BrowserRouter,
  Switch,
  Route,
  Link,
  useRouteMatch,
  useHistory,
} from "react-router-dom";

import { useDataContext } from './data_context'
import { ManageHerds } from './manage_herds'
import { ManageUsers } from './manage_users'

// Define styles for tab menu
const useStyles = makeStyles({
  breadcrumbs: {
    padding: "15px",
    paddingBottom: 0,
  },
  paper: {
    height: "calc(100% - 39px)", // remove breadcrumb height
  },
  breadcrumb: {
    textDecoration: "none",
  },
  spacer: {
    height: '39px',
  }
});

/**
 * Props for controlling a TabPanel. the `index` and `value` are compared to
 * check if the panel should be visible (`index` == `value`) or hidden.
 */
interface TabPanelProps {
  children?: React.ReactNode;
  index: any;
  value: any;
  className?: any;
}

import * as ui from './ui_utils'

function InnerPaper(props: {id: number}) {
  const classes = useStyles()
  const {genebanks} = useDataContext()
  const [genebank, setGenebank] = React.useState(undefined as any)

  const id = props.id

  function selectGenebank(id: number) {
    const data = genebanks.find(g => g.id == id)
    if (data) {
      setGenebank(data)
    }
  }

  React.useEffect(() => {
    selectGenebank(id);
  }, [id])

  const tabs: ui.RoutedTab[] = [
    {
      path: '/herds',
      label: 'Besättningar',
      component: <ManageHerds id={id}/>,
    },
    {
      path: '/users',
      label: 'Användare',
      component: <ManageUsers/>
    },
  ]

  const {Tabs, TabbedRoutes} = ui.useRoutedTabs(tabs, {autoselect_first: true})

  return (
    <Paper className={classes.paper}>
      <Tabs/>
      <Switch>
        {TabbedRoutes}
      </Switch>
    </Paper>
  )
}


/**
 * Provides genebanks management forms for granting and revoking herd
 * permissions, and managing herd animals.
 */
export function Manage() {
  const {genebanks} = useDataContext()

  const tabs: ui.RoutedTab[] = genebanks.map(g => ({
    path: `/${g.id}`,
    label: g.name,
    component: <InnerPaper id={g.id}/>,
  }))

  const {Tabs, TabbedRoutes} = ui.useRoutedTabs(tabs, {autoselect_first: true})

  return <>
    <Tabs/>
    <Switch>
      {TabbedRoutes}
    </Switch>
  </>
}

