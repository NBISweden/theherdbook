/**
 * @file This file contains the ExploreHerds function. This function is used for
 * selecting herds and displaying them with the Herds function.
 */
import React from 'react'
import { makeStyles } from '@material-ui/core/styles'
import { Tabs, Tab } from '@material-ui/core/'
import { Box } from '@material-ui/core'
import { HerdPedigree } from '~herd_pedigree'
import { Genebank, Herd } from 'data_context_global'

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
    height: "100%",
    width: "250px",
  },
  controls: {
    height: "calc(100% - 50px)",
    width: "calc(100% - 250px)",
    padding: "0.5cm 1cm",
    overflowY: "scroll",
  },
  centerButton: {
    width: "80%",
  }
});

export function ExploreHerds({id}: {id: number | undefined}) {
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
    const currentGenebank = genebanks.find(g => g.id == id)
    if (currentGenebank) {
      setGenebank(currentGenebank)
      if (herd == undefined && currentGenebank.herds.length > 0) {
        setHerd(currentGenebank.herds[0].id)
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
            genebank.herds.sort((a: Herd,b: Herd) => +a.herd - +b.herd).map((h:any, i:number) => {
            let label = `G${h.herd}`;
            if (h.herd_name) {
                label += ` - ${h.herd_name}`;
            }
            return <Tab key={i} label={label} />
            })}
      </Tabs>
    </div>

    <Box className={classes.controls}>
      <HerdPedigree id={herd} />
    </Box>
  </>
}
