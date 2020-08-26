import React, { Component, useRef, useEffect } from 'react'
import { Network } from 'vis-network';
import "vis-network/styles/vis-network.css"
import { useHistory } from "react-router-dom";


const PedigreeNetwork = ({pedigree}) => {

    const options = {
      width: Math.round(window.innerWidth * 0.90) + 'px',
      height: Math.round(window.innerHeight * 0.80) + 'px',
      layout: {
        hierarchical: {
          enabled: true,
          direction: "DU",
          sortMethod: 'directed',
          //shakeTowards: "roots",
          levelSeparation: 150,
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

    // A reference to the div rendered by this component
    const domNode = useRef(null);
    const network = useRef(null);
    const history = useHistory();

    useEffect(
    () => {
      network.current = new Network(domNode.current, pedigree, options);
      network.current.on("doubleClick", (params) => {
          if (params.nodes.length > 0) {
            const nodeid = params.nodes[0];
            history.push("/pedigree/" + nodeid);
          }
      });
    },
    [domNode, network, pedigree, options]);

    return (
        <div ref={domNode}  >
        </div>
    );
};

export default PedigreeNetwork;
