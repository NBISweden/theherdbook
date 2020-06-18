/**
 * @file This file contains the Genebank function. This function fetches
 *       genebank information for a given `id` (parsed from the url), as
 *       well as the herds belonging to that genebank.
 */
import React from 'react'
import {Link} from "react-router-dom";
import {useDataContext} from './data_context'

/**
 * Shows genebank information, with a list of all herds belonging to that
 * genebank.
 */
export function Genebank({id}: {id: string}) {
  const {genebanks} = useDataContext()
  const [genebank, setGenebank] = React.useState(undefined as any)

  React.useEffect(() => {
    let data = genebanks.filter(g => g.id == +id)
    if (data.length > 0) {
      setGenebank(data[0])
    }
  }, [id])

  return <>
    {genebank
      ? <>
          <h2>{genebank.name}</h2>
          <ul>
            {genebank.herds.map((herd: any) => {
              return <Link key={herd.id} to={`/herd/${herd.id}`}><li>{herd.name ?? `Besättning ${herd.id}`}</li></Link>
            })}
          </ul>
        </>
      : ''}
  </>
}
