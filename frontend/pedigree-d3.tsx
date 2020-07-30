/**
 * @file This file contains the Pedigree function. This function fetches
 *       pedigree for a given `id` (parsed from the url).
 */

import React from 'react'
import {Link} from "react-router-dom";

import { get } from './communication';
import Tree from 'react-d3-tree'

export function PedigreeD3({id}: {id: string}) {
  const [pedigree, setPedigreeD3] = React.useState(undefined as any)

React.useEffect(() => {
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
        y: 20
      }
    });
  }

  render() {
    return (
      <div style={containerStyles} ref={tc => (this.treeContainer = tc)}>
        <Tree
          data={pedigree}
          translate={this.state.translate}
          orientation={'vertical'}
        />
      </div>
    );
  }
}
  return <>
    {pedigree
      && <>
          <h2>Pedigree</h2>
           <CenteredTree data={pedigree}/>

        </>
      }
  </>
}
