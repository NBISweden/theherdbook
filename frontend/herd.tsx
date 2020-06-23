/**
 * @file This file contains the Herd function. This function fetches herd for a
 *       given `id` (parsed from the url), as well as the individuals
 *       belonging to that herd.
 */
import React from 'react'
import {Link} from "react-router-dom";

import { get } from './communication';

/**
 * Shows herd information, with a list of all individuals belonging to that
 * herd.
 */
export function Herd({id}: {id: string}) {
  const [herd, setHerd] = React.useState(undefined as any)

  React.useEffect(() => {
    if (id != undefined) {
      get(`/api/herd/${id}`).then(
        data => data && setHerd(data),
        error => console.error(error)
      )
    }
  }, [id])

  return <>
    {herd &&
      <>
        <h2>{`G${herd.herd}`} {herd.herd_name ? `- ${herd.herd_name}` : ''}</h2>
        <ul>
          {herd.individuals.map((individual: any) => {
            return <Link key={individual.id} to={`/individual/${individual.id}`}><li>{individual.name}</li></Link>
          })}
        </ul>
      </>
    }
  </>
}
