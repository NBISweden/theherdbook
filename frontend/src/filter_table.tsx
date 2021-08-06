/**
 * @file This file contains the FilterTable function. This function is a
 * wrapper around MaterialTable, with defaults for individual columns as well as
 * extra options for filtering.
 */
import React from "react";
import { Edit } from "@material-ui/icons";
import {
  Button,
  CircularProgress,
  Checkbox,
  makeStyles,
  FormControlLabel,
  TextField,
  TableHead,
  TableRow,
  TableCell,
  TableSortLabel,
  TableContainer,
  Table,
  TablePagination,
  TableBody,
  SvgIcon,
} from "@material-ui/core";
import { Autocomplete } from "@material-ui/lab";

import {
  asLocale,
  Individual,
  inputVariant,
  OptionType,
} from "@app/data_context_global";
import { IndividualView } from "@app/individual_view";
import { HerdView } from "@app/herd_view";
import { useMessageContext } from "@app/message_context";
import { useUserContext } from "./user_context";
import { IndividualAdd } from "./individual_add";

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
    color: "blue",
    textDecoration: "underline",
    cursor: "pointer",
  },
  sorted: {
    border: 0,
    clip: "rect(0 0 0 0)",
    height: 1,
    margin: -1,
    overflow: "hidden",
    padding: 0,
    position: "absolute",
    top: 20,
    width: 1,
  },
  search: {
    float: "right",
  },
});

/**
 * Column definition with sorting information. `sortBy` is used to tell the
 * sorting function which sub-field to sort by if the column value is an object,
 * and `sortAs` is used to coerce the value to a new type.
 */
interface Column {
  field: keyof Individual;
  label: string;
  sortBy?: string;
  sortAs?: "number" | "numbers" | "date" | undefined;
  hidden?: boolean;
  numeric?: boolean;
  render?: Function;
}
type Order = "asc" | "desc";
type Filter = { field: keyof Individual; label: string; active?: boolean };
type Action = (event: any, rowData: Individual | Individual[]) => {};

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
 * @param a First individual
 * @param b Second individual
 * @param column Column definition of the table to be sorted
 * @param orderBy sub-field to order by for object values
 * @param order `asc` or `desc` for ascending or descending ordering
 */
