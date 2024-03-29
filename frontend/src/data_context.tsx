import * as React from "react";

import { get } from "@app/communication";

import {
  Birth,
  Breeding,
  Color,
  DataContext,
  Genebank,
  NameID,
  LimitedBreeding,
} from "@app/data_context_global";
import { patch, post } from "./communication";
import { useMessageContext } from "./message_context";

/**
 * The data context holds genebank, herd, and individual data, as well as
 * funtions to request and modify the data.
 *
 * The data is arranged in `genebanks` (including `herds`), and `individuals`.
 */

/**
 * Exports the context variables and functions to be used by other components
 */
export function useDataContext(): DataContext {
  return React.useContext(DataContext);
}

export function WithDataContext(props: { children: React.ReactNode }) {
  const [genebanks, setGenebanks] = React.useState([] as Array<Genebank>);
  /**
   * The herd listener will save a herd id as soon as the user opens a herd view.
   * The herd change listener will increase every time an individual of that herd is updated, sold or added.
   * Herd view will fetch the herd's data every time the listener changes.
   * This way, changes will be visible in herd view immediately, no page reload needed.
   */
  const [herdListener, setHerdListener] = React.useState("");
  const [herdChangeListener, setHerdChangeListener] = React.useState(0);
  const [users, setUsers] = React.useState([] as Array<NameID>);
  const [colors, setColors] = React.useState(
    {} as { [genebank: string]: Color[] }
  );
  const { userMessage } = useMessageContext();

  async function fetchAndSet(
    url: string,
    set: Function,
    field: string | undefined = undefined
  ) {
    return await get(url).then(
      (data) => {
        if (!data) {
          return false;
        }
        set(field ? data[field] : data);
        return true;
      },
      (error) => {
        console.error(error);
        return false;
      }
    );
  }

  /**
   * Asynchronously loads data from `url`, and sets `field` in data to the
   * response data using the `set` function.
   *
   * @param url URL to fetch data from
   * @param field the field to set in the base data
   * @param set the setter function to update the data
   * @param index if index is set - the base data is assumed to be an array, and
   *     that the target field should be set as `data[0].field = <update>`
   */
  async function lazyLoad(
    url: string,
    field: string,
    set: Function,
    index: number | null = null
  ) {
    return await get(url).then(
      (data) => {
        if (!data) {
          return false;
        }
        set((base: any) => {
          let update;
          if (index == null) {
            // object update
            update = { ...base };
            update[field] = Object.keys(data).includes(field)
              ? data[field]
              : data;
          } else {
            // array update
            update = [...base];
            update[index] = { ...update[index] };
            update[index][field] = Object.keys(data).includes(field)
              ? data[field]
              : data;
          }
          return update;
        });
        return true;
      },
      (error) => {
        console.error(error);
        return false;
      }
    );
  }

  /**
   * Fetches all genebank names, id's and herd lists from the backend (that the
   * currently logged in user has access to). Returns `true` on success and
   * `false` otherwise.
   */
  async function getGenebanks() {
    return await get("/api/genebanks").then(
      (data) => {
        if (!data) {
          return false;
        }
        // note that individuals aren't loaded, and send a request to load them
        const genebankData = data["genebanks"].map((g: Genebank) => {
          g.individuals = [];
          return g;
        });
        setGenebanks(genebankData);
        genebankData.forEach((g: Genebank, i: number) => {
          lazyLoad(
            `/api/genebank/${g.id}/individuals`,
            "individuals",
            setGenebanks,
            i
          );
        });
        return true;
      },
      (error) => {
        console.error(error);
        return false;
      }
    );
  }

  /**
   * Fetches all users names, id's, validation status, and roles that the
   * currently logged in user has access to. Returns `true` on success and `false`
   * otherwise.
   */
  async function getUsers() {
    return fetchAndSet("/api/manage/users", setUsers, "users");
  }
  /**
   * Fetches all legal colors for all genebanks.
   */
  async function getColors() {
    return fetchAndSet("/api/colors", setColors);
  }

  /**
   * Loads data from the backend into the data context. Returns `true` if all
   * operations were successful and `false` otherwise.
   *
   * @param data either a list of strings including `genebanks`, `herds`, or
   *     `individuals`, the string `all` to load all data, or the string `none`
   *     to unload all data.
   */
  const loadData = React.useMemo(
    () =>
      async function loadData(data: string | Array<string>) {
        let updates: Array<Promise<boolean>> = [];
        if (data == "none") {
          setGenebanks([]);
        }
        if (data == "all" || data.includes("genebanks")) {
          updates.push(getGenebanks());
        }
        if (data == "all" || data.includes("users")) {
          updates.push(getUsers());
        }
        if (data == "all" || data.includes("colors")) {
          updates.push(getColors());
        }

        return await Promise.all(updates).then((statuses) => {
          return statuses.reduce((a, b) => a && b, true);
        });
      },
    []
  );

  React.useEffect(() => {
    loadData("all");
  }, []);

  return (
    <DataContext.Provider
      value={{
        genebanks,
        users,
        colors,
        herdChangeListener,
        herdListener,
        setHerdChangeListener,
        setHerdListener,
        setGenebanks,
        setUsers,
        loadData,
      }}
    >
      {props.children}
    </DataContext.Provider>
  );
}
