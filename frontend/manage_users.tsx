/**
 * @file This file contains the Manage function. This function is used for
 * granting and revoking permissions from users, as well as approving requests
 * for adding individuals to herds in the genebanks you manage.
 */
import React from 'react'
import { makeStyles } from '@material-ui/core/styles'
import { Tabs, Tab } from '@material-ui/core/'
import { Box, Button } from '@material-ui/core'

import { useDataContext } from './data_context'
import { ManageUser } from '~manage_user';

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
    height: "calc(100% - 50px)",
    width: "calc(100% - 250px)",
    padding: "0.5cm 1cm",
    overflowY: "scroll",
  },
  centerButton: {
    width: "80%",
  }
});

export function ManageUsers() {
  const classes = useStyles()
  const {users} = useDataContext()
  const [userTab, setUserTab] = React.useState(0);
  const [selectedUser, selectUser] = React.useState(undefined as number | string | undefined)

  React.useEffect(() => {
    if (selectedUser == undefined && users.length > 0) {
      selectUser(users[0].id)
    }
  }, [])

  const userChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setUserTab(newValue);
    selectUser(users[newValue].id)
  }

  return <>
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
            onClick={() => selectUser('new')}>
      Lägg till användare
    </Button>
  </div>

  <Box className={classes.controls}>
    <ManageUser id={selectedUser} />
  </Box>
  </>
}
