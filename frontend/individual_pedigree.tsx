/**
 * @file This file contains the Pedigree function. This function fetches
 *       pedigree for a given `id` (parsed from the url).
 */

import React, { Component, useEffect } from 'react'
import { Link } from "react-router-dom";
import { get } from './communication';
import PedigreeNetwork from "./pedigree"



/**
 * Shows the information of a given individual and the pedigree graph built using the vis-network component
 */
export function IndividualPedigree({ id, generations }: { id: string }) {
  const [pedigree, setPedigree] = React.useState(undefined as any)
  const [individual, setIndividual] = React.useState(undefined as any)
  const [generations_input, setGenerations] = React.useState(generations)


  React.useEffect(() => {
    get(`/api/individual/${id}`).then(
      data => data && setIndividual(data),
      error => console.error(error)
    )
    get(`/api/pedigree/${id}/${generations_input}`).then(
      data => data && setPedigree(data),
      error => console.error(error)
    )
  }, [id, generations_input])

  return <>
    {individual && pedigree && <>
      <table width="100%">
        <tbody>
          <tr>
            <td width="15%" style={{ verticalAlign: "top" }}>
              <h2>{individual.name ?? 'unnamed'}</h2>
              <dl>
                <dt>Inavelskoefficient</dt> <dd><b>{individual.inbreeding}%</b></dd>
                <dt>Generationer</dt> <dd><input value={generations_input} onChange={event => setGenerations(event.target.value)} type="number" min="1" max="50"/></dd>
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
                    ? individual.weights.map((w: any) => `${w.date.substring(0, 16)}: ${w.weight}`).join(", ")
                    : '-'
                  }
                </dd>

              </dl>
            </td>
            <td width="85%" >
              <PedigreeNetwork pedigree={pedigree}/>
            </td>
          </tr>
        </tbody>
      </table>
    </>
    }
  </>
}



