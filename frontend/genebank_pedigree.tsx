/**
 * @file This file contains the Pedigree function. This function fetches
 *       pedigree for a given `id` (parsed from the url).
 */

import React, { Component, createRef } from 'react'
import { Link, useHistory } from "react-router-dom";
import { get } from './communication';
import { Network } from 'vis-network';
import "vis-network/styles/vis-network.css"

/**
 * Shows the information of a given individual and the pedigree graph built using the vis-network component
 */
export function GenebankPedigree({ id }: { id: string }) {
  const [pedigree, setPedigree] = React.useState(undefined as any)
  const history = useHistory()

  React.useEffect(() => {

    get(`/api/genebank_pedigree/${id}`).then(
      data => data && setPedigree(data),
      error => console.error(error)
    )
  }, [id])

  class GenebankPedigreeNetwork extends Component {

    options = {
      width: Math.round(window.innerWidth * 0.95) + 'px',
      height: Math.round(window.innerHeight * 0.85) + 'px',
      layout: {
        hierarchical: {
          enabled: true,
          direction: "DU",
          sortMethod: 'directed',
          //shakeTowards: "roots",
          levelSeparation: 250,
          parentCentralization:true,
          edgeMinimization: true,
          blockShifting: true,
          nodeSpacing: 100
        }
      },
      edges: {
        arrows: { to: { enabled: true, scaleFactor: 0.50 } }
      },
      interaction: {
        navigationButtons: true,
        keyboard: true
      },
      physics: false
   }

    constructor() {
      super();
      this.network = {};
      this.appRef = createRef();
    }

    componentDidMount() {
      this.network = new Network(this.appRef.current, pedigree, this.options);
      this.network.on("doubleClick", this.onNodeClick)
    }

    onNodeClick(params) {
      if (params.nodes.length > 0) {
        const nodeid = params.nodes[0];
        history.push("/pedigree/" + nodeid);
      }
    }

    render() {

      return (
        <div ref={this.appRef}  >
        </div>
      );
    }
  }

  return <>
    {pedigree && <GenebankPedigreeNetwork />}
  </>
}



