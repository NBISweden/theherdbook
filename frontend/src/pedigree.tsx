import React, { Component, useRef, useEffect } from 'react'
import { Network } from 'vis-network';
import { useHistory } from "react-router-dom";

import { PedigreeCSS } from './pedigree_css'


/**
 * @file This file contains the PedigreeNetwork component that displays the pedigree for an individual or a herd,
 * depending on the input data. The network data is built from the python api.
 */

export function PedigreeNetwork({ pedigree }: { pedigree: string }) {

  // A reference to the div rendered by this component
  const domNode = useRef(null);
  const network = useRef(null);
  const history = useHistory();

  const options = {
    width: Math.round(domNode.offsetWidth * 0.85) + 'px',//width is calculated considering the parent component width
    height: Math.round(window.innerHeight * 0.75) + 'px',//height uses the window height as reference, the domNode did not worked
    layout: {
      hierarchical: {
        enabled: true,
        direction: "DU",//Down up orientation
        sortMethod: 'directed',
        levelSeparation: 120,//vertical space between the nodes
        parentCentralization: true,
        //shakeTowards: "roots",//it moves the parents up in the pedigree
        edgeMinimization: true,
        blockShifting: true,
        nodeSpacing: 120
      }
    },
    edges: {
      //color:  { color: "LightGray", inherit: false },//avoids the arrows to inherit node color
      arrows: { to: { enabled: true, scaleFactor: 0.50 } }//makes smaller arrows
      //smooth: { type: "cubicBezier", forceDirection: "vertical", roundness: 1}//makes elbow arrows
    },
    interaction: {
      navigationButtons: true,
      keyboard: true
    },
    physics: false//it makes the rendering faster, recommended in hierarchical layout
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


  return <>
    <PedigreeCSS />
    <div ref={domNode}  >
    </div>
  </>;
};


