/**
 * @file This file contains the Genebanks function. This function is used for
 * parsing through the herd and individuals data.
 */
import React from 'react'
import Breadcrumbs from '@material-ui/core/Breadcrumbs';
import Typography from '@material-ui/core/Typography';
import Paper from '@material-ui/core/Paper';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import { Box } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import { Herd } from '~herd'
import { Individuals } from '~individuals'

import { useDataContext } from './data_context'

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
    height: "100%",
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
 * Provides individual and herd tabs for parsing through the data in the
 * genebanks.
 */
export function Genebanks() {
  const {genebanks} = useDataContext()
  const [genebank, setGenebank] = React.useState(undefined as any)
  const [herd, setHerd] = React.useState(undefined as any)
  const [currentTab, setTab] = React.useState(0);
  const [herdTab, setHerdTab] = React.useState(0);
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
  }, [genebanks])

  const tabChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setTab(newValue);
  };

  const herdChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setHerdTab(newValue);
    if (genebank) {
      setHerd(genebank.herds[newValue].id);
    }
  };

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
           <Tab label="Individer" />
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
          <Herd id={herd} />
        </Box>
      </TabPanel>
      <TabPanel value={currentTab} index={1} className={classes.tabPanel}>
        <Individuals id={genebank ? genebank.id : null} />
      </TabPanel>
    </Paper>
  </>
}
