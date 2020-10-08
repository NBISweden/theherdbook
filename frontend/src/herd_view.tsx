/**
 * @file This file contains the HerdView function. This function fetches herd
 *       for a given `id` (parsed from the url), as well as the individuals
 *       belonging to that herd.
 */
import React from 'react'
import { makeStyles } from '@material-ui/core/styles';
import { Accordion, AccordionDetails, AccordionSummary, AppBar, Box, Button,
         Dialog, DialogActions, DialogContent, DialogTitle, Paper, Tab, Tabs
        } from '@material-ui/core';
import { ExpandMore } from '@material-ui/icons'
import { get } from '@app/communication';
import { Herd, herdLabel, Individual } from '@app/data_context_global';
import { HerdForm } from '@app/herdForm';
import { useMessageContext } from '@app/message_context';
import { useDataContext } from './data_context';
import { herdPedigree } from '@app/pedigree';
import { PedigreeNetwork } from '@app/pedigree_plot';
import { IndividualView } from '@app/individual_view';

const useStyles = makeStyles({
  container: {
    padding: "20px",
  },
  title: {
    fontSize: '1.33em',
    fontWeight: 'bold',
  },
  animalList: {
    cursor: 'pointer',
    '&:hover': {
      color: 'blue',
    }
  },
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
  const [showIndividual, setShowIndividual] = React.useState(false as string | false)
  const {userMessage} = useMessageContext()
  const { genebanks } = useDataContext()
  const pedigree = React.useMemo(() => herdPedigree(genebanks, id, 5), [genebanks, id])
  const style  = useStyles()

  const closeIndividual = () => {
    setShowIndividual(false)
  }

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
    <Paper className={style.container}>
      {React.useMemo(() => <HerdForm id={id} view='info'/>, [id])}

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
            <li key={individual.id}
                className={style.animalList}
                onClick={() => setShowIndividual(individual.number)}>
              {individual.number}
            </li>
          )}
        </ul>
      </TabPanel>
      <TabPanel value={activeTab} index='pedigree'>
        {pedigree && <PedigreeNetwork pedigree={pedigree} onClick={(node: string) => setShowIndividual(node)} />}
      </TabPanel>

      <Dialog
        open={!!showIndividual}
        keepMounted
        maxWidth={'xl'}
        onClose={closeIndividual}
      >
        <DialogTitle>{`Details for individual ${showIndividual}`}</DialogTitle>
        <DialogContent>
          {showIndividual && <IndividualView id={showIndividual} />}
        </DialogContent>
        <DialogActions>
          <Button onClick={closeIndividual} color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  </>
}
