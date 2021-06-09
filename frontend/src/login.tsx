import React, { useState } from "react";
import { useHistory, useLocation } from "react-router-dom";

import { CircularProgress, makeStyles } from "@material-ui/core";
import Button from "@material-ui/core/Button";
import Container from "@material-ui/core/Container";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";

import { useMessageContext } from "@app/message_context";

import { post, get } from "@app/communication";
import { useUserContext } from "@app/user_context";
import { inputVariant } from "@app/data_context_global";

const useStyles = makeStyles({
  loading: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
});

/**
 * Shows login and logout in a form, submits it to the user context callbacks
 */
export function Login() {
  const [open, setOpen] = React.useState(true);
  const { user, login } = useUserContext();
  const [username, set_username] = useState("");
  const [password, set_password] = useState("");
  const [authenticators, setAuthenticators] = useState([]);
  const { userMessage } = useMessageContext();

  const styles = useStyles();
  const history = useHistory();
  const location = useLocation();
  const { from } = location.state || { from: { pathname: "/" } };

  const close = () => {
    setOpen(false);
    history.push("/");
  };

  const submitLogin = () => {
    login(username, password);
  };

  React.useEffect(() => {
    if (user) {
      history.replace(from);
    }
  }, [user]);

  React.useEffect(() => {
    getAvailableAuthenticators();
  }, []);

  const keydown = (e: React.KeyboardEvent<any>) => {
    // Cannot get TextField to trigger onSubmit so listen for keydown instead
    if (e.key == "Enter") {
      submitLogin();
    }
  };

  if (user != null) {
    return (
      <div className={styles.loading}>
        <CircularProgress />
      </div>
    );
  }

  function waitForExternalLogin(w) {
    // Wait for an external login window
    try {
      if (w.document.readyState == "complete") {
        var returnedUser = w.document.body.innerText.trim();
        if (returnedUser == "null") {
          userMessage("Identity not linked to any known user", "error");
        } else {
          userMessage("Logged in as " + returnedUser, "success");
          document.location = "/";
        }

        w.close();
        return;
      }
    } catch (err) {}
    setTimeout(() => waitForExternalLogin(w), 100);
  }

  function authenticateExternal(service) {
    // We are not doing account linking
    fetch("/api/link/reset", {
      body: "",
      method: "POST",
      credentials: "same-origin",
      redirect: "manual",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
    })
      .then((x) => {
        // Authenticate with external service service

        return fetch("/api/login/" + service, {
          body: "",
          method: "POST",
          credentials: "same-origin",
          redirect: "manual",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        });
      })
      .then(
        (response) => {
          if (response.ok) {
            response.json().then((data) => {
              if (data == null) {
                userMessage("Identity not linked to any known user", "error");
              } else {
                userMessage(
                  "Logged in as " + data["username"]
                    ? data["username"]
                    : data["email"],
                  "success"
                );
                document.location = "/";
              }
            });
          } else {
            var w = window.open("/api/login/" + service, "_blank");
            setTimeout(() => waitForExternalLogin(w), 20);
          }
        },
        (err) => {
          userMessage("Unexpected error", "error");
        }
      );
  }

  async function getAvailableAuthenticators(l) {
    await post("/api/login/available").then(
      (data) => {
        if (!data) {
          data = [];
        }
        setAuthenticators(data);
      },
      (error) => {}
    );
  }

  return user === null ? (
    <Dialog open={open} onClose={close} aria-labelledby="form-dialog-title">
      <DialogTitle>Logga in</DialogTitle>
      <form onSubmit={submitLogin} onKeyDown={keydown}>
        <DialogContent>
          <DialogContentText>
            Logga in med ditt användarnamn eller e-postadress och ditt lösenord.
          </DialogContentText>
          <TextField
            id="username"
            variant={inputVariant}
            autoFocus
            margin="dense"
            label="Användarnamn eller E-postadress"
            type="email"
            value={username}
            onChange={(e) => set_username(e.target.value)}
            onSubmit={submitLogin}
            fullWidth
          />
          <TextField
            id="password"
            variant={inputVariant}
            margin="dense"
            label="Lösenord"
            type="password"
            value={password}
            onChange={(e) => set_password(e.target.value)}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={close} color="primary">
            Avbryt
          </Button>
          <Button onClick={submitLogin} color="primary" aria-label="Logga in">
            Logga in
          </Button>
        </DialogActions>
        <DialogActions>
          <Container>
            {authenticators.map((item) => (
              <Button
                onClick={() => authenticateExternal(item)}
                key={item}
                name={item}
              >
                {item}
              </Button>
            ))}
          </Container>
        </DialogActions>
      </form>
    </Dialog>
  ) : (
    <div className={styles.loading}>
      <CircularProgress />
    </div>
  );
}
