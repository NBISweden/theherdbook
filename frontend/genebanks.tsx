/**
 * @file This file contains the Genebanks function. This function fetched and
 *       displays a list of all genebanks that the current user has access to.
 */
import React from 'react'
import {Link} from "react-router-dom";

import { get } from './communication';

/**
 * Shows a list of all genebanks, with links to the individual genebanks.
 */
export function Genebanks() {
  const [genebanks, setGenebanks] = React.useState([] as any[])

  React.useEffect(() => {
    get('/api/genebanks').then(
      data => data && setGenebanks(data),
      error => console.error(error)
    )
  }, [])

  return <>
    <h2>Genbanker</h2>
    <ul>
      {genebanks.map(genebank => {
        return <Link key={genebank.id} to={`/genebank/${genebank.id}`}>
            <li>{genebank.name ?? genebank.id}</li>
          </Link>
      })}
    </ul>
  </>
}
