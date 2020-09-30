
import React, { Component, useEffect } from 'react'
import { Link } from "react-router-dom";
import { get } from './communication';
import { PedigreeNetwork } from "./pedigree"
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';


/**
 * Shows the information of a given individual and the pedigree graph built using the PedigreeNetwork component
 */

export function IndividualPedigree({ id, generations }: { id: string }) {
  const [pedigree, setPedigree] = React.useState(undefined as any)
  const [individual, setIndividual] = React.useState(undefined as any)
  const [generations_input, setGenerations] = React.useState(generations)

  React.useEffect(() => {

    let mounted = true
    const url = `/api/individual/${id}`
    get(url).then(
      data => {
        mounted && data && setIndividual(data)
      },
      error => console.error(error)
    )
    get(`/api/pedigree/${id}/${generations_input}`).then(
      data => mounted && data && setPedigree(data),
      error => console.error(error)
    )

    return () => { mounted = false }//allows to validate the mount state of the component

  }, [id, generations_input])//dependent on these values

  return <>
    {individual  && <>
      <Table width="100%">
        <TableBody>
          <TableRow style={{ verticalAlign: "top" }}>
            <TableCell width="15%">
              <h2>{individual.name ?? 'unnamed'}</h2>
              <dl>
                <dt>Inavelskoefficient</dt> <dd><b>{individual.inbreeding}%</b></dd>
                <dt>Nummer</dt> <dd>{individual.number}</dd>
                <dt>Certifikat</dt> <dd>{individual.certificate}</dd>
                <dt>Kön</dt> <dd>{individual.sex ?? 'unknown'}</dd>
                <dt>Födelsedatum</dt> <dd>{individual.birth_date ?? '-'}</dd>
                <dt>Dödsdatum</dt> <dd>{individual.death_date ?? '-'}</dd>
                <dt>Dödsanteckning</dt> <dd>{individual.death_note ?? '-'}</dd>
                <dt>Besättning</dt>
                <Link to={`/herd/${individual.herd.herd}`}>
                  <dd>{individual.herd.name ?? individual.herd.herd}</dd>
                </Link>
                <dt>Mor</dt>
                {individual.mother
                  ? <Link to={`/individual/${individual.mother.number}`}>
                    <dd>{individual.mother.name}</dd>
                  </Link>
                  : <dd>-</dd>
                }
                <dt>Far</dt>
                {individual.father
                  ? <Link to={`/individual/${individual.father.number}`}>
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
            </TableCell>
            <TableCell width="85%" style={{textAlign: "left"}}>
              <h3>Pedigree: <input value={generations_input} onChange={event => setGenerations(event.target.value)} type="number" min="1" max="50" /></h3>
              {pedigree && <PedigreeNetwork pedigree={pedigree} />}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </>
    }
  </>
}



