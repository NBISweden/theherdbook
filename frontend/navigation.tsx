
import * as React from 'react'
import { makeStyles } from '@material-ui/core/styles';
import Paper from '@material-ui/core/Paper';
import Tabs from '@material-ui/core/Tabs';
import Tab from '@material-ui/core/Tab';
import HomeIcon from '@material-ui/icons/Home';
import AccountBalanceIcon from '@material-ui/icons/AccountBalance';
import VpnKeyIcon from '@material-ui/icons/VpnKey';
import MeetingRoom from '@material-ui/icons/MeetingRoom';
import GroupIcon from '@material-ui/icons/Group';
import {useHistory} from 'react-router-dom'

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
  const [value, setTab] = React.useState(0);
  const {login, logout} = useUserContext();
  const {user} = useUserContext();
  const history = useHistory();

  const tabs = [
    {icon: <HomeIcon />, label: "Hem", route: "/"},
    {icon: <AccountBalanceIcon />, label: "Genbanker", route: "/genebanks", hide: user ? undefined : true},
    {icon: <GroupIcon />, label: "Administrera", route: "/manage", hide: user?.is_manager || user?.is_admin ? undefined : true},
    {icon: <MeetingRoom />, label: "Logga in", route: "/login", hide: user ? true : undefined },
    {icon: <VpnKeyIcon />, label: "Logga ut", route: "/", hide: user ? undefined : true, func: logout},
  ];

  const handleChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    if (tabs[newValue].func) {
      tabs[newValue].func()
    }
    if (tabs[newValue].route) {
      history.push(tabs[newValue].route);
    }
    setTab(tabs.findIndex((t:any) => t.route == tabs[newValue].route));
  };

  React.useEffect(() => {
    setTab(tabs.findIndex((t:any) => t.route == location.pathname))
  }, [])

  return (
    <Paper className={classes.root}>
      <Tabs
        value={value}
        onChange={handleChange}
        indicatorColor="primary"
        textColor="primary"
        centered
      >
        { tabs.map((tab: any, i: number) => {
            return <Tab key={i} icon={tab.icon} label={tab.label} style={{display: tab.hide ? 'none' : undefined}}/>
          })
        }
      </Tabs>
    </Paper>
  );
}
