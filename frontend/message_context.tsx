import * as React from 'react'
import { Snackbar } from '@material-ui/core';
import MuiAlert from '@material-ui/lab/Alert';

/**
 * The message context allows other complenents to display user messages in a
 * consistent manner.
 */

export type MessageLevel = 'error' | 'warning' | 'info' | 'success';

export interface MessageContext {
    userMessage(msg: string, level: MessageLevel): void,
}
const emptyContext: MessageContext = {
    userMessage() {},
}

export const MessageContext = React.createContext(emptyContext)

/**
 * Exports the context variables and functions to be used by other components
 */
export function useMessageContext(): MessageContext {
  return React.useContext(MessageContext)
}

export function WithMessageContext(props: {children: React.ReactNode}) {
  const [severity, setSeverity] = React.useState('info' as MessageLevel)
  const [message, setMessage] = React.useState('' as string)
  const [open, setOpen] = React.useState(false);

  function userMessage(message: string, severity: MessageLevel) {
      setMessage(message);
      setSeverity(severity);
      setOpen(true);
  }

  const handleClose = (event: any, reason: string) => {
      if (reason === 'clickaway') {
          return;
      }
      setOpen(false);
  }

  return (
    <MessageContext.Provider value={{userMessage}}>
      {props.children}
      <Snackbar open={open} autoHideDuration={5000} onClose={handleClose}>
          <MuiAlert elevation={6} variant='filled' onClose={handleClose} severity={severity}>
              {message}
          </MuiAlert>
      </Snackbar>
    </MessageContext.Provider>
  )
}

