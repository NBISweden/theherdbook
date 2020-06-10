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
import { Box, TextField } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import {Link} from "react-router-dom";

import { useUserContext } from './user_context'
import { get } from './communication';

// Define styles for tab menu
const useStyles = makeStyles({
  breadcrumbs: {
    padding: "15px",
    paddingBottom: 0,
  },
  paper: {
    height: "calc(100% - 39px)", // remove breadcrumb height
  },
  form: {
    borderLeft: "1px solid rgba(0,0,0,0.1)",
    paddingLeft: "0.5cm",
    display: "flex",
    flexDirection: "column",
  },
  simpleField: {
    width: "400px",
  },
  controls: {
    height: "100%",
    width: "100%",
    padding: "0.5cm 1cm",
    overflowY: "scroll",
  },
  tabPanel: {
    height: "calc(100% - 48px)",
    padding: "0",
    display: "flex",
    flexDirection: "row",
  },
  verticalTabs: {
    height: "100%",
    width: "250px",
    margin: "0",
    borderRight: `1px solid rgba(0,0,0,0.2)`,
  },
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
  const {user} = useUserContext();
  const [genebanks, setGenebanks] = React.useState([] as any[])
  const [genebank, setGenebank] = React.useState(undefined as any)
  const [herd, setHerd] = React.useState(undefined as any)
  const [currentTab, setTab] = React.useState(0);
  const [herdTab, setHerdTab] = React.useState(0);
  const [loading, setLoading] = React.useState(true);
  const classes = useStyles();
  const simpleFields = [
    {key: 'name', title: "Namn"},
    {key: 'email', title: "E-post"},
    {key: 'mobile_phone', title: "Mobiltelefon"},
    {key: 'wire_phone', title: "Fast telefon"},
    {key: 'physical_address', title: "Adress"},
    {key: 'www', title: "Hemsida"},
  ];

  function selectGenebank(id: number) {
    get(`/api/genebank/${id}`).then(
      data => {
        if (!data) {
          return;
        }
        setGenebank(data);
        fetchHerd(data.herds[herdTab].id);
      },
      error => console.error(error)
    );
  }

  function fetchHerd(id: number) {
    setLoading(true);
    get(`/api/herd/${id}`).then(
      data => {
        data && setHerd(data);
        setLoading(false);
      },
      error => console.error(error)
    );
  }

  React.useEffect(() => {
    get('/api/genebanks').then(
      data => {
        if (!data) {
          return;
        }
        setGenebanks(data);
        selectGenebank(data[0].id);
      },
      error => console.error(error)
    );
  }, [user])

  const tabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setTab(newValue);
  };

  const herdChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setHerdTab(newValue);
    if (genebank) {
      fetchHerd(genebank.herds[newValue].id);
    }
  };

  const setFormField = (label: string, value: string | number) => {
    herd[label] = value;
    setHerd(herd);
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

        <Box className={classes.controls}>
          {loading && <h2>Loading...</h2> || herd && <>
            <h1>{herd.name ?? `Besättning ${herd.id}`}</h1>
            <form className={classes.form} noValidate autoComplete="off">
              {simpleFields.map((field: any, i: number) => {
                return <TextField
                        key={i}
                        id={field.key}
                        label={field.title}
                        value={herd[field.key] ?? undefined}
                        className={classes.simpleField}
                        onChange={e => setFormField(field.key, e.target.value)} />
              })}
            </form>
            <h2>Individer</h2>
            <ul>
              {herd.individuals.map((individual: any, i:number) => {
                return <Link key={i} to={`/individual/${individual.id}`}>
                <li>{individual.name ?? individual.number}</li>
                </Link>
              })}
            </ul>
          </>}
        </Box>
      </TabPanel>
      <TabPanel value={currentTab} index={1} className={classes.tabPanel}>
        Användarkontroller kommer att hamna här.
      </TabPanel>
    </Paper>
  </>
}