function individualSort(
  a: Individual,
  b: Individual,
  column: Column,
  orderBy: keyof Individual,
  order: Order
) {
  {
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
        aVal = +aVal.replace(/[^0-9]/g, "");
        bVal = +bVal.replace(/[^0-9]/g, "");
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
}

/**
 * simplest possible search for now - filter everything that doesn't have an
 * active field that matches the search term.
 *
 * @param individual Individual to check for filtering
 * @param search search term to compare against
 * @param columns which columns to consider when filtering
 */
function searchFilter(
  individual: Individual,
  search: string,
  columns: Column[]
) {
  let searchResult = false;
  const searchRegExp = new RegExp(search, "i");
  for (let column of columns) {
    if (!individual[column.field]) {
      continue;
    }
    const value = column.sortBy
      ? `${individual[column.field][column.sortBy]}`
      : `${individual[column.field]}`;
    if (value.match(searchRegExp)) {
      searchResult = true;
      break;
    }
  }
  return searchResult;
}

/**
 * Shows a table of individual information for the given list of `individuals`.
 * Optionally `filters` or `action` (along with `actionIcon` and `actionLabel`)
 * can be set to further customize the table.
 */
export function FilterTable({
  id,
  individuals,
  title = "",
  filters = [],
  action = undefined,
  actionIcon = Edit,
  actionLabel = "Redigera",
}: {
  id?: string | undefined;
  individuals: Individual[];
  title: string;
  filters: Filter[];
  action: Action | undefined;
  actionIcon: any;
  actionLabel: string;
}) {
  const { popup } = useMessageContext();
  const { user } = useUserContext();
  const styles = useStyles();
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(25);
  const [order, setOrder] = React.useState("desc" as Order);
  const [orderBy, setOrderBy] = React.useState(
    "birth_date" as keyof Individual
  );
  const [search, setSearch] = React.useState("" as string);
  const [currentFilters, setFilters] = React.useState(filters);

  const allColumns: Column[] = [
    {
      field: "herd",
      label: "Besättning",
      sortAs: "number",
      sortBy: "herd",
      action: (rowData: any) =>
        popup(
          <HerdView id={rowData.herd["herd"]} />,
          `/herd/${rowData.herd["herd"]}`,
          true
        ),
      render: (rowData: any) => (
        <a
          className={styles.functionLink}
          onClick={() =>
            popup(
              <HerdView id={rowData.herd["herd"]} />,
              `/herd/${rowData.herd["herd"]}`,
              true
            )
          }
        >
          {rowData.herd["herd"]}
        </a>
      ),
    },
    { field: "name", label: "Namn" },
    { field: "certificate", label: "Certifikat", hidden: true },
    {
      field: "number",
      label: "Nummer",
      sortAs: "numbers",
      render: (rowData: any) => (
        <a
          className={styles.functionLink}
          onClick={() =>
            popup(
              <IndividualView id={rowData.number} />,
              `/individual/${rowData.number}`
            )
          }
        >
          {rowData.number}
        </a>
      ),
    },
    { field: "sex", label: "Kön" },
    {
      field: "birth_date",
      label: "Födelsedatum",
      sortAs: "date",
      render: (rowData: any) => asLocale(rowData["birth_date"]),
    },
    {
      field: "death_date",
      label: "Dödsdatum",
      hidden: true,
      sortAs: "date",
      render: (rowData: any) => asLocale(rowData["death_date"]),
    },
    { field: "death_note", label: "Dödsanteckning", hidden: true },
    { field: "children", label: "Ungar", numeric: true },
    {
      field: "mother",
      label: "Moder",
      sortBy: "number",
      sortAs: "numbers",
      render: (rowData: any) => (
        <a
          className={styles.functionLink}
          onClick={() =>
            popup(
              <IndividualView id={rowData.mother["number"]} />,
              `/individual/${rowData.mother["number"]}`
            )
          }
        >
          {rowData.mother["number"]}
        </a>
      ),
    },
    {
      field: "father",
      label: "Fader",
      sortBy: "number",
      sortAs: "numbers",
      render: (rowData: any) => (
        <a
          className={styles.functionLink}
          onClick={() =>
            popup(
              <IndividualView id={rowData.father["number"]} />,
              `/individual/${rowData.father["number"]}`
            )
          }
        >
          {rowData.father["number"]}
        </a>
      ),
    },
    {
      field: "color",
      label: "Färg",
      sortBy: "name",
      render: (rowData: any) => rowData.color["name"],
    },
    { field: "color_note", label: "Färganteckning", hidden: true },
  ];

  const [columns, setColumns] = React.useState(allColumns);
  const visibleColumns = React.useMemo(() => {
    return columns.filter((c) => !c.hidden);
  }, [columns]);

  const updateColumns = (values: any[]) => {
    const newColumns = [...columns];
    const visibleColumns = values.map((v: any) => v.value);
    newColumns.forEach((c: any) => {
      if (visibleColumns.includes(c.field)) {
        c.hidden = false;
      } else {
        c.hidden = true;
      }
    });
    setColumns(newColumns);
  };

  /**
   * Memoized list holding all individuals that pass the current filter(s).
   */
  const filteredIndividuals: Individual[] = React.useMemo(() => {
    if (!individuals) {
      return [];
    }
    return individuals.filter((i: Individual) => {
      for (let filter of currentFilters) {
        if (!filter.active && !i[filter.field]) {
          return false;
        }
      }

      if (search) {
        return searchFilter(i, search, visibleColumns);
      }

      return true;
    });
  }, [currentFilters, individuals, search]);

  /**
   * Memoized list of individuals sorted by the individualSort function
   */
  const sortedIndividuals = React.useMemo(() => {
    // store column for reference
    const column = allColumns.find((c) => c.field == orderBy);
    if (column) {
      return filteredIndividuals.sort((a, b) =>
        individualSort(a, b, column, orderBy, order)
      );
    }
    return [];
  }, [filteredIndividuals, orderBy, order]);

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
    property: keyof Individual
  ) => {
    const isAsc = orderBy === property && order === "asc";
    setOrder(isAsc ? "desc" : "asc");
    setOrderBy(property);
  };

  const createSortHandler =
    (property: keyof Individual) => (event: React.MouseEvent<unknown>) => {
      handleRequestSort(event, property);
    };

  return (
    <>
      <div>
        <Autocomplete
          multiple
          className={styles.columnLabel}
          options={columns.map((v: any) => {
            return { value: v.field, label: v.label };
          })}
          value={columns
            .filter((v: any) => !v.hidden)
            .map((v: any) => {
              return { value: v.field, label: v.label };
            })}
          getOptionLabel={(option: OptionType) => option.label}
          getOptionSelected={(option: OptionType, value: OptionType) =>
            option.value == value.value
          }
          renderInput={(params) => (
            <TextField
              {...params}
              variant={inputVariant}
              margin="normal"
            />
          )}
          onChange={(event: any, newValues: OptionType[] | null) => {
            newValues && updateColumns(newValues);
          }}
        />
      </div>
      <div className={styles.table}>
        {individuals ? (
          <>
            {currentFilters.map((filter) => (
              <FormControlLabel
                key={filter.field}
                control={
                  <Checkbox
                    name={filter.field}
                    checked={filter.active ?? false}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                      filter.active = e.target.checked;
                      setFilters([...currentFilters]);
                    }}
                  />
                }
                label={filter.label}
              />
            ))}

            <TextField
              className={styles.search}
              label="Sök"
              variant={inputVariant}
              onChange={(e) => setSearch(e.currentTarget.value)}
            />
            <TableContainer>
              <Table
                aria-labelledby="tableTitle"
                size={"medium"}
                aria-label="enhanced table"
              >
                <TableHead>
                  <TableRow>
                    {action && <TableCell>{actionLabel}</TableCell>}
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
                            <span className={styles.sorted}>
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
                  {sortedIndividuals
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((row, index) => {
                      return (
                        <TableRow key={row.number} hover tabIndex={-1}>
                          {action && (
                            <TableCell
                              className={styles.functionLink}
                              onClick={(event) => action && action(event, row)}
                            >
                              <SvgIcon component={actionIcon} />
                            </TableCell>
                          )}
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
            {id && user?.canEdit(id) && (
              <Button
                variant="contained"
                color="primary"
                onClick={() => popup(<IndividualAdd herdId={id} />)}
              >
                Lägg till
              </Button>
            )}
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={filteredIndividuals.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onChangePage={handleChangePage}
              onChangeRowsPerPage={handleChangeRowsPerPage}
            />
          </>
        ) : (
          <>
            <div className={styles.loading}>
              <h2>Loading Individuals</h2>
              <CircularProgress />
            </div>
          </>
        )}
      </div>
    </>
  );
}
