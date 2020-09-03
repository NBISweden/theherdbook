
import React, { Component, useEffect } from 'react'
import { get } from './communication';
import { PedigreeNetwork } from "./pedigree"
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import { Link } from "react-router-dom";


/**
 * @file shows the herd pedigree graph built using the pedigree component with the herd data added.
 */

export function HerdPedigree({ id }: { id: string }) {

  const [pedigree, setPedigree] = React.useState(undefined as any)
  const [herd, setHerd] = React.useState(undefined as any)

  const fields = [
    { key: 'herd_name', title: "Besättningnamn" },
    { key: 'name', title: "Namn" },
    { key: 'email', title: "E-post" },
    { key: 'mobile_phone', title: "Mobiltelefon" },
    { key: 'wire_phone', title: "Fast telefon" },
    { key: 'physical_address', title: "Adress" },
    { key: 'www', title: "Hemsida" },
  ]

  React.useEffect(() => {
    let mounted = true; // Indicate the mount state

    get(`/api/herd_pedigree/${id}`).then(
      data => mounted && data && setPedigree(data),
      error => console.error(error)
    )

    get(`/api/herd/${id}`).then(
      data => data && setHerd(data),
      error => console.error(error)
    )
    return () => { // Runs when component will unmount
      mounted = false;
    }
  }, [id])


  return <>
    {herd && pedigree && <>
      <Table width="100%">
        <TableBody>
          <TableRow style={{ verticalAlign: "top" }}>
            <TableCell width="15%">
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
            </TableCell>
            <TableCell width="85%" >
              <PedigreeNetwork pedigree={pedigree} />
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </>
    }
  </>
}


