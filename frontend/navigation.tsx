
import * as React from 'react'
import { makeStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import HomeIcon from '@material-ui/icons/Home';
import AccountBalanceIcon from '@material-ui/icons/AccountBalance';
import VpnKeyIcon from '@material-ui/icons/VpnKey';
import MeetingRoom from '@material-ui/icons/MeetingRoom';
import {Link} from 'react-router-dom'

import {useUserContext} from './user_context'

// Define styles for tab menu
const useMenuStyles = makeStyles({
  root: {
    flexGrow: 1,
  },
});

/**
 * Returns a menu with tabs hidden when they are not applicable to the current
 * user.
 */
export function TabMenu() {
  const classes = useMenuStyles();
  const [value, setValue] = React.useState(0);
  const {login, logout} = useUserContext();
  const {user} = useUserContext();

  const handleChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Paper className={classes.root}>
      <Tabs
        value={value}
        onChange={handleChange}
        indicatorColor="primary"
        textColor="primary"
        centered
      >
        <Link to="/">
          <Tab icon={<HomeIcon />} label="Hem" />
        </Link>
        <Link to="/genebanks" hidden={user ? undefined : true}>
          <Tab icon={<AccountBalanceIcon />} label="Genbanker" />
        </Link>
        <Link to="/" onClick={logout} hidden={user ? undefined : true}>
          <Tab icon={<MeetingRoom />} label="Logga ut" />
        </Link>
        <Link to="/login" hidden={user ? true : undefined}>
          <Tab icon={<VpnKeyIcon />} label="Logga in" />
        </Link>
      </Tabs>
    </Paper>
  );
}
