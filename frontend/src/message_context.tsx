import * as React from "react";
import { Link } from "react-router-dom";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Snackbar,
} from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";
import { unstable_batchedUpdates } from "react-dom";

/**
 * The message context allows other complenents to display user messages in a
 * consistent manner.
 */

export type MessageLevel = "error" | "warning" | "info" | "success";

export interface MessageContext {
  userMessage(msg: string, level: MessageLevel): void;
  popup(content: JSX.Element, link: string | undefined, full?: boolean): void;
  handleCloseDialog(): void;
}
const emptyContext: MessageContext = {
  userMessage() {},
  popup() {},
  handleCloseDialog() {},
};

export const MessageContext = React.createContext(emptyContext);

/**
 * Exports the context variables and functions to be used by other components
 */
export function useMessageContext(): MessageContext {
  return React.useContext(MessageContext);
}

export function WithMessageContext(props: { children: React.ReactNode }) {
  const [severity, setSeverity] = React.useState("info" as MessageLevel);
  const [message, setMessage] = React.useState("" as string);
  const [showMessage, setShowMessage] = React.useState(false);
  const [showDialog, setShowDialog] = React.useState(false);
  const [dialogContent, setDialogContent] = React.useState(
    (<></>) as JSX.Element
  );
  const [dialogLink, setDialogLink] = React.useState(
    undefined as string | undefined
  );
  const [fullWidth, setFullWidth] = React.useState(false);

  function userMessage(message: string, severity: MessageLevel) {
    // print json format if the message isn't a string.
    setMessage(
      typeof message == "string"
        ? message
        : JSON.stringify(message, undefined, 2)
    );
    setSeverity(severity);
    setShowMessage(true);
  }

  function popup(
    content: JSX.Element,
    link: string | undefined,
    full?: boolean
  ) {
    unstable_batchedUpdates(() => {
      setDialogLink(link);
      setDialogContent(content);
      setShowDialog(true);
      if (full) {
        setFullWidth(full);
      }
    });
  }

  const handleCloseMessage = (event: any, reason: string) => {
    if (reason === "clickaway") {
      return;
    }
    setShowMessage(false);
  };

  const handleCloseDialog = () => {
    unstable_batchedUpdates(() => {
      setDialogLink(undefined);
      setDialogContent(<></>);
      setShowDialog(false);
      setFullWidth(false);
    });
  };

  return (
    <MessageContext.Provider value={{ userMessage, popup, handleCloseDialog }}>
      {props.children}
      <Dialog
        open={showDialog}
        keepMounted
        maxWidth={fullWidth ? "lg" : "xl"}
        fullWidth={fullWidth}
        onClose={handleCloseDialog}
      >
        <DialogContent>{dialogContent}</DialogContent>
        <DialogActions>
          {dialogLink && (
            <Link to={dialogLink} target="_blank">
              <Button color="primary">Öppna i eget fönster</Button>
            </Link>
          )}
          <Button onClick={handleCloseDialog} color="primary">
            Stäng
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={showMessage}
        autoHideDuration={5000}
        onClose={handleCloseMessage}
      >
        <Alert
          elevation={6}
          variant="filled"
          onClose={handleCloseMessage}
          severity={severity}
        >
          {message}
        </Alert>
      </Snackbar>
    </MessageContext.Provider>
  );
}
