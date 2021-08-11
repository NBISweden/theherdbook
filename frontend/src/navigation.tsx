import * as React from "react";
import { Switch, Route, useLocation, Redirect, Link } from "react-router-dom";

import {
  createMuiTheme,
  ThemeProvider,
} from "@material-ui/core/styles";
import { svSE } from "@material-ui/core/locale";
import Paper from "@material-ui/core/Paper";
import HomeIcon from "@material-ui/icons/Home";
import AccountBalanceIcon from "@material-ui/icons/AccountBalance";
import ContactMail from "@material-ui/icons/ContactMail";
import ForumIcon from "@material-ui/icons/Forum";
import VpnKeyIcon from "@material-ui/icons/VpnKey";
import MeetingRoom from "@material-ui/icons/MeetingRoom";
import GroupIcon from "@material-ui/icons/Group";
import PersonAddIcon from "@material-ui/icons/PersonAdd";
import PostAddIcon from "@material-ui/icons/PostAdd";
import NaturePeopleIcon from "@material-ui/icons/NaturePeople";
import EmojiNatureIcon from "@material-ui/icons/EmojiNature";
import EcoIcon from "@material-ui/icons/Eco";

import { Login } from "@app/login";
import { Genebanks } from "@app/genebanks";
import { HerdView } from "@app/herd_view";
import { Manage } from "@app/manage";
import { Owner } from "@app/owner";
import { Settings } from "@app/settings";
import { IndividualPedigree } from "@app/individual_pedigree";
import { IndividualView } from "@app/individual_view";
import { HerdPedigree } from "@app/herd_pedigree";
import { useUserContext } from "@app/user_context";
import { InbreedingForm } from "@app/testbreed_form";
import { Register } from "@app/register";
import {
  About,
  Gotlandskaninen,
  Mellerudskaninen,
  Medlem,
  Kontakt,
  Footer,
} from "@app/static_pages";
import { Forum } from "@app/forum";
import * as ui from "@app/ui_utils";
import {
  Button,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
  withStyles,
} from "@material-ui/core";
import { MenuProps } from "@material-ui/core/Menu";

import './style.css';

const StyledMenu = withStyles({
  paper: {
    border: "1px solid #d3d4d5",
  },
})((props: MenuProps) => (
  <Menu
    elevation={0}
    getContentAnchorEl={null}
    anchorOrigin={{
      vertical: "bottom",
      horizontal: "center",
    }}
    transformOrigin={{
      vertical: "top",
      horizontal: "center",
    }}
    {...props}
  />
));

const StyledMenuItem = withStyles((theme) => ({
  root: {
    "&:focus": {
      backgroundColor: theme.palette.primary.main,
      "& .MuiListItemIcon-root, & .MuiListItemText-primary": {
        color: theme.palette.common.white,
      },
    },
  },
}))(MenuItem);

function Restricted(props: { children: React.ReactElement }) {
  const { user } = useUserContext();
  const location = useLocation();
  return user ? (
    props.children
  ) : (
    <Redirect to={{ pathname: "/login", state: { from: location } }} />
  );
}

