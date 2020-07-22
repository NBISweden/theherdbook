/**
 * @file This file contains the Pedigree function. This function fetches
 *       pedigree for a given `id` (parsed from the url).
 */
import React from 'react'
import {Link} from "react-router-dom";

import { get } from './communication';

/**
 * Shows pedigree information for a given individual in a herd
 */
export function Pedigree({id}: {id: string}) {
  const [pedigree, setPedigree] = React.useState(undefined as any)

  React.useEffect(() => {
    get(`/api/pedigree/${id}`).then(
      data => data&& setPedigree(data),
      error => console.error(error)
    )
  }, [id])

  return <>
    {pedigree
      && <>
          <h2></h2>
          <dl>
            <dt>Pedigree</dt> <dd>{pedigree.individual.number}</dd>
          </dl>
        </>
      }
  </>
}
