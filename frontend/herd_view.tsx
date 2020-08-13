/**
 * @file This file contains the HerdView function. This function fetches herd
 *       for a given `id` (parsed from the url), as well as the individuals
 *       belonging to that herd.
 */
import React from 'react'
import {Link} from "react-router-dom";

import { get } from './communication';

/**
 * Shows herd information, with a list of all individuals belonging to that
 * herd.
 */
export function HerdView({id}: {id: string}) {
  const [herd, setHerd] = React.useState(undefined as any)

  const fields = [
    {key: 'herd_name', title: "Besättningnamn"},
    {key: 'name', title: "Namn"},
    {key: 'email', title: "E-post"},
    {key: 'mobile_phone', title: "Mobiltelefon"},
    {key: 'wire_phone', title: "Fast telefon"},
    {key: 'physical_address', title: "Adress"},
    {key: 'www', title: "Hemsida"},
  ]

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
        <dl>
          {fields.map(field => <div key={field.key}>
              <dt>{field.title}</dt> <dd>{herd[field.key] ? herd[field.key] : '-'}</dd>
            </div>
            )
          }
        </dl>
        <h3>Individer</h3>
        <ul>
          {herd.individuals.map((individual: any) => {
            return <Link key={individual.id} to={`/individual/${individual.id}`}><li>{individual.name}</li></Link>
          })}
        </ul>
      </>
    }
  </>
}
