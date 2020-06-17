/**
 * @file This file contains the Genebanks function. This function fetched and
 *       displays a list of all genebanks that the current user has access to.
 */
import React from 'react'
import {Link} from "react-router-dom";
import {useDataContext} from './data_context'

import { get } from './communication';

/**
 * Shows a list of all genebanks, with links to the individual genebanks.
 */
export function Genebanks() {
  const {genebanks} = useDataContext()

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
