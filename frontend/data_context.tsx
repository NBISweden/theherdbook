import * as React from 'react'

import {post, get} from './communication'

import {DataContext} from "./data_context_global"

/**
 * The data context holds genebank, herd, and individual data, as well as
 * funtions to request and modify the data.
 *
 * The data is arranged in `genebanks`, `herds`, and `individuals`.
 */

/**
 *
 */
export function useDataContext(): DataContext {
  return React.useContext(DataContext)
}

export function WithDataContext(props: {children: React.ReactNode}) {
  const [genebanks, setGenebanks] = React.useState([] as Array<NameID>)
  const [herds, setHerds] = React.useState([] as Array<Herd>)

  async function getGenebanks() {
    return await get('/api/genebanks').then(
      data => {
        if (!data) {
          return false;
        }
        setGenebanks(data);
        console.debug("geniebynky:",  data, genebanks)
        return true;
      },
      error => {
        console.error(error);
        return false;
      }
    )
  }

  React.useEffect(() => {
    getGenebanks()
  }, [])

  return (
    <DataContext.Provider value={{genebanks, herds, getGenebanks}}>
      {props.children}
    </DataContext.Provider>
  )
}

