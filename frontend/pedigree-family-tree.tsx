/**
 * @file This file displays the
 *       pedigree for a given `id` (parsed from the url), using the family-tree component.
 *       It does not displays cross-overs, see instead pedigree-vis-network for a more complete pedigree graph.
 */

import React from 'react'
import {Link} from "react-router-dom";
import { get } from './communication';
import logo from './family-tree/logo.svg';
import './family-tree/family-tree.css';
import FamilyTree from './family-tree/familyTree';

export function Pedigree({id}: {id: string}) {
  const [pedigree, setPedigree] = React.useState(undefined as any)

React.useEffect(() => {
    get(`/api/pedigree/${id}`).then
    (
      data => data && setPedigree(data),
      error => console.error(error)
    )
  }, [id])

  var members = [pedigree]

  return <>
    {pedigree
      && <>
          <h2>Pedigree</h2>
          <FamilyTree members={members}  />
        </>
      }
  </>
}
