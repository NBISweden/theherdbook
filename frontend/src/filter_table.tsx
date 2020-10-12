/**
 * @file This file contains the FilterTable function. This function is a
 * wrapper around MaterialTable, with defaults for individual columns as well as
 * extra options for filtering.
 */
import React, {forwardRef} from 'react'
import { default as MaterialTable, Icons } from 'material-table'
import { Link } from 'react-router-dom'
import Select from 'react-select'

import {AddBox, ArrowDownward, Check, ChevronLeft, ChevronRight, Clear,
    DeleteOutline, Edit, FilterList, FirstPage, LastPage, Remove, SaveAlt,
    Search, ViewColumn } from '@material-ui/icons'
import { Button, CircularProgress, Checkbox, Dialog, DialogActions,
         DialogContent, makeStyles, FormControlLabel,
       } from '@material-ui/core';

import { Individual } from '@app/data_context_global';
import { IndividualView } from '@app/individual_view';
import { HerdView } from './herd_view'

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
  columnLabel: {
    paddingRight: "30px",
  },
  columnSelect: {
    zIndex: 15,
  },
  loading: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  functionLink: {
    color: 'blue',
    textDecoration: 'underline',
    cursor: 'pointer',
  }
});

type Filter = {field: keyof(Individual), label: string, active?: boolean}

/**
 * Shows a table of individual information for the given list of `individuals`.
 * Optionally `filters` or `title` can be set to further customize the table.
 */
export function FilterTable({individuals, title = '', filters = []}:
    {individuals: Individual[], title: string, filters: Filter[]}) {

  const [showDialog, setShowDialog] = React.useState(false)
  const [dialogTarget, setDialogTarget] = React.useState(undefined as {type: string, id: string} | undefined)
  const styles = useStyles();

  const open = (type: string, id: string) => {
    setDialogTarget({type: type, id: id})
    setShowDialog(true)
  }

  const defaultColumns = [
    {field: 'herd', title: 'Besättning', hidden: false,
      render: (rowData:any) =>
        <a className={styles.functionLink}
          onClick={() => open('herd', rowData.herd['herd'])}
          >
          {rowData.herd['herd']}
        </a>
    },
    {field: 'name', title: 'Namn', hidden: false},
    {field: 'certificate', title: 'Certifikat', hidden: false},
    {field: 'number', title: 'Nummer', hidden: false,
      render: (rowData:any) =>
        <a className={styles.functionLink}
          onClick={() => open('individual', rowData.number)}
          >
          {rowData.number}
        </a>
    },
    {field: 'sex', title: 'Kön', hidden: false},
    {field: 'birth_date', title: 'Födelsedatum', hidden: false},
    {field: 'death_date', title: 'Dödsdatum', hidden: false},
    {field: 'death_note', title: 'Dödsanteckning', hidden: false},
    {field: 'mother', title: 'Moder', hidden: false,
      render: (rowData:any) =>
      <a className={styles.functionLink}
        onClick={() => open('individual', rowData.mother['number'])}
        >
        {rowData.mother['number']}
      </a>
    },
    {field: 'father', title: 'Fader', hidden: false,
      render: (rowData:any) =>
      <a className={styles.functionLink}
        onClick={() => open('individual', rowData.father['number'])}
        >
        {rowData.father['number']}
      </a>
    },
    {field: 'color', title: 'Färg', hidden: false,
      render: (rowData:any) => rowData.color['name']
    },
    {field: 'color_note', title: 'Färganteckning', hidden: false},
  ]

  const [columns, setColumns] = React.useState(defaultColumns)
  const [currentFilters, setFilters] = React.useState(filters)

  const closeDialog = () => {
    setShowDialog(false)
  }

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

  const filteredIndividuals = () => {
    if (!individuals) {
      return []
    }
    return individuals.filter((i: Individual) => {
      for (let f = 0; f < currentFilters.length; f++) {
        if (currentFilters[f].active && !i[currentFilters[f].field]) {
          return false;
        }
      }
      return true
    })
  }

  return <>
    <div>

      <FormControlLabel
        className={styles.columnLabel}
        label="Kolumner:"
        labelPlacement="start"
        control={
          <Select className={styles.columnSelect}
            isMulti
            options={columns.map((v: any) => {return {value: v.field, label: v.title}})}
            value={columns.filter((v: any) => !v.hidden).map((v: any) => {return {value: v.field, label: v.title}})}
            onChange={updateColumns}
            />
        }
      />
    </div>
    <div className={styles.table}>
      { individuals
        ? <>
            {currentFilters.map(filter =>
              <FormControlLabel key={filter.field}
                control={<Checkbox
                          name={filter.field}
                          checked={filter.active}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                            filter.active = e.target.checked
                            setFilters([...currentFilters])
                          }}
                          />}
                label={filter.label}
              />
            )}
            <MaterialTable
              icons={tableIcons}
              columns={columns}
              data={filteredIndividuals()}
              title={title}
              options={{
                tableLayout: 'fixed'
              }}
            />
          </>
        : <>
          <div className={styles.loading}>
            <h2>Loading Individuals</h2>
            <CircularProgress />
          </div>
        </>
      }
      <Dialog
        open={showDialog}
        keepMounted
        maxWidth={'xl'}
        onClose={closeDialog}
      >
        <DialogContent>
          {dialogTarget?.type == 'individual' && <IndividualView id={dialogTarget?.id} />}
          {dialogTarget?.type == 'herd' && <HerdView id={dialogTarget?.id} />}
        </DialogContent>
        <DialogActions>
          <Link to={`/${dialogTarget?.type}/${dialogTarget?.id}`} target='_blank'>
            <Button color="primary">
              Öppna i eget fönster
            </Button>
          </Link>
          <Button onClick={closeDialog} color="primary">
            Stäng
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  </>
}
