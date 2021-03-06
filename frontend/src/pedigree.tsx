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
 * Returns a copy of the array with duplicates removed, via reference equality,
 * or via key equality if a key is given. Note that all array elements need to
 * have the given key if a key is given
 *
 * unique([1,2,3,2,1,3]) // => [1,2,3]
 * unique({id: 1}, {id: 1}, {id: 2}, 'id') // => [{id: 1}, {id: 2}]
 *
 */
export function unique(xs: any[], key: string | undefined = undefined): any[] {
  const seen = new Set()
  return xs.filter(x => {
    const duplicate = key ? seen.has(x[key]) : seen.has(x)
    key ? seen.add(x[key]) : seen.add(x)
    return !duplicate
  })
}

const indexes = new WeakMap<Genebank[], Record<string, Individual>>()

function get_index(genebanks: Genebank[]): Record<string, Individual> {
  if (!indexes.has(genebanks)) {
    const index = {}
    genebanks.forEach(genebank =>
      (genebank.individuals || []).forEach(
        i => {
          index[i.number] = i
        }))
    indexes.set(genebanks, index)
  }
  return indexes.get(genebanks)!
}

/**
 * Looks through all loaded genebanks for information on the given individual
 * number `id`.
 *
 * @param id individual number of the animal to find
 */
const getIndividual = (genebanks: Genebank[], id: string): Individual | undefined => {
  const index = get_index(genebanks)
  return index[id]
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
export function calcPedigree(genebanks: Genebank[], id: string, generations: number = 1000): Pedigree {
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
  nodes = unique(nodes, 'id')
  edges = unique(edges, 'id')

  nodes.sort((a, b) => a.id > b.id ? 1 : -1)
  edges.sort((a, b) => a.id > b.id ? 1 : -1)

  return {nodes: nodes, edges: edges}
}

export function calcPedigreeDan(genebanks: Genebank[], id: string, generations: number = 1000): Pedigree {
  let nodes: Node[] = []
  let edges: Edge[] = []
  const indData = getIndividual(genebanks, id)

  const visited = {} as Record<string, number>
  const queue = [{depth: 0, id}] as {depth: number, id: string}[]
  let pos = 0

  while (pos < queue.length) {
    const {depth, id} = queue[pos++]
    if (depth > generations) {
      break
    }
    if (visited[id] !== undefined) {
      continue
    }
    visited[id] = depth
    const ind = getIndividual(genebanks, id)
    if (!ind) {
      continue
    }
    nodes.push(asNode(ind, 0))
    const parents = [ind.mother, ind.father]
    parents.forEach((parent: LimitedIndividual | null) => {
      if (parent && parent.id !== null) {
        queue.push({
          depth: depth + 1,
          id: parent.number,
        })
        edges.push({
          id: `${id}-${parent.number}`,
          from: id,
          to: parent.number,
        })
      }
    })
  }

  nodes.sort((a, b) => a.id > b.id ? 1 : -1)
  edges.sort((a, b) => a.id > b.id ? 1 : -1)

  return {nodes, edges}
}

/**
 * Returns the combined pedigree for the herd identified by `herdId` from the
 * data in `genebanks`.
 *
 * This function will generate the pedigree of all individuals in in the herd
 * and then reduce them. This is a reasonably time consuming task that might
 * need to be optimzed.
 *
 * @param genebanks the genebank data to use for pedigree generation
 * @param herdId the id of the herd to plot
 * @param generations the number of generations to plot
 */
export function herdPedigree(genebanks: Genebank[], herdId: string | undefined, generations: number = 1000, algo = 'Martin' as 'Martin' | 'Dan'): Pedigree {

  let nodes: Node[] = []
  let edges: Edge[] = []

  if (herdId == undefined || !genebanks || genebanks.length == 0) {
    return {nodes: [], edges: []}
  }

  const genebank = genebanks.find(genebank => genebank.herds.some(herd => herd.herd == herdId))
  if (!genebank || !genebank.individuals) {
    return {nodes: [], edges: []}
  }

  const herd = genebank.individuals.filter(individual => individual.herd.herd == herdId)

  if (herd.length == 0) {
    return {nodes: [], edges: []}
  }

  herd.forEach(individual => {
    const pedigree = (algo === 'Martin' ? calcPedigree : calcPedigreeDan)(genebanks, individual.number, generations)

    nodes = [...nodes, ...pedigree.nodes]
    edges = [...edges, ...pedigree.edges]

  })

  // remove duplicate nodes and edges
  nodes = unique(nodes, 'id')
  edges = unique(edges, 'id')

  return {nodes: nodes, edges: edges}
}
