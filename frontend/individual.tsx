/**
 * @file This file contains the Individual function. This function fetches
 *       individual for a given `individualId` (parsed from the url).
 */
import React from 'react'
import {Link, useParams} from "react-router-dom";

import { get } from './communication';

/**
 * Shows information for a given individual in a herd
 */
export function Individual() {
  let { individualId } = useParams();
  const [individual, setIndividual] = React.useState(undefined)

  React.useLayoutEffect(() => {
    get(`/api/individual/${individualId}`).then(
      data => setIndividual(data.individual),
      error => console.error(error)
    )
  }, [])

  return <>
    {individual
      ? <>
          <h2>{individual.name}</h2>
        </>
      : ''}
  </>
}
