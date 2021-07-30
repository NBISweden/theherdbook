/**
 * @file This file contains the BreedingList function. This function fetches
 *       breeding information for a given herd, and displays a list and edit
 *       form to handle breedings.
 */
import React from "react";
import { makeStyles } from "@material-ui/core/styles";

import { get } from "@app/communication";
import { useMessageContext } from "@app/message_context";
import { useDataContext } from "./data_context";
import { SortedTable, Column } from "./sorted_table";
import { Typography } from "@material-ui/core";
import { BreedingForm } from "./breeding_form";

const useStyles = makeStyles({
  breeding: {
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  table: {
    padding: "10px 0",
    margin: 0,
    transition: "width .5s",
  },
  form: {
    padding: "10px 0",
    margin: 0,
    border: "1px solid lightgrey",
    borderRadius: "3px",
    overflowX: "hidden",
    transition: "width .5s",
  },
  loading: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    fontSize: "1.2em",
  },
});

export interface Breeding {
  [key: string]: any;
  id?: number;
  breed_date: string | null;
  breed_notes: string;
  father: string;
  mother: string;
  birth_date: string | null;
  birth_notes: string;
  litter_size: number | null;
}

/**
 * The BreedingList function. This function fetches breeding information for a
 * given herd, and displays a list and edit form to handle breedings.
 */
export function BreedingList({ id }: { id: string | undefined }) {
  const [breedingEvents, setBreedingEvents] = React.useState([] as Breeding[]);
  const [active, setActive] = React.useState(null as any);
  const [breedingsChanged, setBreedingsChanged] = React.useState(true);
  const { userMessage } = useMessageContext();
  const { genebanks } = useDataContext();
  const style = useStyles();

  // Parent information from the genebank
  const parents = React.useMemo(() => {
    const parentNumbers = breedingEvents.flatMap((b) => [b.mother, b.father]);
    return genebanks.flatMap((genebank) => {
      return genebank.individuals.filter((i) =>
        parentNumbers.includes(i.number)
      );
    });
  }, [genebanks, breedingEvents]);

  const columns: Column[] = [
    {
      field: "breed_date",
      label: "Parningsdatum",
      sortAs: "date",
      hidden: false,
    },
    { field: "breed_notes", label: "Parningsanteckningar", hidden: true },
    { field: "mother", label: "Moder", sortAs: "numbers", hidden: false },
    { field: "father", label: "Fader", sortAs: "numbers", hidden: false },
    {
      field: "birth_date",
      sortAs: "date",
      label: "Födelsedatum",
      hidden: false,
    },
    { field: "birth_notes", label: "Födselanteckningar", hidden: true },
    {
      field: "litter_size",
      sortAs: "number",
      label: "Antal ungar",
      hidden: false,
      numeric: true,
    },
  ];

  React.useEffect(() => {
    if (id && breedingsChanged) {
      get(`/api/breeding/${id}`)
        .then(
          (data: { breedings: Breeding[] }) => {
            data && setBreedingEvents(data.breedings);
          },
          (error) => {
            console.error(error);
            userMessage(error, "error");
          }
        )
        .then(() => setBreedingsChanged(false));
    }
  }, [id, breedingsChanged]);

  const handleBreedingsChanged = () => {
    setBreedingsChanged(true);
  };

  const handleActive = (breeding: Breeding) => {
    setActive(breeding);
  };

  return (
    <>
      <Typography variant="h5">Parningstillfällen</Typography>
      <div className={style.breeding}>
        <SortedTable
          columns={columns}
          data={breedingEvents}
          addButton={() => {
            setActive("new");
          }}
          className={style.table}
          onClick={(row: any[]) => {
            setActive(row);
          }}
          rowsPerPage={10}
          style={{ width: active ? "60%" : "calc(100% - 2px)" }}
        />
        <div className={style.form} style={{ width: active ? "40%" : 0 }}>
          <BreedingForm
            data={active}
            herdId={id}
            handleBreedingsChanged={handleBreedingsChanged}
            handleActive={handleActive}
          />
        </div>
      </div>
    </>
  );
}
