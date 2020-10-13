
import React from 'react'
import { useHistory } from "react-router-dom";
import { PedigreeNetwork } from "@app/pedigree_plot"
import { useDataContext } from '@app/data_context';
import { calcPedigree } from '@app/pedigree';
import { TextField } from '@material-ui/core';

/**
 * Shows the information of a given individual and the pedigree graph built using the PedigreeNetwork component
 */
export function IndividualPedigree({ id, generations }: { id: string, generations: number}) {
  const [generations_input, setGenerations] = React.useState(generations)
  const { genebanks } = useDataContext()
  const history = useHistory();
  const pedigree = React.useMemo(() => calcPedigree(genebanks, id, generations_input), [genebanks, id, generations_input])

  return <>
    <TextField
      label="Antal Generationer"
      type="number"
      value={generations_input}
      onChange={event => setGenerations(+event.currentTarget.value)}
      InputLabelProps={{
        shrink: true,
      }}
    />
    {React.useMemo(() => <PedigreeNetwork
        pedigree={pedigree}
        onClick={(nodeId:string) => history.push("/individual/" + nodeId)}
      />, [pedigree])
    }
  </>
}



