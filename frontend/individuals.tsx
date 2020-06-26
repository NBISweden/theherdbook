/**
 * @file This file contains the Individuals function. This function fetches and
 *       displays a list of all individuals that the current user has access to.
 */
import React from 'react'
import { forwardRef } from 'react';
import { default as MaterialTable, Icons } from 'material-table'
import { Link } from 'react-router-dom'

import AddBox from '@material-ui/icons/AddBox';
import ArrowDownward from '@material-ui/icons/ArrowDownward';
import Check from '@material-ui/icons/Check';
import ChevronLeft from '@material-ui/icons/ChevronLeft';
import ChevronRight from '@material-ui/icons/ChevronRight';
import Clear from '@material-ui/icons/Clear';
import DeleteOutline from '@material-ui/icons/DeleteOutline';
import Edit from '@material-ui/icons/Edit';
import FilterList from '@material-ui/icons/FilterList';
import FirstPage from '@material-ui/icons/FirstPage';
import LastPage from '@material-ui/icons/LastPage';
import Remove from '@material-ui/icons/Remove';
import SaveAlt from '@material-ui/icons/SaveAlt';
import Search from '@material-ui/icons/Search';
import ViewColumn from '@material-ui/icons/ViewColumn';

import { makeStyles } from '@material-ui/core/styles';
import { useDataContext } from './data_context'
import { Individual } from '~data_context_global';

// Define styles for tab menu
const useStyles = makeStyles({
  table: {
    height: "calc(100% - 75px)",
    padding: "0 20px",
    overflowY: "scroll",
  },
});

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
    render: (rowData:any) => <Link to={`/herd/${rowData.herd['id']}`}>{rowData.herd['herd']}</Link>
  },
  {field: 'name', title: 'Namn'},
  {field: 'certificate', title: 'Certifikat'},
  {field: 'number', title: 'Nummer'},
  {field: 'sex', title: 'Kön'},
  {field: 'birth_date', title: 'Födelsedatum'},
  {field: 'death_date', title: 'Dödsdatum'},
  {field: 'death_note', title: 'Dödsanteckning'},
  {field: 'mother', title: 'Moder',
    render: (rowData:any) => <Link to={`/individual/${rowData.mother['id']}`}>{rowData.mother['name']}</Link>
  },
  {field: 'father', title: 'Fader',
    render: (rowData:any) => <Link to={`/individual/${rowData.father['id']}`}>{rowData.father['name']}</Link>
  },
  {field: 'color', title: 'Färg',
    render: (rowData:any) => rowData.color['name']
  },
  {field: 'color_note', title: 'Färganteckning'},
]

/**
 * Shows a list of all genebanks, with links to the individual genebanks.
 */
export function IndividualsTable({id}: {field: number}) {
  const [individuals, setIndividuals] = React.useState([] as Array<Individual>)
  const {genebanks} = useDataContext()
  const classes = useStyles();

  React.useEffect(() => {
    const genebank = genebanks.find(g => g.id == id)
    if (genebank) {
      setIndividuals(genebank.individuals)
    }
  }, [genebanks])

  return <>
    <div className={classes.table}>
      <MaterialTable
        icons={tableIcons}
        columns={columns}
        data={individuals}
        title="Alla individer"
      />
    </div>
  </>
}
