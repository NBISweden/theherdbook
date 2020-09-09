/**
 * @file This file contains the GenebankView function. This function displays
 * the genebank given as `genebank` in a material table where individuals and
 * columns can be customized.
 */
import React, {forwardRef} from 'react'


import { default as MaterialTable, Icons } from 'material-table'
import { Link } from 'react-router-dom'

import {AddBox, ArrowDownward, Check, ChevronLeft, ChevronRight, Clear,
    DeleteOutline, Edit, FilterList, FirstPage, LastPage, Remove, SaveAlt,
    Search, ViewColumn } from '@material-ui/icons'
import { Genebank, Individual } from '~data_context_global';
import { makeStyles } from '@material-ui/core';

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

// Define styles
const useStyles = makeStyles({
  table: {
    height: "100%",
    padding: "5px",
    overflowY: "scroll",
  },
});

/**
 * Shows genebank information, with a list of all herds belonging to that
 * genebank.
 */
export function GenebankView({genebank}: {genebank: Genebank}) {
  const styles = useStyles();
  const [individuals, setIndividuals] = React.useState([] as Array<Individual>)

  React.useEffect(() => {
    if (genebank) {
      setIndividuals(genebank.individuals)
    }
  }, [genebank])

  return <>
    <div className={styles.table}>
      <MaterialTable
        icons={tableIcons}
        columns={columns}
        data={individuals}
        title="Alla individer"
      />
    </div>
  </>
}
