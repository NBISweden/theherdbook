/**
 * @file This file contains the Pedigree function. This function fetches
 *       pedigree for a given `id` (parsed from the url).
 */

import React from 'react'
import { Link } from "react-router-dom";

import { get } from './communication';
import Tree from 'react-d3-tree'


/**
 * Shows the information of a given individual in a herd, including the pedigree graph
 */
export function PedigreeD3({ id }: { id: string }) {
  const [pedigree, setPedigreeD3] = React.useState(undefined as any)
  const [individual, setIndividual] = React.useState(undefined as any)


  React.useEffect(() => {
    get(`/api/individual/${id}`).then(
      data => data && setIndividual(data),
      error => console.error(error)
    )
    get(`/api/pedigree/${id}`).then(
      data => data && setPedigreeD3(data),
      error => console.error(error)
    )
  }, [id])

  const containerStyles = {
    width: '100%',
    height: '100vh',
  }

  class CenteredTree extends React.PureComponent {
    state = {}

    componentDidMount() {
      const dimensions = this.treeContainer.getBoundingClientRect();
      this.setState({
        translate: {
          x: dimensions.width / 2,
          y: 30
        }
      });
    }

    render() {

      function onNodeClick(nodeData, evt) {
        window.location.replace("/pedigree/" + nodeData.id2);
      }
      return (
        <div style={containerStyles} ref={tc => (this.treeContainer = tc)}>
          {pedigree &&
            <Tree
              data={pedigree}
              translate={this.state.translate}
              orientation={'vertical'}
              zoom={0.7}
              onClick={onNodeClick}
              collapsible={false}
              separation={{siblings: 1, nonSiblings: 1}}
              pathFunc={'elbow'}
              textLayout={{textAnchor: "middle" }}
            />
          }
        </div>
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
            <td width="90%">
              <CenteredTree data={pedigree} />
            </td>
          </tr>

        </tbody>
      </table>
    </>
    }
  </>
}



