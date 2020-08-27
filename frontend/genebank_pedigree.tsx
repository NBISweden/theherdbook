

import React, { Component, useEffect } from 'react'
import { get } from './communication';
import PedigreeNetwork from "./pedigree"

/**
 * Shows the genebank pedigree graph built using the vis-network component
 */
export function GenebankPedigree({ id }: { id: string }) {
  const [pedigree, setPedigree] = React.useState(undefined as any)

  React.useEffect(() => {

    get(`/api/genebank_pedigree/${id}`).then(
      data => data && setPedigree(data),
      error => console.error(error)
    )
  }, [id])


  return <>
    {pedigree && <PedigreeNetwork pedigree={pedigree}/>}
  </>
}



