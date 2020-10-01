
import React from 'react'
import { Link } from "react-router-dom";
import { get } from './communication';
import { PedigreeNetwork } from "./pedigree"
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableRow from '@material-ui/core/TableRow';
import { useDataContext } from './data_context';
import { Genebank, Individual, LimitedIndividual } from './data_context_global';

/**
 * Shows the information of a given individual and the pedigree graph built using the PedigreeNetwork component
 */
export function IndividualPedigree({ id, generations }: { id: string, generations: number}) {
  const [pedigree, setPedigree] = React.useState(undefined as any)
  const [individual, setIndividual] = React.useState(undefined as any)
  const [generations_input, setGenerations] = React.useState(generations)
  const { genebanks } = useDataContext()

  type Node = {id: string, x: number, label: string, shape: string, color: string}
  type Edge = {id: string, from: string, to: string}

  /**
   * Looks through all loaded genebanks for information on the given individual
   * number `id`.
   *
   * @param id individual number of the animal to find
   */
  const getIndividual = (id: string): Individual | undefined => {
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
    return {id: ind.number,
            x: x,
            label: ind.name ? `${ind.name}\n${ind.number}` : ind.number,
            shape: ind.sex == 'male'   ? 'box'
                 : ind.sex == 'female' ? 'oval'
                                       : 'triangle', // unknown sex
            color: ind.sex == 'male'   ? 'LightSkyBlue'
                 : ind.sex == 'female' ? 'pink'
                                       : 'lightgreen' // unknown sex
          }
  }

  React.useEffect(() => {
    let nodes: Node[] = []
    let edges: Edge[] = []
    const indData = getIndividual(id)
    if (indData) {
      nodes.push( asNode(indData, edges.length) )

      const getPedigree = (ind: Individual, level = generations_input) => {
        let pedigreeNodes: Node[] = []
        let pedigreeEdges: Edge[] = []
        if (level > 0) {
          // loop over mother and father, if they exist
          [ind.mother, ind.father].forEach((parent: LimitedIndividual | null) => {
            if (parent && parent.id !== null) {
              const data = getIndividual(parent.number)
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

    setPedigree({nodes: nodes, edges: edges});
  }, [genebanks, id, generations_input])

  React.useEffect(() => {
    let mounted = true
    const url = `/api/individual/${id}`
    get(url).then(
      data => {
        mounted && data && setIndividual(data)
      },
      error => console.error(error)
    )

    return () => { mounted = false }//allows to validate the mount state of the component

  }, [id])//dependent on these values

  return <>
    {individual  && <>
      <Table width="100%">
        <TableBody>
          <TableRow style={{ verticalAlign: "top" }}>
            <TableCell width="15%">
              <h2>{individual.name ?? 'unnamed'}</h2>
              <dl>
                <dt>Inavelskoefficient</dt> <dd><b>{individual.inbreeding}%</b></dd>
                <dt>Nummer</dt> <dd>{individual.number}</dd>
                <dt>Certifikat</dt> <dd>{individual.certificate}</dd>
                <dt>Kön</dt> <dd>{individual.sex ?? 'unknown'}</dd>
                <dt>Födelsedatum</dt> <dd>{individual.birth_date ?? '-'}</dd>
                <dt>Dödsdatum</dt> <dd>{individual.death_date ?? '-'}</dd>
                <dt>Dödsanteckning</dt> <dd>{individual.death_note ?? '-'}</dd>
                <dt>Besättning</dt>
                <Link to={`/herd/${individual.herd.herd}`}>
                  <dd>{individual.herd.name ?? individual.herd.herd}</dd>
                </Link>
                <dt>Mor</dt>
                {individual.mother
                  ? <Link to={`/individual/${individual.mother.number}`}>
                    <dd>{individual.mother.name}</dd>
                  </Link>
                  : <dd>-</dd>
                }
                <dt>Far</dt>
                {individual.father
                  ? <Link to={`/individual/${individual.father.number}`}>
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
                    ? individual.weights.map((w: any) => `${w.date.substring(0, 16)}: ${w.weight}`).join(", ")
                    : '-'
                  }
                </dd>

              </dl>
            </TableCell>
            <TableCell width="85%" style={{textAlign: "left"}}>
              <h3>Pedigree: <input value={generations_input} onChange={event => setGenerations(+event.currentTarget.value)} type="number" min="1" max="50" /></h3>
              {pedigree && <PedigreeNetwork pedigree={pedigree} />}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </>
    }
  </>
}



