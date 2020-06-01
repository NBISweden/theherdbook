/**
 * @file This file contains the Genebank function. This function fetches
 *       genebank information for a given `genebankId` (parsed from the url), as
 *       well as the herds belonging to that genebank.
 */
import React from 'react'
import {Link, useParams} from "react-router-dom";

import { get } from './communication';

/**
 * Shows genebank information, with a list of all herds belonging to that
 * genebank.
 */
export function Genebank() {
  let { genebankId } = useParams();
  const [genebank, setGenebank] = React.useState(undefined)

  React.useEffect(() => {
    get(`/api/genebank/${genebankId}`).then(
      data => data && setGenebank(data),
      error => console.error(error)
    )
  }, [genebankId])

  return <>
    {genebank
      ? <>
          <h2>{genebank.name}</h2>
          <ul>
            {genebank.herds.map(herd => {
              return <Link key={herd.id} to={`/herd/${herd.id}`}><li>{herd.name ?? `Besättning ${herd.id}`}</li></Link>
            })}
          </ul>
        </>
      : ''}
  </>
}
