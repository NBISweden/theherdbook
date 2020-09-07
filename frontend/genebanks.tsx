/**
 * @file This file contains the Genebanks function. This function is used for
 * parsing through the herd and individuals data.
 */
import React, { forwardRef, useState } from 'react'
import { makeStyles } from '@material-ui/core/styles';

import { useDataContext } from './data_context'
import { Genebank, Individual } from '~data_context_global';
import { Button, Paper } from '@material-ui/core';

import { default as MaterialTable, Icons } from 'material-table'
import { Link } from 'react-router-dom'

import {AddBox, ArrowDownward, Check, ChevronLeft, ChevronRight, Clear,
        DeleteOutline, Edit, FilterList, FirstPage, LastPage, Remove, SaveAlt,
        Search, ViewColumn } from '@material-ui/icons'

const tableIcons: Icons = {
  Add: forwardRef((props, ref) => <AddBox {...props} ref={ref} />),
  Check: forwardRef((props, ref) => <Check {...props} ref={ref} />),
  Clear: forwardRef((props, ref) => <Clear {...props} ref={ref} />),
  Delete: forwardRef((props, ref) => <DeleteOutline {...props} ref={ref} />),
  DetailPanel: forwardRef((props, ref) => <ChevronRight {...props} ref={ref} />),
  Edit: forwardRef((props, ref) => <Edit {...props} ref={ref} />),
  Export: forwardRef((props, ref) => <SaveAlt {...props} ref={ref} />),
  Filter: forwardRef((props, ref) => <FilterList {...props} ref={ref} />),
  FirstPage: forwardRef((props, ref) => <FirstPage {...props} ref={ref} />),
  LastPage: forwardRef((props, ref) => <LastPage {...props} ref={ref} />),
  NextPage: forwardRef((props, ref) => <ChevronRight {...props} ref={ref} />),
  PreviousPage: forwardRef((props, ref) => <ChevronLeft {...props} ref={ref} />),
  ResetSearch: forwardRef((props, ref) => <Clear {...props} ref={ref} />),
  Search: forwardRef((props, ref) => <Search {...props} ref={ref} />),
  SortArrow: forwardRef((props, ref) => <ArrowDownward {...props} ref={ref} />),
  ThirdStateCheck: forwardRef((props, ref) => <Remove {...props} ref={ref} />),
  ViewColumn: forwardRef((props, ref) => <ViewColumn {...props} ref={ref} />)
};

const columns = [
  {field: 'herd', title: 'Besättning',
    render: (rowData:any) => <Link to={`/herd/${rowData.herd['herd']}`}>{rowData.herd['herd']}</Link>
  },
  {field: 'name', title: 'Namn'},
  {field: 'certificate', title: 'Certifikat'},
  {field: 'number', title: 'Nummer',
    render: (rowData:any) => <Link to={`/individual/${rowData.number}`}>{rowData.number}</Link>
  },
  {field: 'sex', title: 'Kön'},
  {field: 'birth_date', title: 'Födelsedatum'},
  {field: 'death_date', title: 'Dödsdatum'},
  {field: 'death_note', title: 'Dödsanteckning'},
  {field: 'mother', title: 'Moder',
    render: (rowData:any) => <Link to={`/individual/${rowData.mother['number']}`}>{rowData.mother['name']}</Link>
  },
  {field: 'father', title: 'Fader',
    render: (rowData:any) => <Link to={`/individual/${rowData.father['number']}`}>{rowData.father['name']}</Link>
  },
  {field: 'color', title: 'Färg',
    render: (rowData:any) => rowData.color['name']
  },
  {field: 'color_note', title: 'Färganteckning'},
]

// Define styles for tab menu
const useStyles = makeStyles({
  breadcrumbs: {
    padding: "15px",
    paddingBottom: 0,
  },
  paper: {
    height: "calc(100% - 39px)", // remove breadcrumb height
  },
  breadcrumb: {
    textDecoration: "none",
  },
  spacer: {
    height: '39px',
  },
  table: {
    height: "calc(100% - 75px)",
    padding: "0 20px",
    overflowY: "scroll",
  },
});

/**
 * Provides genebanks management forms for granting and revoking herd
 * permissions, and managing herd animals.
 */
export function Genebanks() {
  const {genebanks} = useDataContext()
  const [genebank, setGenebank] = useState(undefined as Genebank | undefined)
  const [individuals, setIndividuals] = React.useState([] as Array<Individual>)
  const styles = useStyles();

  React.useEffect(() => {
    if (genebanks.length > 0 && !genebank) {
      selectGenebank(genebanks[0].id);
    }
  }, [genebanks]);

  const selectGenebank = (id: number) => {
    if (!genebanks) {
      return;
    }
    const targetGenebank = genebanks.find((g: Genebank) => g.id == id);
    if (!targetGenebank) {
      return;
    }
    setGenebank(targetGenebank);
    setIndividuals(targetGenebank.individuals);
  }

  return <>
    <Paper>
      {genebanks.length > 1 && genebanks.map((g: Genebank, i: number) => {
          return <Button  key={g.id}
                          variant='contained'
                          value={g.id}
                          color={genebank && genebank.id == g.id ? 'primary' : 'default'}
                          onClick={(e: any) => selectGenebank(e.currentTarget.value)}>{g.name}</Button>
        })
      }

      <div className={styles.table}>
        <MaterialTable
          icons={tableIcons}
          columns={columns}
          data={individuals}
          title="Alla individer"
        />
      </div>
    </Paper>
  </>
}
