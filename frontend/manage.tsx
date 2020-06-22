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
import {
  BrowserRouter,
  Switch,
  Route,
  Link,
  useRouteMatch,
  useHistory,
} from "react-router-dom";

import { useDataContext } from './data_context'
import { ManageHerds } from '~manage_herds'
import { ManageUsers } from '~manage_users'

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

/**
 * Provides genebanks management forms for granting and revoking herd
 * permissions, and managing herd animals.
 */
export function Manage({id}: {id: number | undefined}) {
  const {genebanks} = useDataContext()
  const [genebank, setGenebank] = React.useState(undefined as any)
  const [currentTab, setTab] = React.useState(0);
  const classes = useStyles()
  let history = useHistory()
  let match = useRouteMatch()

  function selectGenebank(id: number | undefined) {
    if (id == undefined && genebanks.length > 0) {
      history.push(`manage/${genebanks[0].id}`)
    } else {
      let data = genebanks.filter(g => g.id == id)
      if (data.length > 0) {
        setGenebank(data[0])
      }
    }
  }

  React.useEffect(() => {
    selectGenebank(id);
  }, [genebanks, id])

  React.useEffect(() => {
    let subPath = undefined
    if (location.pathname.search(match.url) == 0) {
      subPath = location.pathname.replace(match.url, '')
      if (subPath.search('/herds') == 0) {
        setTab(0)
      } else if (subPath.search('/users') == 0) {
        setTab(1)
      }
    }
  }, [history])

  const tabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setTab(newValue)
  }

  return <>
    <Breadcrumbs className={classes.breadcrumbs} separator="&bull;" aria-label="breadcrumb">
      {
        genebanks.map((g:any, i:number) => {
          return  <Link key={i} to={`/manage/${g.id}`} className={classes.breadcrumb}>
                    <Typography color={genebank && g.id == genebank.id ? 'primary' : 'textSecondary'}>
                      {g.name}
                    </Typography>
                  </Link>
        })
      }
    </Breadcrumbs>
    <Paper className={classes.paper}>
      <BrowserRouter>
        <Tabs value={currentTab}
              onChange={tabChange}
              indicatorColor="primary"
              textColor="primary"
          >
          <Link to={`${match.url}/herds`}><Tab label="Besättningar" /></Link>
          <Link to={`${match.url}/users`}><Tab label="Användare" /></Link>
        </Tabs>
        <Switch>
          <Route path={`${match.path}/herds`}>
            <ManageHerds id={id}/>
          </Route>
          <Route path={`${match.path}/users`}>
            <ManageUsers/>
          </Route>
          <Route path={match.path}>
            <ManageHerds id={id}/>
          </Route>
        </Switch>
      </BrowserRouter>
    </Paper>
  </>
}
