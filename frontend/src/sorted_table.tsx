/**
 * @file This file contains the SortedTable function. This function is a
 * wrapper around MaterialTable, where you can sort the table by the column
 * values.
 */

import React from "react";
import {
  CircularProgress,
  TableHead,
  TableRow,
  TableCell,
  TableSortLabel,
  TableContainer,
  Table,
  TablePagination,
  TableBody,
  Button,
} from "@material-ui/core";

/**
 * Column definition with sorting information. `sortBy` is used to tell the
 * sorting function which sub-field to sort by if the column value is an object,
 * and `sortAs` is used to coerce the value to a new type.
 */
export interface Column {
  field: any;
  label: string;
  sortBy?: string;
  sortAs?: "number" | "numbers" | "date" | undefined;
  hidden?: boolean;
  numeric?: boolean;
  render?: Function;
}
type Order = "asc" | "desc";

/**
 * Sorts a list of individuals by the `orderBy` field and `order` direction, as
 * well as the `column` definition information `sortBy` and `sortAs`.
 * When the value of a field is an object, `sortBy` is used to select which
 * subfield to use for sorting. `sortAs` can be `number`, `numbers` or `date`
 * to force a column to be sorted as a particular type.
 * - `date` fields will be cast as dates using `new Date(<value)`
 * - `number` fields will be cast as numbers by removing all non-numerical
 *   characters. ex. `G111-222` -> `111222`
 * - `numbers` fields are cast as numbers, but using the first set of numbers
 *   as the integer part, and the remaning as decimals.
 *   ex. `G111-222-333` -> `111.222333`.
 *
 * @param a First object
 * @param b Second object
 * @param column Column definition of the table to be sorted
 * @param orderBy sub-field to order by for object values
 * @param order `asc` or `desc` for ascending or descending ordering
 */
function columnSort(
  a: any,
  b: any,
  column: Column,
  orderBy: string,
  order: Order
) {
  // check direction
  const direction = order == "asc" ? 1 : -1;

  // handle null and undefined objects as "directionless" (they sort last)
  // regardless of ordering
  if (a == undefined || b == undefined) {
    // sort undefined as less than defined
    return a == b ? 0 : b == undefined ? -1 : 1;
  }
  let aVal = a[orderBy];
  let bVal = b[orderBy];

  // handle null or undefined fields
  if (aVal == undefined || bVal == undefined) {
    return aVal == bVal ? 0 : bVal == undefined ? -1 : 1;
  }

  // check if we need to sort some special way
  if (column?.sortBy) {
    if (Object.keys(aVal).includes(column.sortBy)) {
      aVal = aVal[column?.sortBy];
    }
    if (Object.keys(bVal).includes(column.sortBy)) {
      bVal = bVal[column?.sortBy];
    }
    // handle null or undefined fields again
    if (aVal == undefined || bVal == undefined) {
      return aVal == bVal ? 0 : bVal == undefined ? -1 : 1;
    }
  }

  if (column?.sortAs) {
    // concatenate all numbers in the string
    if (column.sortAs == "number") {
      aVal = isNaN(Number(aVal)) ? +aVal.replace(/[^0-9]/g, "") : Number(aVal);
      bVal = isNaN(Number(bVal)) ? +bVal.replace(/[^0-9]/g, "") : Number(bVal);
    }
    // use first number as integer, all others as decimals
    else if (column.sortAs == "numbers") {
      const f = (n: string) => {
        const m = n.match(/([0-9]+)/g);
        return m ? +`${m[0]}.${m.slice(1).join("")}` : 0;
      };
      aVal = f(aVal);
      bVal = f(bVal);
    } else if (column.sortAs == "date") {
      aVal = aVal ? new Date(aVal) : 0;
      bVal = bVal ? new Date(bVal) : 0;
    }
  }

  if (aVal > bVal) {
    return direction;
  }
  if (aVal < bVal) {
    return -direction;
  }

  return 0;
}

/**
 * Shows a table of individual information for the given list of `individuals`.
 * Optionally `filters` or `action` (along with `actionIcon` and `actionLabel`)
 * can be set to further customize the table.
 *
 * additional recognized props are:
 *    addButton: Function,
 *    rowsPerPage: number
 *    className: any
 *    style: any
 */
export function SortedTable({
  columns,
  data,
  ...props
}: { columns: Column[]; data: any[] } & Record<string, any>) {
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(props.rowsPerPage ?? 25);
  const [selected, setSelected] = React.useState(null as number | null);
  const [order, setOrder] = React.useState("desc" as Order);
  const [orderBy, setOrderBy] = React.useState(undefined as any);

  const tableData = React.useMemo(() => {
    return data.map((row, i) => {
      return { tableId: i, ...row };
    });
  }, [data]);
  const visibleColumns = React.useMemo(() => {
    return columns.filter((c) => !c.hidden);
  }, [columns]);

  /**
   * Memoized list of data sorted by the columnSort function
   */
  const sortedData = React.useMemo(() => {
    // store column for reference
    const column = columns.find((c) => c.field == orderBy);
    if (column) {
      return tableData.sort((a, b) => columnSort(a, b, column, orderBy, order));
    }
    // return the unsorted data if the columnn isn't valid
    return tableData;
  }, [tableData, orderBy, order]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleRequestSort = (
    event: React.MouseEvent<unknown>,
    property: any
  ) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const createSortHandler = (property: any) => (
    event: React.MouseEvent<unknown>
  ) => {
    handleRequestSort(event, property);
  };

  return (
    <>
      <div
        className={props.className ?? "table"}
        style={props.style ?? props.style}
      >
        {data ? (
          <>
            <TableContainer>
              <Table
                aria-labelledby="tableTitle"
                size={"medium"}
                aria-label="enhanced table"
              >
                <TableHead>
                  <TableRow>
                    {visibleColumns.map((column) => (
                      <TableCell
                        key={column.field}
                        align={column.numeric ? "right" : "left"}
                        padding={"default"}
                        sortDirection={orderBy === column.field ? order : false}
                      >
                        <TableSortLabel
                          active={orderBy === column.field}
                          direction={orderBy === column.field ? order : "asc"}
                          onClick={createSortHandler(column.field)}
                        >
                          {column.label}
                          {orderBy === column.field ? (
                            <span className="sorted">
                              {order === "desc"
                                ? "sorted descending"
                                : "sorted ascending"}
                            </span>
                          ) : null}
                        </TableSortLabel>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedData
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((row, index) => {
                      return (
                        <TableRow
                          key={row.tableId}
                          hover
                          selected={selected == row.tableId}
                          onClick={
                            props.onClick
                              ? () => {
                                  if (selected == row.tableId) {
                                    props.onClick(null);
                                    setSelected(null);
                                  } else {
                                    props.onClick(row);
                                    setSelected(row.tableId);
                                  }
                                }
                              : () => {}
                          }
                          tabIndex={-1}
                        >
                          {visibleColumns.map((column) => {
                            return (
                              <TableCell
                                key={column.field}
                                align={column.numeric ? "right" : "left"}
                              >
                                {column.render
                                  ? column.render(row)
                                  : row[column.field]}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </TableContainer>
            {props.addButton && (
              <Button
                className="bottomButton"
                variant="contained"
                color="primary"
                onClick={props.addButton}
              >
                Lägg till
              </Button>
            )}
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={data.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onChangePage={handleChangePage}
              onChangeRowsPerPage={handleChangeRowsPerPage}
            />
          </>
        ) : (
          <>
            <div className="loading">
              <h2>Laddar</h2>
              <CircularProgress />
            </div>
          </>
        )}
      </div>
    </>
  );
}
