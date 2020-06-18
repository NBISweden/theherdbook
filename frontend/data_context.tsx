import * as React from 'react'

import {get} from './communication'

import {DataContext, Genebank, NameID} from "./data_context_global"

/**
 * The data context holds genebank, herd, and individual data, as well as
 * funtions to request and modify the data.
 *
 * The data is arranged in `genebanks` (including `herds`), and `individuals`.
 */

/**
 * Exports the context variables and functions to be used by other components
 */
export function useDataContext(): DataContext {
  return React.useContext(DataContext)
}

export function WithDataContext(props: {children: React.ReactNode}) {
  const [genebanks, setGenebanks] = React.useState([] as Array<Genebank>)
  const [users, setUsers] = React.useState([] as Array<NameID>)

  async function fetchAndSet(url: string, set: Function, field: string | undefined = undefined) {
    return await get(url).then(
      data => {
        if (!data) {
          return false;
        }
        set(field ? data[field] : data);
        return true;
      },
      error => {
        console.error(error);
        return false;
      }
    )
  }

  /**
   * Fetches all genebank names, id's and herd lists from the backend (that the
   * currently logged in user has access to). Returns `true` on success and
   * `false` otherwise.
   */
  async function getGenebanks() {
    return fetchAndSet('/api/genebanks', setGenebanks)
  }

  /**
   * Fetches all users names, id's, validation status, and roles that the
   * currently logged in user has access to. Returns `true` on success and `false`
   * otherwise.
   */
  async function getUsers() {
    return fetchAndSet('/api/manage/users', setUsers, 'users')
  }

  /**
   * Loads data from the backend into the data context. Returns `true` if all
   * operations were successful and `false` otherwise.
   *
   * @param data either a list of strings including `genebanks`, `herds`, or
   *     `individuals`, the string `all` to load all data, or the string `none`
   *     to unload all data.
   */
  async function loadData(data: string | Array<string>) {
    let updates: Array<Promise<boolean>> = []
    if (data == 'none') {
      setGenebanks([])
    }
    if (data == 'all' || data.includes('genebanks')) {
      updates.push(getGenebanks())
    }
    if (data == 'all' || data.includes('users')) {
      updates.push(getUsers())
    }

    return await Promise.all(updates).then(statuses => {
      return statuses.reduce((a,b) => a && b, true)
    })
  }

  React.useEffect(() => {
    loadData('all')
  }, [])

  return (
    <DataContext.Provider value={{genebanks, users, loadData}}>
      {props.children}
    </DataContext.Provider>
  )
}

