/**
 * @file The Owner function provides a herd owner interfaces for managing
 * breeding events, registering new animals, and updating animal information.
 */
import React, { useState } from 'react'
import { makeStyles } from '@material-ui/core/styles';
import { useUserContext } from '@app/user_context'
import { Button, Paper } from '@material-ui/core'
import { HerdView } from './herd_view';

const useStyles = makeStyles({
  container: {
    padding: "20px",
  },
  title: {
    fontSize: '1.33em',
    fontWeight: 'bold',
  },
  herdButton: {
    margin: '0 10px',
  }
});

/**
 * Loads herd information from the backend and displays it as editable fields.
 */
export function Owner() {
  const { user } = useUserContext()
  const [ activeHerd, setActiveHerd ] = useState(undefined as string | undefined)
  const style  = useStyles()

  React.useEffect(() => {
    setActiveHerd(user?.is_owner && user.is_owner.length > 0
                  ? user.is_owner[0]
                  : undefined)
  }, [user])

  return <>
    <Paper className={style.container}>
      {user?.is_owner && user.is_owner.length > 1
        ? <p className={style.title}>Mina Besättningar:
            {user.is_owner.map((herdId: string) => <Button
                className={style.herdButton}
                key={herdId}
                variant='contained'
                value={herdId}
                color={herdId == activeHerd ? 'primary' : 'default'}
                onClick={e => setActiveHerd(e.currentTarget.value)}>
                  {herdId}
              </Button>)}
          </p>
        : <p className={style.title}>
            Min Besättning
          </p>
      }
    </Paper>
    {React.useMemo(() => <HerdView id={activeHerd} />, [activeHerd])}
  </>
}
