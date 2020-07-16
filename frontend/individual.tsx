/**
 * @file This file contains the Individual function. This function fetches
 *       individual for a given `id` (parsed from the url).
 */
import React from 'react'
import {Link} from "react-router-dom";

import { get } from './communication';

/**
 * Shows information for a given individual in a herd
 */
export function Individual({id}: {id: string}) {
  const [individual, setIndividual] = React.useState(undefined as any)

  React.useEffect(() => {
    get(`/api/individual/${id}`).then(
      data => data && setIndividual(data),
      error => console.error(error)
    )
  }, [id])

  return <>
    {individual
      && <>
          <h2>{individual.name ?? 'unnamed'}</h2>
          <dl>
            <dt>Nummer</dt> <dd>{individual.number}</dd>
            <dt>Certifikat</dt> <dd>{individual.certificate}</dd>
            <dt>Kön</dt> <dd>{individual.sex ?? 'unknown'}</dd>
            <dt>Födelsedatum</dt> <dd>{individual.birth_date ?? '-'}</dd>
            <dt>Dödsdatum</dt> <dd>{individual.death_date ?? '-'}</dd>
            <dt>Dödsanteckning</dt> <dd>{individual.death_note ?? '-'}</dd>
            <dt>Besättning</dt>
            <Link to={`/herd/${individual.herd.id}`}>
              <dd>{individual.herd.name ?? individual.herd.id}</dd>
            </Link>
            <dt>Mor</dt>
            {individual.mother
              ? <Link to={`/individual/${individual.mother.id}`}>
                  <dd>{individual.mother.name}</dd>
                </Link>
              : <dd>-</dd>
            }
            <dt>Far</dt>
            {individual.father
              ? <Link to={`/individual/${individual.father.id}`}>
                  <dd>{individual.father.name}</dd>
                </Link>
              : <dd>-</dd>
            }
            <dt>Kull</dt> <dd>{individual.litter ?? '-'}</dd>
            <dt>Färg</dt> <dd>{individual.colour ?? '-'}</dd>
            <dt>Färgkommentar</dt> <dd>{individual.colour_note ?? '-'}</dd>
            <dt>Anteckningar</dt> <dd>{individual.notes ?? '-'}</dd>
            <dt>Vikter</dt>
              <dd>
                {individual.weights.length > 1
                  ? individual.weights.map((w: any) => `${w.date}: ${w.weight}`).join(", ")
                  : '-'
                }
              </dd>
            <dt>Navelskoefficient</dt> <dd>{individual.inbreeding ?? '-'}</dd>
          </dl>
        </>
      }
  </>
}
