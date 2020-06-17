import * as React from 'react'

import {get} from './communication'

import {DataContext, NameID, Herd} from "./data_context_global"

/**
 * The data context holds genebank, herd, and individual data, as well as
 * funtions to request and modify the data.
 *
 * The data is arranged in `genebanks`, `herds`, and `individuals`.
 */

/**
 * Exports the context variables and functions to be used by other components
 */
export function useDataContext(): DataContext {
  return React.useContext(DataContext)
}

export function WithDataContext(props: {children: React.ReactNode}) {
  const [genebanks, setGenebanks] = React.useState([] as Array<NameID>)
  const [herds, setHerds] = React.useState([] as Array<Herd>)

  /**
   * Fetches all genebank names and id's from the backend (that the currently
   * logged in user has access to). Returns `true` on success and `false`
   * otherwise.
   */
  async function getGenebanks() {
    return await get('/api/genebanks').then(
      data => {
        if (!data) {
          return false;
        }
        setGenebanks(data);
        return true;
      },
      error => {
        console.error(error);
        return false;
      }
    )
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
      setHerds([])
    }
    if (data == 'all' || data.includes('genebanks')) {
      updates.push(getGenebanks())
    }

    return await Promise.all(updates).then(statuses => {
      return statuses.reduce((a,b) => a && b, true)
    })
  }

  React.useEffect(() => {
    loadData('all')
  }, [])

  return (
    <DataContext.Provider value={{genebanks, herds, loadData}}>
      {props.children}
    </DataContext.Provider>
  )
}

