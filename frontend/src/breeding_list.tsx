/**
 * @file This file contains the HerdView function. This function fetches herd
 *       for a given `id` (parsed from the url), as well as the individuals
 *       belonging to that herd.
 */
import React from 'react'
import { makeStyles } from '@material-ui/core/styles';

import { get } from '@app/communication';
import { useMessageContext } from '@app/message_context';
import { useDataContext } from './data_context';
import { individualLabel } from './data_context_global';
import { SortedTable, Column } from './sorted_table';

const useStyles = makeStyles({
  table: {
    width: "50%",
    padding: "5px",
  },
  loading: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    fontSize: "1.2em",
  }
});

export interface Breeding {
  id?: number,
  breed_date: string,
  breed_notes: string,
  father: string,
  mother: string,
  birth_date: string,
  birth_notes: string,
  litter_size: number,
}
type Order = 'asc' | 'desc'

/**
 * Shows herd information, with a list of all individuals belonging to that
 * herd.
 */
export function BreedingList({id}: {id: string | undefined}) {
  const [ breedingEvents, setBreedingEvents ] = React.useState([] as Breeding[])
  const { userMessage } = useMessageContext()
  const { genebanks } = useDataContext()
  const style = useStyles();

  // Parent information from the genebank
  const parents = React.useMemo(() => {
    const parentNumbers = breedingEvents.flatMap(b => [b.mother, b.father]);
    return genebanks.flatMap(genebank => {
      return genebank.individuals.filter(i => parentNumbers.includes(i.number))
    })
  }, [genebanks, breedingEvents])

  function breedingInfo(breeding: Breeding): String {
    const mother = parents.find(p => p.number == breeding.mother)
    const father = parents.find(p => p.number == breeding.father)

    const motherInfo = mother ? individualLabel(mother) : 'Unknown'
    const fatherInfo = father ? individualLabel(father) : 'Unknown'
    return `${motherInfo} & ${fatherInfo}`
  }

  const columns: Column[] = [
    {field: 'breed_date', label: 'Parningsdatum', sortAs: 'date', hidden: false},
    {field: 'breed_notes', label: 'Parningsanteckningar', hidden: true},
    {field: 'mother', label: 'Moder', sortAs: 'numbers', hidden: false},
    {field: 'father', label: 'Fader', sortAs: 'numbers', hidden: false},
    {field: 'birth_date', sortAs: 'date', label: 'Födslodatum', hidden: false},
    {field: 'birth_notes', label: 'Födselanteckningar', hidden: true},
    {field: 'litter_size', sortAs: 'number', label: 'Antal ungar', hidden: false},
  ];

  React.useEffect(() => {
    if (id) {
      get(`/api/breeding/${id}`).then(
        (data: {breedings: Breeding[]}) => {
          data && setBreedingEvents(data.breedings)
        },
        error => {
          console.error(error)
          userMessage(error, 'error')
        }
      )
    }
  }, [id])

  return <>
    <SortedTable columns={columns}
                 data={breedingEvents}
                 className={style.table}
                 rowsPerPage={5}/>
  </>
}
