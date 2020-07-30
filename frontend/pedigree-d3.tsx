/**
 * @file This file contains the Pedigree function. This function fetches
 *       pedigree for a given `id` (parsed from the url).
 */

import React from 'react'
import {Link} from "react-router-dom";

import { get } from './communication';
import Tree from 'react-d3-tree'

export function setPedigreeD3({id}: {id: string}) {
  const [pedigree, setPedigree] = React.useState(undefined as any)

React.useEffect(() => {
    get(`/api/pedigree/${id}`).then(
      data => data && setPedigreeD3(data),
      error => console.error(error)
    )
  }, [id])


  return <>
    {pedigree
      && <>
          <h2>Pedigree</h2>
          <Tree data={pedigree}  />
        </>
      }
  </>
}
