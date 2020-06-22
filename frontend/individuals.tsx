/**
 * @file This file contains the Individuals function. This function fetches and
 *       displays a list of all individuals that the current user has access to.
 */
import React from 'react'
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableHead from '@material-ui/core/TableHead';
import TablePagination from '@material-ui/core/TablePagination';
import TableRow from '@material-ui/core/TableRow';
import { makeStyles } from '@material-ui/core/styles';

import {useDataContext} from './data_context'
import { Individual } from '~data_context_global';

interface Column {
  id: 'herd' | 'name' | 'certificate' | 'number' | 'sex' | 'birthDate' | 'mother'
    | 'father' | 'color' | 'colorNote'
  label: string
  minWidth?: number
  align?: 'right'
  format?: (value: number) => string
}

const columns: Column[] = [
  {id: 'herd', label: 'Besättning'},
  {id: 'name', label: 'Namn'},
  {id: 'certificate', label: 'Certifikat'},
  {id: 'number', label: 'Nummer'},
  {id: 'sex', label: 'Kön'},
  {id: 'birthDate', label: 'Födelsedatum'},
  {id: 'mother', label: 'Moder'},
  {id: 'father', label: 'Fader'},
  {id: 'color', label: 'Färg'},
  {id: 'colorNote', label: 'Färganteckning'},
]

// Define styles for tab menu
const useStyles = makeStyles({
  table: {
    height: "calc(100% - 125px)",
    padding: "0 20px",
    overflowY: "scroll",
  },
});

/**
 * Shows a list of all genebanks, with links to the individual genebanks.
 */
export function IndividualsTable({id}: {id: string | null}) {
  const [individuals, setIndividuals] = React.useState([] as Array<Individual>)
  const {genebanks} = useDataContext()
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);
  const classes = useStyles();

  React.useEffect(() => {
    if (id != null) {
      let genebank = genebanks.filter(g => g.id == +id)
      if (genebank) {
        setIndividuals(genebank[0].individuals)
      }
    }
  }, [genebanks])

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  return <>
    <TableContainer className={classes.table}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            {columns.map((column) => (
              <TableCell
                key={column.id}
                align={column.align}
                style={{ minWidth: column.minWidth }}
              >
                {column.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {individuals.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row) => {
            return (
              <TableRow hover role="checkbox" tabIndex={-1} key={row.id}>
                {columns.map((column) => {
                  const value = row[column.id];
                  return (
                    <TableCell key={column.id} align={column.align}>
                      {column.format && typeof value === 'number' ? column.format(value) : value}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
    <TablePagination
      rowsPerPageOptions={[10, 25, 100]}
      component="div"
      count={individuals.length}
      rowsPerPage={rowsPerPage}
      page={page}
      onChangePage={handleChangePage}
      onChangeRowsPerPage={handleChangeRowsPerPage}
    />
  </>
}
