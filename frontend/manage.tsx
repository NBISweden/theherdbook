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
import Box from '@material-ui/core/Box';
import { makeStyles } from '@material-ui/core/styles';

import { useUserContext } from './user_context'
import { get } from './communication';

// Define styles for tab menu
const useStyles = makeStyles({
  root: {
    flexGrow: 1,
  },
  breadcrumbs: {
    padding: "15px",
    paddingBottom: 0,
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
}

/**
 * Creates a Box containing the children props of the component, which will be
 * rendered when the `index` prop is equal to the `value` prop.
 *
 * @param props - A set of `TabPanelProps` used to set content and visibility
 */
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      {...other}
    >
      {value === index && (
        <Box p={3}>
          {children}
        </Box>
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
  const [currentTab, setTab] = React.useState(0);
  const classes = useStyles();

  function selectGenebank(id: number) {
    get(`/api/genebank/${id}`).then(
      data => data && setGenebank(data),
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

  const handleChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setTab(newValue);
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
    <Paper className={classes.root}>
      <Tabs value={currentTab}
            onChange={handleChange}
            indicatorColor="primary"
            textColor="primary"
        >
           <Tab label="Besättningar" />
           <Tab label="Användare" />
      </Tabs>
      <TabPanel value={currentTab} index={0}>
        {genebank && <>
          {genebank.name} innehar {genebank.herds.length} besättningar.
        </>}
      </TabPanel>
      <TabPanel value={currentTab} index={1}>
        Användarkontroller kommer att hamna här.
      </TabPanel>
    </Paper>
  </>
}
