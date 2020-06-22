/**
 * @file This file contains the Individuals function. This function fetches and
 *       displays a list of all individuals that the current user has access to.
 */
import React from 'react'
import {Link} from "react-router-dom";
import {useDataContext} from './data_context'
import { Individual } from '~data_context_global';

/**
 * Shows a list of all genebanks, with links to the individual genebanks.
 */
export function Individuals({id}: {id: string}) {
  const [individuals, setIndividuals] = React.useState([] as Array<Individual>)
  const {genebanks} = useDataContext()

  React.useEffect(() => {
    let genebank = genebanks.filter(g => g.id == +id)
    if (genebank) {
      setIndividuals(genebank[0].individuals)
    }
  }, [genebanks])

  return <>
    <h2>Individer i genbank {id}</h2>
    <ul>
      {individuals.map(individual => {
        return <Link key={individual.id} to={`/individual/${individual.id}`}>
            <li>{individual.name} - {individual.number}</li>
          </Link>
      })}
    </ul>
  </>
}
