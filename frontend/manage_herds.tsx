/**
 * @file This file contains the Manage function. This function is used for
 * granting and revoking permissions from users, as well as approving requests
 * for adding individuals to herds in the genebanks you manage.
 */
import React from 'react'
import { makeStyles } from '@material-ui/core/styles'
import { Tabs, Tab } from '@material-ui/core/'
import { Box, Button } from '@material-ui/core'
import { HerdForm } from '~herdForm'
import { Genebank } from 'data_context_global'

import { useDataContext } from './data_context'

// Define styles for tab menu
const useStyles = makeStyles({
  sidebar: {
    float: "left",
    height: "calc(100% - 50px)",
    width: "250px",
    margin: "0",
    borderRight: `1px solid rgba(0,0,0,0.2)`,
    display: "flex",
    flexDirection: "column",
    alignItems: "center"
  },
  verticalTabs: {
    height: "calc(100% - 50px)",
    width: "250px",
  },
  controls: {
    height: "100%",
    width: "calc(100% - 250px)",
    padding: "0.5cm 1cm",
    overflowY: "scroll",
  },
  centerButton: {
    width: "80%",
  }
});

export function ManageHerds({id}: {id: number | undefined}) {
  const classes = useStyles()
  const {genebanks} = useDataContext()
  const [herdTab, setHerdTab] = React.useState(0);
  const [herd, setHerd] = React.useState(undefined as any)
  const [genebank, setGenebank] = React.useState(undefined as Genebank | any)

  const herdChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setHerdTab(newValue);
    if (genebank) {
      setHerd(genebank.herds[newValue].id);
    }
  };

  React.useEffect(() => {
    let currentGenebank = genebanks.filter(g => g.id == id)
    if (currentGenebank.length > 0) {
      setGenebank(currentGenebank[0])
      if (herd == undefined && currentGenebank[0].herds.length > 0) {
        setHerd(currentGenebank[0].herds[0].id)
      }
    }
  }, [genebanks, id])

  return <>
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
            if (h.herd_name) {
              label += ` - ${h.herd_name}`;
            }
            return <Tab key={i} label={label} />
          })}
      </Tabs>
      {/* <Button className={classes.centerButton}
              variant="contained"
              color="primary"
              onClick={() => console.debug("add herd")}>
        Lägg till Besättning
      </Button> */}
    </div>

    <Box className={classes.controls}>
      <HerdForm id={herd} />
    </Box>
  </>
}