export function Navigation() {
  const { logout } = useUserContext();
  const { user } = useUserContext();
  const [showLogo, setShowLogo] = React.useState(true);
  const [showLogoText, setShowLogoText] = React.useState(false);
  const is_admin = !!(user?.is_manager || user?.is_admin);
  const is_owner = !!(user?.is_owner && user.is_owner.length > 0);
  const is_logged_in = !!user;
  const theme = createMuiTheme({}, svSE);

  const tabs: ui.RoutedTab[] = [
    {
      label: "Hem",
      path: "/",
      exact: true,
      component: <About />,
      visible: true,
      icon: <HomeIcon />,
    },
    {
      label: "Gotlandskaninen",
      path: "/gotlandskaninen",
      exact: true,
      component: <Gotlandskaninen />,
      visible: true,
      icon: <EcoIcon />,
    },
    {
      label: "Mellerudskaninen",
      path: "/mellerudskaninen",
      exact: true,
      component: <Mellerudskaninen />,
      visible: true,
      icon: <EmojiNatureIcon />,
    },
    {
      label: "Forum",
      path: "/forum",
      exact: true,
      component: <Forum />,
      visible: is_logged_in,
      icon: <ForumIcon />,
    },
    {
      label: "Genbanker",
      path: "/genebank",
      component: (
        <Restricted>
          <Genebanks />
        </Restricted>
      ),
      visible: is_logged_in,
      icon: <AccountBalanceIcon />,
    },
    {
      label: "Provparning",
      path: "/provparning",
      component: (
        <Restricted>
          <InbreedingForm />
        </Restricted>
      ),
      visible: is_logged_in,
      icon: <AccountBalanceIcon />,
    },
    {
      label:
        user?.is_owner && user.is_owner.length > 1
          ? "Mina besättningar"
          : "Min besättning",
      path: "/owner",
      component: (
        <Restricted>
          <Owner />
        </Restricted>
      ),
      visible: is_owner,
      icon: <NaturePeopleIcon />,
    },
    {
      label: "Registrera",
      path: "/register",
      component: (
        <Restricted>
          <Register />
        </Restricted>
      ),
      visible: is_admin,
      icon: <PostAddIcon />,
    },
    {
      label: "Administrera",
      path: "/manage",
      component: (
        <Restricted>
          <Manage />
        </Restricted>
      ),
      visible: is_admin,
      icon: <GroupIcon />,
    },
    {
      label: "Inställningar",
      path: "/settings",
      component: (
        <Restricted>
          <Settings />
        </Restricted>
      ),
      visible: is_logged_in,
      icon: <GroupIcon />,
    },

    {
      label: "Bli Medlem",
      path: "/medlem",
      exact: true,
      component: <Medlem />,
      visible: !is_logged_in,
      icon: <PersonAddIcon />,
    },

    {
      label: "Logga in",
      path: "/login",
      component: <Login />,
      visible: !is_logged_in,
      icon: <MeetingRoom />,
    },
    {
      label: "Logga ut",
      path: "/",
      exact: true,
      visible: is_logged_in,
      on_click: logout,
      icon: <VpnKeyIcon />,
    },
    {
      label: "Kontakt",
      path: "/kontakt",
      exact: true,
      component: <Kontakt />,
      visible: true,
      icon: <ContactMail />,
    },
  ];
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const { Tabs, TabbedRoutes } = ui.useRoutedTabs(tabs);


  return <>
    {/* Insert the tab menu */}
    <div className="menu">

      <Button
          aria-controls="customized-menu"
          aria-haspopup="true"
          className="menuButton"
          onClick={handleClick}
        >
        <span className="trigram">☰</span>
        <Typography variant='subtitle1'>Menu</Typography>
      </Button>

      <StyledMenu
        id="customized-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={handleClose}
      >
        {tabs.map(tab =>
          <Link to={tab.path ?? '/'}
                className="link"
                style={{display: tab.visible === false ? 'none' : undefined}}
                onClick={() => {tab.on_click && tab.on_click(); handleClose();}}>
            <StyledMenuItem>
              <ListItemIcon>
                {tab.icon}
              </ListItemIcon>
              <ListItemText primary={tab.label} />
            </StyledMenuItem>
          </Link>
        )}
      </StyledMenu>

      {/* <Tabs centered/> */}
    </div>
    
    

        {/* Declare routes, and what component should be rendered for each
         * route.
         */}

    <div className="wrapper">
      <Paper className="main">
        <Switch>
          {TabbedRoutes}
          <ui.Routed path="/herd/:id">
            {params => <Restricted><HerdView id={params.id}/></Restricted>}
          </ui.Routed>
          <ui.Routed path="/individual/:id">
            {params => <Restricted><IndividualView id={params.id} /></Restricted>}
          </ui.Routed>
          <ui.Routed path="/individual-pedigree/:id/:generations?">
            {params =>
              <Restricted>
                <IndividualPedigree id={params.id} generations={params.generations ? +params.generations : 5}/>
              </Restricted>}
          </ui.Routed>
          <ui.Routed path="/herd-pedigree/:id">
            {params => <Restricted><HerdPedigree id={params.id}/></Restricted>}
          </ui.Routed>
          <Route path="/">
            Welcome!
          </Route>
        </Switch>
      </Paper>
    </div>

        <Footer />
      </ThemeProvider>
    </>
  );
}
