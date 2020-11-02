/**
 * @file This file contains the FilterTable function. This function is a
 * wrapper around MaterialTable, with defaults for individual columns as well as
 * extra options for filtering.
 */
import React, {forwardRef} from 'react'
import { default as MaterialTable, Icons } from 'material-table'

import {AddBox, ArrowDownward, Check, ChevronLeft, ChevronRight, Clear,
    DeleteOutline, Edit, FilterList, FirstPage, LastPage, Remove, SaveAlt,
    Search, ViewColumn } from '@material-ui/icons'
import { CircularProgress, Checkbox,  makeStyles, FormControlLabel, TextField
        } from '@material-ui/core';
import { Autocomplete } from '@material-ui/lab';

import { asLocale, Individual, OptionType } from '@app/data_context_global';
import { IndividualView } from '@app/individual_view';
import { HerdView } from './herd_view'
import { useMessageContext } from '@app/message_context';

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
type Action = ((event: any, rowData: Individual | Individual[]) => {})

/**
 * Shows a table of individual information for the given list of `individuals`.
 * Optionally `filters` or `title` can be set to further customize the table.
 */
export function FilterTable({individuals, title = '', filters = [],
                             action = undefined, actionIcon = Edit}:
    {individuals: Individual[], title: string, filters: Filter[],
      action: Action | undefined, actionIcon: any}) {

  const { popup } = useMessageContext()
  const styles = useStyles();

  const defaultColumns = [
    {field: 'herd', title: 'Besättning', hidden: false,
      render: (rowData:any) =>
        <a className={styles.functionLink}
          onClick={() => popup(<HerdView id={rowData.herd['herd']} />, `/herd/${rowData.herd['herd']}`)}
          >
          {rowData.herd['herd']}
        </a>
    },
    {field: 'name', title: 'Namn', hidden: false},
    {field: 'certificate', title: 'Certifikat', hidden: false},
    {field: 'number', title: 'Nummer', hidden: false,
      render: (rowData:any) =>
        <a className={styles.functionLink}
          onClick={() => popup(<IndividualView id={rowData.number} />, `/individual/${rowData.number}`)}
          >
          {rowData.number}
        </a>
    },
    {field: 'sex', title: 'Kön', hidden: false},
    {field: 'birth_date', title: 'Födelsedatum', hidden: false,
      render: (rowData:any) => asLocale(rowData['birth_date'])
    },
    {field: 'death_date', title: 'Dödsdatum', hidden: false,
      render: (rowData:any) => asLocale(rowData['death_date'])
    },
    {field: 'death_note', title: 'Dödsanteckning', hidden: false},
    {field: 'children', title: 'Ungar', hidden: false},
    {field: 'mother', title: 'Moder', hidden: false,
      render: (rowData:any) =>
      <a className={styles.functionLink}
        onClick={() => popup(<IndividualView id={rowData.mother['number']} />, `/individual/${rowData.mother['number']}`)}
        >
        {rowData.mother['number']}
      </a>
    },
    {field: 'father', title: 'Fader', hidden: false,
      render: (rowData:any) =>
      <a className={styles.functionLink}
        onClick={() => popup(<IndividualView id={rowData.father['number']} />, `/individual/${rowData.father['number']}`)}
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
      for (let filter of currentFilters) {
        if (filter.active && !i[filter.field]) {
          return false;
        }
      }
      return true
    })
  }

  return <>
    <div>
      <Autocomplete
        multiple
        className={styles.columnLabel}
        options={columns.map((v: any) => {return {value: v.field, label: v.title}})}
        value={columns.filter((v: any) => !v.hidden).map((v: any) => {return {value: v.field, label: v.title}})}
        getOptionLabel={(option: OptionType) => option.label}
        getOptionSelected={(option: OptionType, value: OptionType) => option.value == value.value}
        renderInput={(params) => <TextField {...params} label='Kolumner' margin="normal" />}
        onChange={(event: any, newValues: OptionType[] | null) => {
          newValues && updateColumns(newValues)
        }}
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
              actions={action && [{
                icon: actionIcon,
                tooltip: 'Save User',
                onClick: action
              }]}
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
    </div>
  </>
}
