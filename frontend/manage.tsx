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
import { Genebank, NameID, Herd } from '~data_context_global';
import { Button } from '@material-ui/core';
import { HerdForm } from '~herdForm';
import { UserForm } from '~userForm';

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
    const herdOptions: any[] = users.map((u: NameID) => {return {value: u.id, label: u.email}});
    herdOptions.push({value: 'new', label: 'New User'})
    setOptions(herdOptions);
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
      setOptions(dataset.herds.map((h: Herd) => {
        return {value: `G${h.herd}`, label: `G${h.herd}${h.herd_name ? ` - ${h.herd_name}` : ''}`}
      }))
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
        targetOption = {value: targetUser.id, label: targetUser.email}
      }
    } else if (path[0] == 'G') {
      const dataset = genebanks.find((g: Genebank) => g.name == category)
      if (dataset) {
        const targetHerd = dataset.herds.find((h: Herd) => `G${h.herd}` == path)
        if (targetHerd) {
          const label = `G${targetHerd.herd}${targetHerd.herd_name ? ` - ${targetHerd.herd_name}` : ''}`
          targetOption = {value: `G${targetHerd.herd}`, label: label}
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

