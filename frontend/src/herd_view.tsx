/**
 * @file This file contains the HerdView function. This function fetches herd
 *       for a given `id` (parsed from the url), as well as the individuals
 *       belonging to that herd.
 */
import React from 'react'
import { makeStyles } from '@material-ui/core/styles';
import { get } from './communication';
import { Herd, herdLabel, Individual } from '@app/data_context_global';
import { Accordion, AccordionDetails, AccordionSummary, AppBar, Box,
         Paper, Tab, Tabs, Typography } from '@material-ui/core';
import { ExpandMore } from '@material-ui/icons'
import { HerdForm } from '@app/herdForm';
import { useMessageContext } from '@app/message_context';
import { useDataContext } from './data_context';
import { herdPedigree } from '@app/pedigree';
import { PedigreeNetwork } from './pedigree_plot';

const useStyles = makeStyles({
  container: {
    padding: "20px",
  },
  title: {
    fontSize: '1.33em',
    fontWeight: 'bold',
  }
});

interface TabPanelProps {
  children?: React.ReactNode;
  dir?: string;
  index: any;
  value: any;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`full-width-tabpanel-${index}`}
      aria-labelledby={`full-width-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box>
          {children}
        </Box>
      )}
    </div>
  );
}

type TabValue = 'list' | 'pedigree';

/**
 * Shows herd information, with a list of all individuals belonging to that
 * herd.
 */
export function HerdView({id}: {id: string | undefined}) {
  const [herd, setHerd] = React.useState(undefined as Herd | undefined)
  const [activeTab, setActiveTab] = React.useState('list' as TabValue)
  const {userMessage} = useMessageContext()
  const { genebanks } = useDataContext()
  const pedigree = React.useMemo(() => herdPedigree(genebanks, id, 5), [genebanks, id])
  const style  = useStyles()

  const fields = [
    {key: 'herd_name', title: "Besättningnamn"},
    {key: 'name', title: "Namn"},
    {key: 'email', title: "E-post"},
    {key: 'mobile_phone', title: "Mobiltelefon"},
    {key: 'wire_phone', title: "Fast telefon"},
    {key: 'physical_address', title: "Adress"},
    {key: 'www', title: "Hemsida"},
  ]

  React.useEffect(() => {
    if (id) {
      get(`/api/herd/${id}`).then(
        (data: Herd) => data && setHerd(data),
        error => {
          console.error(error)
          userMessage(error, 'error')
        }
      )
    }
  }, [id])

  return <>
    <h2>{herd && herdLabel(herd)}</h2>
    <Paper className={style.container}>
      <AppBar position="static" color="default">
        <Tabs
          value={activeTab}
          onChange={(event: React.ChangeEvent<{}>, newValue: TabValue) => {
            setActiveTab(newValue)
          }}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
          aria-label="full width tabs example"
          >
            <Tab label="List of Individuals" value='list'/>
            <Tab label="Pedigree of Individuals" value='pedigree'/>
        </Tabs>
      </AppBar>

      <TabPanel value={activeTab} index='list'>
        <ul>
          {herd && herd.individuals && herd.individuals.map((individual: Individual) =>
            <li key={individual.id}>
              {individual.number}
            </li>
          )}
        </ul>
      </TabPanel>
      <TabPanel value={activeTab} index='pedigree'>
        {pedigree && <PedigreeNetwork pedigree={pedigree} />}
      </TabPanel>

      <Accordion defaultExpanded={false}>
        <AccordionSummary
          expandIcon={<ExpandMore />}>
          <span className={style.title}>
            Kontaktperson och Besättningsinformation
          </span>
        </AccordionSummary>
        <AccordionDetails>
          {React.useMemo(() => <HerdForm id={id} />, [id])}
        </AccordionDetails>
      </Accordion>
    </Paper>
  </>
}
