import * as React from "react";
import {
  Switch,
  Route,
  useLocation,
  Redirect,
  Link,
  useHistory,
} from "react-router-dom";

import { createTheme, ThemeProvider } from "@material-ui/core/styles";
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
import { Help } from "@material-ui/icons";

import { get } from "@app/communication";
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
  Medlem,
  Kontakt,
  Footer,
  HelpStamboken,
} from "@app/static_pages";
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
import hotjar from "react-hotjar";

import "./style.css";

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
  /*
  If user reloads page we do not have any usercontext yet.
  User will always be null even if user is logged in in backend
  This will check with backen if api/user returns data then the user is logged in
  and we can proceed the user to the restricted component. If not then redirect to Google login.
  If user is clicking the link the usercontext is already loaded and we can assume the user is
  logged in.
  */
  const { user } = useUserContext();

  if (user == null) {
    get("/api/user").then((data) => {
      return data
        ? props.children
        : (window.location.href = "/api/login/google");
    });
  }
  return props.children;
}

export function Navigation() {
  const { logout } = useUserContext();
  const { user } = useUserContext();
  const [showLogo, setShowLogo] = React.useState(true);
  const [showLogoText, setShowLogoText] = React.useState(false);
  const is_admin = !!(user?.is_manager || user?.is_admin);
  const is_owner = !!(user?.is_owner && user.is_owner.length > 0);
  const is_logged_in = !!user;
  const theme = createTheme({}, svSE);
  const history = useHistory();

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
      label: "Logga in",
      path: "",
      on_click: () => {
        window.location.href = "/api/login/google";
      },
      visible: !is_logged_in,
      icon: <MeetingRoom />,
    },
    {
      label: "Hjälp",
      path: "/help",
      exact: true,
      component: (
        <Restricted>
          <HelpStamboken />
        </Restricted>
      ),
      visible: is_logged_in,
      icon: <Help />,
    },
    {
      label: "Kontakt",
      path: "/kontakt",
      exact: true,
      component: <Kontakt />,
      visible: true,
      icon: <ContactMail />,
    },
    {
      label: "Logga ut",
      path: "/",
      exact: true,
      visible: is_logged_in,
      on_click: logout,
      icon: <VpnKeyIcon />,
    },
  ];
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };
  React.useEffect(() => {
    return history.listen((location) => {
      hotjar.hotjar.identify(user?.username, {
        is_manager: user?.is_manager,
        is_owner: user?.is_owner?.toString(),
      });
    });
  }, [history]);

  const { Tabs, TabbedRoutes } = ui.useRoutedTabs(tabs);

  return (
    <>
      <ThemeProvider theme={theme}>
        {/* Insert the tab menu */}
        <div className="menu">
          <Button
            aria-controls="customized-menu"
            aria-haspopup="true"
            className="menuButton"
            onClick={handleClick}
          >
            <span className="trigram">☰</span>
            <Typography variant="subtitle1">Menu</Typography>
          </Button>

          <Button>
            <b>
              <Typography variant="subtitle1">{user?.username}</Typography>
            </b>
          </Button>
          <Button>
            <b>
              <Typography
                variant="subtitle1"
                style={{ color: "red", fontWeight: "bold", fontSize: "24px" }}
              >
                OBS DETTA ÄR TESTSYSTEMET!{" "}
              </Typography>
            </b>
          </Button>
          <StyledMenu
            id="customized-menu"
            anchorEl={anchorEl}
            keepMounted
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            {tabs.map((tab) => (
              <Link
                to={tab.path ?? "/"}
                key={tab.label}
                className="link"
                style={{ display: tab.visible === false ? "none" : undefined }}
                onClick={() => {
                  tab.on_click && tab.on_click();
                  handleClose();
                }}
              >
                <StyledMenuItem>
                  <ListItemIcon>{tab.icon}</ListItemIcon>
                  <ListItemText primary={tab.label} />
                </StyledMenuItem>
              </Link>
            ))}
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
                {(params) => (
                  <Restricted>
                    <HerdView id={params.id} />
                  </Restricted>
                )}
              </ui.Routed>
              <ui.Routed path="/individual/:id">
                {(params) => (
                  <Restricted>
                    <IndividualView id={params.id} />
                  </Restricted>
                )}
              </ui.Routed>
              <ui.Routed path="/individual-pedigree/:id/:generations?">
                {(params) => (
                  <Restricted>
                    <IndividualPedigree
                      id={params.id}
                      generations={params.generations ? +params.generations : 5}
                    />
                  </Restricted>
                )}
              </ui.Routed>
              <ui.Routed path="/herd-pedigree/:id">
                {(params) => (
                  <Restricted>
                    <HerdPedigree id={params.id} />
                  </Restricted>
                )}
              </ui.Routed>
              <Route path="/admin">
                <Login />
              </Route>
              <Route path="/login">
                Du måste logga in med ditt Gotlandskaninkonto{" "}
                <a href="/api/login/google">Logga in</a>{" "}
              </Route>
            </Switch>
          </Paper>
        </div>
        <Footer />
      </ThemeProvider>
    </>
  );
}
