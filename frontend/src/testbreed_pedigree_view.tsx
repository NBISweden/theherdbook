import React from 'react'
import { Autocomplete } from '@material-ui/lab'
import { TextField, FormControlLabel, Switch } from '@material-ui/core'
import { makeStyles } from '@material-ui/core/styles'
import { inputVariant } from '@app/data_context_global'
import { useDataContext } from '@app/data_context'
import { testBreedIndividuals } from '@app/testbreed_form'
import { PedigreeNetwork } from '@app/pedigree_plot'
import { testBreedPedigree } from '@app/pedigree'
import { IndividualView } from '@app/individual_view'

const useStyles = makeStyles({
    netWorkConfiguration: {
      display: 'flex',
      marginTop: '30px'
    },
    generationsInput: {
      width: '140px',
      margin: '5px 0px 5px 0px'
    },
    toggle: {
      margin: '5px 0px 5px 0px',
    },
  })

export function TestbreedPedigreView({ chosenAncestors, generations }: { chosenAncestors: testBreedIndividuals, generations: number}) {
    const style = useStyles()
    const { genebanks } = useDataContext()
    const [generations_input, setGenerations] = React.useState(generations)
    const [showCommonAncestors, setshowCommonAncestors] = React.useState(false as boolean)
    let generationsOptions: number[] = []
    for (let i=3; i < 8; i++) {
        generationsOptions.push(i)
    }
    const res = React.useMemo(() => testBreedPedigree(genebanks, chosenAncestors,
      generations_input, showCommonAncestors), [genebanks, chosenAncestors, generations_input, showCommonAncestors])
    let pedigree = res.pedigree
    let commonAncestors = res.commonAncestors
return<>
        <div className= {style.netWorkConfiguration}>
        <Autocomplete className = {style.generationsInput}
                            options={generationsOptions}
                            getOptionLabel={(option: number) => option.toString()}
                            value={generations_input}
                            onChange={(event, newValue) => {
                            setGenerations(newValue ? newValue : generations)
                            }}
                            renderInput={(params) => <TextField {...params}
                            label='Antal generationer'
                            variant={inputVariant}
                            />}
        />
        <FormControlLabel className= {style.toggle}
            value={showCommonAncestors}
            control={<Switch color="primary" onChange={(event) => {
            setshowCommonAncestors(!showCommonAncestors)
            }} disabled={commonAncestors ? false : true} edge='start'/>}
            label= "Markera gemensamma släktingar"
            labelPlacement="end"
        />
        </div>
        {pedigree &&
                <PedigreeNetwork
                pedigree={pedigree}
                onClick={(node: string) => popup(<IndividualView id={node} />, `/individual/${node}`)}
                />
            }
  </>
}