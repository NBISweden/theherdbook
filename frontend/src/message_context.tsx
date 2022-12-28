import * as React from "react";
import { Link } from "react-router-dom";

import {
  Button,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
} from "@material-ui/core";
import CloseIcon from "@material-ui/icons/Close";
import { VariantType, useSnackbar } from "notistack";
import { unstable_batchedUpdates } from "react-dom";

/**
 * The message context allows other complenents to display user messages in a
 * consistent manner.
 */

export interface MessageContext {
  userMessage(msg: string, variant: VariantType): void;
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
  const [showDialog, setShowDialog] = React.useState(false);
  const [dialogContent, setDialogContent] = React.useState(
    (<></>) as JSX.Element
  );
  const [dialogLink, setDialogLink] = React.useState(
    undefined as string | undefined
  );
  const [fullWidth, setFullWidth] = React.useState(false);
  const { enqueueSnackbar, closeSnackbar } = useSnackbar();

  const userMessage = async (
    message: string,
    variant: VariantType,
    persist?: boolean
  ) => {
    // print json format if the message isn't a string.
    enqueueSnackbar(
      typeof message == "string"
        ? message
        : JSON.stringify(message, undefined, 2),
      {
        variant,
        persist,
        className: "snackBar",
        style: { whiteSpace: "pre-line" },
        // anchorOrigin: { horizontal: "right", vertical: "bottom" },
        action: (key) => (
          <IconButton aria-label="close" onClick={() => closeSnackbar(key)}>
            <CloseIcon />
          </IconButton>
        ),
      }
    );
  };

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
    </MessageContext.Provider>
  );
}
