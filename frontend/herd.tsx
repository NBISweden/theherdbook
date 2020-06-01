/**
 * @file This file contains the Herd function. This function fetches herd for a
 *       given `herdId` (parsed from the url), as well as the individuals
 *       belonging to that herd.
 */
import React from 'react'
import {Link, useParams} from "react-router-dom";

import { get } from './communication';

/**
 * Shows herd information, with a list of all individuals belonging to that
 * herd.
 */
export function Herd() {
  let { herdId } = useParams();
  const [herd, setHerd] = React.useState(undefined as any)

  React.useEffect(() => {
    get(`/api/herd/${herdId}`).then(
      data => data && setHerd(data),
      error => console.error(error)
    )
  }, [herdId])

  return <>
    {herd &&
      <>
        <h2>{herd.name ?? `Besättning ${herd.id}`}</h2>
        <ul>
          {herd.individuals.map((individual: any) => {
            return <Link key={individual.id} to={`/individual/${individual.id}`}><li>{individual.name}</li></Link>
          })}
        </ul>
      </>
    }
  </>
}
