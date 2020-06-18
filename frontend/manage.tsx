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
import { Box, Button } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';

import { useDataContext } from './data_context'
import { HerdForm } from '~herdForm';
import { ManageUser } from '~manage_user';

// Define styles for tab menu
const useStyles = makeStyles({
  breadcrumbs: {
    padding: "15px",
    paddingBottom: 0,
  },
  paper: {
    height: "calc(100% - 39px)", // remove breadcrumb height
  },
  controls: {
    height: "100%",
    width: "calc(100% - 250px)",
    padding: "0.5cm 1cm",
    overflowY: "scroll",
  },
  tabPanel: {
    height: "calc(100% - 48px)",
    padding: "0",
  },
  sidebar: {
    float: "left",
    height: "100%",
    width: "250px",
    margin: "0",
    borderRight: `1px solid rgba(0,0,0,0.2)`,
    display: "flex",
    flexDirection: "column",
    alignItems: "center"
  },
  verticalTabs: {
    height: "calc(100% - 40px)",
    width: "250px",
  },
  centerButton: {
    width: "80%",
    marginBottom: "10px",
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
 * Creates a Box containing the children props of the component, which will be
 * rendered when the `index` prop is equal to the `value` prop.
 *
 * @param props - A set of `TabPanelProps` used to set content and visibility
 */
function TabPanel(props: TabPanelProps) {
  const { children, value, index, className, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      className={className}
      {...other}
    >
      {value === index && (
        <>
          {children}
        </>
      )}
    </div>
  );
}


/**
 * Provides genebanks management forms for granting and revoking herd
 * permissions, and managing herd animals.
 */
export function Manage() {
  const {genebanks, users} = useDataContext()
  const [genebank, setGenebank] = React.useState(undefined as any)
  const [herd, setHerd] = React.useState(undefined as any)
  const [currentTab, setTab] = React.useState(0);
  const [herdTab, setHerdTab] = React.useState(0);
  const [userTab, setUserTab] = React.useState(0);
  const [selectedUser, selectUser] = React.useState(undefined as number | undefined)
  const classes = useStyles();

  function selectGenebank(id: number) {
    let data = genebanks.filter(g => g.id == id)
    if (data.length > 0) {
      setGenebank(data[0])
      setHerd(data[0].herds[herdTab].id);
    }
  }

  React.useEffect(() => {
    if (genebanks.length) {
      selectGenebank(genebanks[0].id);
    }
    if (users.length > 0) {
      selectUser(users[0].id)
    }
  }, [users])

  const tabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setTab(newValue);
  };

  const herdChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setHerdTab(newValue);
    if (genebank) {
      setHerd(genebank.herds[newValue].id);
    }
  };

  const userChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setUserTab(newValue);
    selectUser(users[newValue].id)
  }

  return <>
    <Breadcrumbs className={classes.breadcrumbs} separator="&bull;" aria-label="breadcrumb">
      {
        genebanks.map((g:any, i:number) => {
                return  <a key={i} onClick={() => selectGenebank(g.id)}>
                          <Typography color={genebank && g.id == genebank.id ? 'primary' : 'textSecondary'}>
                            {g.name}
                          </Typography>
                        </a>
        })
      }
    </Breadcrumbs>
    <Paper className={classes.paper}>
      <Tabs value={currentTab}
            onChange={tabChange}
            indicatorColor="primary"
            textColor="primary"
        >
           <Tab label="Besättningar" />
           <Tab label="Användare" />
      </Tabs>
      <TabPanel value={currentTab} index={0} className={classes.tabPanel}>
        <div className={classes.sidebar}>
          <Tabs
            orientation="vertical"
            variant="scrollable"
            value={herdTab}
            onChange={herdChange}
            className={classes.verticalTabs}
          >
            {genebank &&
              genebank.herds.map((h:any, i:number) => {
                let label = `G${h.herd}`;
                if (h.name) {
                  label += ` - ${h.name}`;
                }
                return <Tab key={i} label={label} />
              })}
          </Tabs>
        </div>

        <Box className={classes.controls}>
          <HerdForm id={herd} />
        </Box>
      </TabPanel>
      <TabPanel value={currentTab} index={1} className={classes.tabPanel}>
        <div className={classes.sidebar}>
          <Tabs
              orientation="vertical"
              variant="scrollable"
              value={userTab}
              onChange={userChange}
              className={classes.verticalTabs}
            >
            {users.map((u:any, i:number) => <Tab key={i} label={u.email} />)}
          </Tabs>
          <Button className={classes.centerButton}
                  variant="contained"
                  color="primary"
                  onClick={() => console.debug("add user")}>
            Lägg till användare
          </Button>
        </div>

        <Box className={classes.controls}>
          <ManageUser id={selectedUser} />
        </Box>
      </TabPanel>
    </Paper>
  </>
}
