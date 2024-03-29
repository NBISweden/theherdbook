import React, { useRef, useEffect } from "react";
import { Network } from "vis-network";

import "vis-network/styles/vis-network.css";

/**
 * @file This file contains the PedigreeNetwork component that displays the pedigree for an individual or a herd,
 * depending on the input data. The network data is built from the python api.
 */
export function PedigreeNetwork({
  pedigree,
  onClick = () => {},
}: {
  pedigree: { edges: any[]; nodes: any[] };
  onClick: Function;
}) {
  // A reference to the div rendered by this component
  const domNode = useRef(null);
  const network = useRef(null);

  const options = {
    width: "100%",
    height: "100%",
    autoResize: true,

    layout: {
      hierarchical: {
        enabled: true,
        direction: "DU", //Down up orientation
        sortMethod: "directed",
        levelSeparation: 120, //vertical space between the nodes
        parentCentralization: true,
        shakeTowards: "roots", //it moves the parents up in the pedigree
        edgeMinimization: true,
        blockShifting: true,
        nodeSpacing: 140,
      },
    },

    edges: {
      color: { color: "DarkGray", inherit: false }, //avoids the arrows to inherit node color
      arrows: { to: { enabled: true, scaleFactor: 0.5 } }, //makes smaller arrows
      smooth: { type: "cubicBezier", forceDirection: "vertical", roundness: 1 }, //makes elbow arrows
    },

    interaction: {
      navigationButtons: true,
      keyboard: false,
    },

    physics: false, //it makes the rendering faster, recommended in hierarchical layout
  };

  useEffect(() => {
    network.current = new Network(domNode.current, pedigree, options);
    network.current.on("doubleClick", (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        onClick(nodeId);
      }
    });
  }, [pedigree]);

  return (
    <div
      style={{
        position: "absolute",
        top: "0px",
        right: "0px",
        bottom: "0px",
        left: "0px",
      }}
      ref={domNode}
    />
  );
}
