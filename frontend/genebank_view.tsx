/**
 * @file This file contains the GenebankView function. This function displays
 * the genebank given as `genebank` in a material table where individuals and
 * columns can be customized.
 */
import React, {forwardRef} from 'react'
import { default as MaterialTable, Icons } from 'material-table'
import { Link } from 'react-router-dom'
import Select from 'react-select'

import {AddBox, ArrowDownward, Check, ChevronLeft, ChevronRight, Clear,
    DeleteOutline, Edit, FilterList, FirstPage, LastPage, Remove, SaveAlt,
    Search, ViewColumn } from '@material-ui/icons'
import { Genebank, Individual } from '~data_context_global';
import { CircularProgress, makeStyles } from '@material-ui/core';

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

const defaultColumns = [
  {field: 'herd', title: 'Besättning', hidden: false,
    render: (rowData:any) => <Link to={`/herd/${rowData.herd['herd']}`}>{rowData.herd['herd']}</Link>
  },
  {field: 'name', title: 'Namn', hidden: false},
  {field: 'certificate', title: 'Certifikat', hidden: false},
  {field: 'number', title: 'Nummer', hidden: false,
    render: (rowData:any) => <Link to={`/individual/${rowData.number}`}>{rowData.number}</Link>
  },
  {field: 'sex', title: 'Kön', hidden: false},
  {field: 'birth_date', title: 'Födelsedatum', hidden: false},
  {field: 'death_date', title: 'Dödsdatum', hidden: false},
  {field: 'death_note', title: 'Dödsanteckning', hidden: false},
  {field: 'mother', title: 'Moder', hidden: false,
    render: (rowData:any) => <Link to={`/individual/${rowData.mother['number']}`}>{rowData.mother['name']}</Link>
  },
  {field: 'father', title: 'Fader', hidden: false,
    render: (rowData:any) => <Link to={`/individual/${rowData.father['number']}`}>{rowData.father['name']}</Link>
  },
  {field: 'color', title: 'Färg', hidden: false,
    render: (rowData:any) => rowData.color['name']
  },
  {field: 'color_note', title: 'Färganteckning', hidden: false},
]

// The material-table really doesn't like adding columns that were hidden at the
// beginning - so I start with everything visible, and then reset to this
// selection.
const defaultSelection = [
  {value: 'name'},
  {value: 'herd'},
  {value: 'number'},
  {value: 'sex'},
  {value: 'birth_date'},
  {value: 'color'},
]

// Define styles
const useStyles = makeStyles({
  table: {
    height: "100%",
    padding: "5px",
    overflowY: "scroll",
  },
  columnSelect: {
    zIndex: 15,
  },
  loading: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  }
});

/**
 * Shows genebank information, with a list of all herds belonging to that
 * genebank.
 */
export function GenebankView({genebank}: {genebank: Genebank}) {
  const styles = useStyles();
  const [individuals, setIndividuals] = React.useState(null as Array<Individual> | null)
  const [columns, setColumns] = React.useState(defaultColumns)

  React.useEffect(() => {
    if (genebank) {
      setIndividuals(genebank.individuals)
      // BUG: commented due to a material-table bug
      // TODO: fix default column selection, or replace material-table
      // updateColumns(defaultSelection);
    }
  }, [genebank])

  const updateColumns = (values: any[]) => {
    const newColumns = [...columns];
    const visibleColumns = values.map((v: any) => v.value);
    newColumns.forEach((c: any) => {
      if (visibleColumns.includes(c.field)) {
        c.hidden = false;
      } else {
        c.hidden = true;
      }
    })
    setColumns(newColumns)
  }

  return <>
    <div>
      Kolumner:
      <Select className={styles.columnSelect}
        isMulti
        options={columns.map((v: any) => {return {value: v.field, label: v.title}})}
        value={columns.filter((v: any) => !v.hidden).map((v: any) => {return {value: v.field, label: v.title}})}
        onChange={updateColumns}
        />
    </div>
    <div className={styles.table}>
      { individuals
        ? <MaterialTable
            icons={tableIcons}
            columns={columns}
            data={individuals}
            title="Alla individer"
          />
        : <>
          <div className={styles.loading}>
            <h2>Loading Individuals</h2>
            <CircularProgress />
          </div>
        </>
      }
    </div>
  </>
}
