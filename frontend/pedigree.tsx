import React, { Component, useRef, useEffect } from 'react'
import { Network } from 'vis-network';
import "vis-network/styles/vis-network.css"
import { useHistory } from "react-router-dom";


/**
 * @file This file contains the PedigreeNetwork component that displays the pedigree for an individual or a herd.
 * The network data is built from the python api
 */

export function PedigreeNetwork({ pedigree }: { pedigree: string }) {

  // A reference to the div rendered by this component
  const domNode = useRef(null);
  const network = useRef(null);
  const history = useHistory();

  const options = {
    width: Math.round(domNode.offsetWidth * 0.85) + 'px',
    height: Math.round(window.innerHeight * 0.75) + 'px',
    layout: {
      hierarchical: {
        enabled: true,
        direction: "DU",
        sortMethod: 'directed',
        levelSeparation: 120,
        parentCentralization: true,
        //shakeTowards: "roots",//it moves the parents up in the pedigree
        edgeMinimization: true,
        blockShifting: true,
        nodeSpacing: 100
      }
    },
    edges: {
      //color:  { color: "LightGray", inherit: false },
      arrows: { to: { enabled: true, scaleFactor: 0.50 } }
      //smooth: { type: "cubicBezier", forceDirection: "vertical", roundness: 1}
    },
    interaction: {
      navigationButtons: true,
      keyboard: true
    },
    physics: false
  }


  useEffect(
    () => {
      network.current = new Network(domNode.current, pedigree, options);
      network.current.on("doubleClick", (params) => {
        if (params.nodes.length > 0) {
          const nodeid = params.nodes[0];
          history.push("/individual/" + nodeid);
        }
      });
    },
    [pedigree]);


  return (
    <div ref={domNode}  >
    </div>
  );
};


