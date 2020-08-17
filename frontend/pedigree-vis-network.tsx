/**
 * @file This file contains the Pedigree function. This function fetches
 *       pedigree for a given `id` (parsed from the url).
 */

import React, { Component, createRef } from 'react'
import { Link } from "react-router-dom";
import { get } from './communication';
import { Network } from 'vis-network';

/**
 * Shows the information of a given individual and the pedigree graph built using the vis-network component
 */
export function PedigreeVisNetwork({ id }: { id: string })
{
  const [pedigree, setPedigree] = React.useState(undefined as any)
  const [individual, setIndividual] = React.useState(undefined as any)

  React.useEffect(() => {
    get(`/api/individual/${id}`).then(
      data => data && setIndividual(data),
      error => console.error(error)
    )
    get(`/api/pedigree-vis-network/${id}`).then(
      data => data && setPedigree(data),
      error => console.error(error)
    )
  }, [id])

  class PedigreeNetwork extends Component {

    options = {
      layout: {
        hierarchical: {
          enabled: true,
          direction: "LR",
          sortMethod: 'directed',
          shakeTowards: "roots",
          levelSeparation: 200
        }
      },
      edges: {
        color:  { color: "gray", inherit: false },
        arrows: { to: {enabled: true, scaleFactor: 0.50 }},
        smooth: { type: "cubicBezier", roundness: 0.50}
      },
      nodes: {fixed: false}
    }

    onNodeClick(params) {
      if (params.nodes.length > 0) {
        var nodeid = params.nodes[0];
        console.log(nodeid);
        window.location.replace("/pedigree/" + nodeid);
      }
    }

    constructor() {
      super();
      this.network = {};
      this.appRef = createRef();
    }

    componentDidMount() {
      this.network = new Network(this.appRef.current, pedigree, this.options);
      this.network.on("doubleClick", this.onNodeClick)
      //this.network.on("stabilizationIterationsDone", function () {
      //  this.network.setOptions({ physics: false });
      //});
    }

    render() {
      return (
        <div ref={this.appRef} style={{ position:"absolute", top: "120px", width: "1280px", height: "720px" }} />
      );
    }
  }

  return <>
    {individual && <>
      <h2>{individual.name ?? 'unnamed'}</h2>
      <table width="100%">
        <tbody>
          <tr>
            <td width="10%" style={{ verticalAlign: "top" }}>
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
              </dl>
            </td>
            <td width="90%" >
              <PedigreeNetwork />
            </td>
          </tr>
        </tbody>
      </table>
    </>
    }
  </>
}



