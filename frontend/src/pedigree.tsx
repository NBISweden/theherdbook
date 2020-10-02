/**
 * @file This file contains functions for calculating and formatting pedigrees.
 */

import { Genebank, Individual, LimitedIndividual } from '@app/data_context_global';

type VisColor = {border: string, background: string,
                 highlight: {border: string, background: string},
                 hover: {border: string, background: string}
                }
export type Node = {id: string, x: number, label: string, shape: string,
                    color: VisColor
                  }
export type Edge = {id: string, from: string, to: string}
export type Pedigree = {nodes: Node[], edges: Edge[]}

/**
 * Looks through all loaded genebanks for information on the given individual
 * number `id`.
 *
 * @param id individual number of the animal to find
 */
const getIndividual = (genebanks: Genebank[], id: string): Individual | undefined => {
  return genebanks.filter((genebank: Genebank) => genebank.individuals)
                  .flatMap((genebank: Genebank) => genebank.individuals)
                  .find((i: Individual) => i.number == id)
}

/**
 * Formats the limited individual information `ind` as a node descriptor with
 * the x-value `x`.
 *
 * @param ind individual description as `{name: string, number: string, sex: string}
 * @param x numerical x value
 */
const asNode = (ind: Individual, x: number): Node => {
  const color: VisColor = {
    border: 'darkgrey',
    background: 'lightgreen',
    highlight: {
      border: 'grey',
      background: 'yellowgreen'
    },
    hover: {
      border: 'black',
      background: 'yellowgreen'
    }
  }
  switch (ind.sex) {
    case 'male':
      color.background = 'LightSkyBlue'
      color.highlight.background = '#6DC4F9'
      color.hover.background = '#6DC4F9'
      break;
    case 'female':
      color.background = 'pink'
      color.highlight.background = '#FFA5B4'
      color.hover.background = '#FFA5B4'
      break;
  }
  return {id: ind.number,
          x: x,
          label: ind.name ? `${ind.name}\n${ind.number}` : ind.number,
          shape: ind.sex == 'male'   ? 'box'
               : ind.sex == 'female' ? 'oval'
                                     : 'triangle', // unknown sex
          color: color
        }
}

/**
 * Returns `generations` from a pedigree of an individual given by an `id`
 * string, using data from `genebanks`.
 *
 * @param genebanks genebank array to use for fetching individual data
 * @param id individual number of the individual whose pedigree to generate
 * @param generations the number of generations to plot
 */
export function calcPedigree(genebanks: Genebank[], id: string, generations: number): Pedigree {
  let nodes: Node[] = []
  let edges: Edge[] = []
  const indData = getIndividual(genebanks, id)
  if (indData) {
    nodes.push( asNode(indData, edges.length) )

    const getPedigree = (ind: Individual, level = generations) => {
      let pedigreeNodes: Node[] = []
      let pedigreeEdges: Edge[] = []
      if (level > 0) {
        // loop over mother and father, if they exist
        [ind.mother, ind.father].forEach((parent: LimitedIndividual | null) => {
          if (parent && parent.id !== null) {
            const data = getIndividual(genebanks, parent.number)
            if (data) {
              pedigreeNodes.push(asNode(data, 0))
              pedigreeEdges.push({id: `${ind.number}-${data.number}`,
                                  from: ind.number,
                                  to: data.number})
              const parents = getPedigree(data, level - 1)
              pedigreeNodes = [...pedigreeNodes, ...parents.nodes]
              pedigreeEdges = [...pedigreeEdges, ...parents.edges]
            }
          }
        })
      }
      return {nodes: pedigreeNodes, edges: pedigreeEdges}
    }
    const pedigree = getPedigree(indData)
    nodes = [...nodes, ...pedigree.nodes]
    edges = [...edges, ...pedigree.edges]
  }
  // remove duplicate nodes and edges
  nodes = nodes.filter((v,i,s) => s.findIndex(o => o.id == v.id) == i)
  edges = edges.filter((v,i,s) => s.findIndex(o => o.id == v.id) == i)

  return {nodes: nodes, edges: edges}
}
