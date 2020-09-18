/**
 * @file This file contains the Manage function. This page is used for managing
 * users and herds.
 */
import React, { useState } from 'react'
import { makeStyles } from '@material-ui/core/styles'
import Paper from '@material-ui/core/Paper';
import { Switch, Route, useLocation, useHistory } from "react-router-dom";

import { useDataContext } from './data_context'
import Select from 'react-select';
import { Genebank, NameID, Herd, herdLabel, userLabel } from '@app/data_context_global';
import { Button } from '@material-ui/core';
import { HerdForm } from '@app/herdForm';
import { UserForm } from '@app/userForm';

const useStyles = makeStyles({
  main: {
    width: '100%',
    height: '100%',
    margin: '0',
    padding: '10px',
  },
  controls: {
    padding: '15px',
  },
  leftControls: {
    maxWidth: '40%',
    minHeight: '50px',
  },
  rightControls: {
    float: 'right',
    width: '40%',
  },
  hidden: {
    display: 'none',
  },
  inputForm: {
    width: '100%',
    padding: '10px',
    margin: '10px 0',
    minHeight: '200px',
  }
});

/**
 * Provides management forms for users and herds.
 */
export function Manage() {
  const styles = useStyles()
  const {genebanks, users} = useDataContext()

  const history = useHistory()
  const location = useLocation()

  const [topic, setTopic] = useState(undefined as string | undefined)
  const [genebank, setGenebank] = useState(undefined as string | undefined)
  const [target, setTarget] = useState(undefined as string | undefined)
  const [options, setOptions] = useState([] as any[])
  const [selected, setSelected] = useState(undefined as any)

  /**
   * Set the options of the main select box to the list of current users.
   */
  const setUserOptions = () => {
<<<<<<< HEAD:frontend/src/manage.tsx
    const userOptions: NameID[] = users.map((u: NameID) => {return {value: u.id, label: userLabel(u)}});
=======
    const userOptions: any[] = users.map((u: NameID) => {return {value: u.id, label: userLabel(u)}});
>>>>>>> Add usernames to frontend:frontend/manage.tsx
    userOptions.push({value: 'new', label: 'New User'})
    setOptions(userOptions);
  }

  /**
   * Set the options to the main select box to the herds of the genebank
   * identified by `name`.
   *
   * @param name the name of the genebank to set options from
   */
  const setHerdOptions = (name: string) => {
    const dataset = genebanks.find((g: Genebank) => g.name == name)
    if (dataset) {
      const herdOptions: any[] = dataset.herds.map((h: Herd) => {
        return {value: h.herd, label: herdLabel(h)}
      })
      herdOptions.push({value: 'new', label: 'New Herd'})
      setOptions(herdOptions)
    }
  }

  /**
   * tries to set the current selected item in the main select box from the
   * category and path (2nd and 3rd block) of the current url.
   *
   * @param category the 2nd block of the current url, should be 'user' or the
   *     name of a genebank.
   * @param path the 3rd block of the current url, should be the identifier of
   *     an item in `category`.
   */
  const parseTarget = (category: string, path: string) => {
    if (!path) {
      setSelected(undefined)
      return
    }

    let targetOption: any = null;
    if (category == 'user' && path == 'new') {
      targetOption = {value: 'new', label: 'New User'}
    } else if (category == 'user' && +path != NaN) {
      const targetUser = users.find((u: NameID) => u.id == +path);
      if (targetUser) {
        targetOption = {value: targetUser.id, label: userLabel(targetUser)}
      }
    } else if (path.length > 0 && !!path[0].match(/[a-z]/i)) {
      const dataset = genebanks.find((g: Genebank) => g.name == category)
      if (dataset) {
        const targetHerd = dataset.herds.find((h: Herd) => h.herd == path)
        if (targetHerd) {
          targetOption = {value: targetHerd.herd, label: herdLabel(targetHerd)}
        }
      }
    }
    setSelected(targetOption)
  }

  /**
   * Parses the current url to set the current options, users and (if possible)
   * selected item.
   */
  React.useEffect(() => {
    const path = location.pathname.split('/')
    if (path[1] != 'manage' || !genebanks) {
      return;
    }
    if (path[2]) {
      setTopic(path[2])
      if (path[2] != 'user') {
        setGenebank(path[2]);
      } else if (!genebank && genebanks.length > 0) {
        setGenebank(genebanks[0].name)
      }
      if (path[2] == 'user') {
        setUserOptions();
      } else {
        setHerdOptions(path[2]);
      }
    } else if (genebanks.length > 0) {
      const defaultTopic = genebanks[0].name
      setTopic(defaultTopic)
      setGenebank(defaultTopic)
      setHerdOptions(defaultTopic)
    }
    if (path[3]) {
      setTarget(path[3])
      parseTarget(path[2], path[3])
    }

  }, [genebanks, users, location])


  return <>
    <Paper className={styles.main}>
      <Paper className={styles.controls}>
        <div>
          <div className={styles.rightControls}>
            <div className={topic == 'user' ? styles.hidden : undefined}>
              <Select
                options={genebanks ? genebanks.map((g: Genebank) => {return {value: g.name, label: g.name}}) : []}
                onChange={(current: any) => history.push(`/manage/${current.value}/${target ? target : ''}`)}
                value={{value: topic == 'user' ? '' : topic, label: topic == 'user' ? '' : topic}}
                />
            </div>
          </div>
          <div className={styles.leftControls}>
            <Button
              variant='contained'
              color={topic != 'user' ? 'primary' : 'default'}
              onClick={() => history.push(`/manage/${genebank}/${target ? target : ''}`)}>
                Herds
            </Button>
            <Button
              variant='contained'
              color={topic == 'user' ? 'primary' : 'default'}
              onClick={() => history.push(`/manage/user/${target ? target : ''}`)}>
                Users
            </Button>
          </div>
        </div>

        <Select
          options={options}
          onChange={(current: any) => history.push(`/manage/${topic}/${current.value}`)}
          value={selected}
          />
      </Paper>

      {/* Only show the input form for the currently selected type */}
      <Switch>
        <Route path="/manage/user">
          <Paper className={styles.inputForm}>
            <UserForm id={selected?.value}/>
          </Paper>
        </Route>
        <Route path="/manage/">
          <Paper className={styles.inputForm}>
            <HerdForm id={selected?.value}/>
          </Paper>
        </Route>
      </Switch>
    </Paper>
  </>
}

