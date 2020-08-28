

import React, { Component, useEffect } from 'react'
import { get } from './communication';
import {PedigreeNetwork} from "./pedigree"

/**
 * Shows the genebank pedigree graph built using the vis-network component
 */
export function GenebankPedigree({ id }: { id: string }) {
  const [pedigree, setPedigree] = React.useState(undefined as any)

  React.useEffect(() => {
    console.log("use effect");
    let mounted = true; // Indicate the mount state

    get(`/api/genebank_pedigree/${id}`).then(
      data => mounted && data && setPedigree(data),
      error => mounted && console.error(error)
    )

    return () => { // Runs when component will unmount
            mounted = false;
    }
  }, [id])


  return <>
    {pedigree && <PedigreeNetwork pedigree={pedigree}/>}
  </>
}



