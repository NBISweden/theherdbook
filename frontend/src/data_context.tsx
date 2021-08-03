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

  /**
   * Function that can be used to create a new breeding event
   **/
  const createBreeding = async (
    breedingData: LimitedBreeding
  ): Promise<any> => {
    const breedingEvent: {
      status: string;
      message?: string;
      breeding_id?: number;
    } = await post("/api/breeding", breedingData);

    if (breedingEvent.status == "success") {
      return breedingEvent;
    }

    const translate: Map<string, string> = new Map([
      ["Not logged in", "Du är inte inloggad. Logga in och försök igen"],
      [
        "Unknown mother",
        "Okänd mor, modern måste vara en aktiv individ i databasen",
      ],
      [
        "Unknown father",
        "Okänd far, fadern måste vara en aktiv individ i databasen",
      ],
      [
        "Unknown mother, Unknown father",
        "Okända föräldrar. Både modern och fadern måste vara aktiva individer i databasen.",
      ],
      ["Forbidden", "Du har inte rätt behörighet."],
    ]);

    if (
      breedingEvent.status == "error" &&
      !!breedingEvent.message &&
      translate.has(breedingEvent.message)
    ) {
      userMessage(translate.get(breedingEvent.message), "error");
      return;
    }

    userMessage(
      "Okänt fel - något gick fel på grund av tekniska problem. Kontakta en administratör.",
      "error"
    );
    return;
  };

  /**
   * Function to create a birth inside an existing breeding event
   * **/
  const createBirth = async (birthData: Birth) => {
    const birthCreationResponse: {
      status: "success" | "error";
      message?: string;
    } = await post("/api/birth", birthData);

    if (birthCreationResponse.status === "success") {
      return birthCreationResponse;
    }

    const translate: Map<string, string> = new Map([
      ["Not logged in", "Du är inte inloggad. Logga in och försök igen."],
      ["Forbidden", "Du har inte behörighet att lägga till födselinformation."],
    ]);

    if (
      birthCreationResponse.status === "error" &&
      !!birthCreationResponse.message &&
      translate.has(birthCreationResponse.message)
    ) {
      userMessage(translate.get(birthCreationResponse.message), "error");
      return;
    }

    userMessage(
      "Okänt fel - något gick fel på grund av tekniska problem. Kontakta en administratör.",
      "error"
    );
    return;
  };

  /**
   * Function to update a breeding event. You can update all the fields in a breeding object.
   * This way, it can also be used to add birth information to an existing breeding.
   *  **/
  const updateBreeding = async (breeding: Breeding) => {
    const breedingUpdateResponse = await patch("/api/breeding", breeding);

    if (breedingUpdateResponse.status === "success") {
      return breedingUpdateResponse;
    }

    const translate: Map<string, string> = new Map([
      ["Not logged in", "Du är inte inloggad. Logga in och försök igen"],
      [
        "Unknown mother",
        "Okänd mor, modern måste vara en aktiv individ i databasen",
      ],
      [
        "Unknown father",
        "Okänd far, fadern måste vara en aktiv individ i databasen",
      ],
      [
        "Unknown mother, Unknown father",
        "Okända föräldrar. Både modern och fadern måste vara aktiva individer i databasen.",
      ],
      ["Forbidden", "Du har inte behörighet att skapa parningstillfället."],
    ]);

    if (
      breedingUpdateResponse.status == "error" &&
      !!breedingUpdateResponse.message &&
      translate.has(breedingUpdateResponse.message)
    ) {
      userMessage(translate.get(breedingUpdateResponse.message), "error");
      return;
    }

    userMessage(
      "Okänt fel - något gick fel på grund av tekniska problem. Kontakta en administratör.",
      "error"
    );
    return;
  };

  /**
   * Looks for a breeding in the database that matches the user's input about a breeding.
   * @param herdId id of the herd the user wants to add a breeding to
   * @param breedingData data about a breeding put in by the user
   * @returns the matching breeding if there is any. Otherwise an error message.
   */

  const findBreedingMatch = async (herdId: string, breedingData: Breeding) => {
    const herdBreedings = await get(`/api/breeding/${herdId}`);

    const breedingMatch: Breeding = herdBreedings.breedings.find(
      (item) =>
        item.mother == breedingData.mother &&
        item.father == breedingData.father &&
        (item.breed_date == breedingData.breed_date ||
          item.birth_date == breedingData.birth_date)
    );
    console.log(breedingMatch);
    if (!breedingMatch) {
      userMessage("Parningstillfället kunde inte hittas.", "error");
      return;
    }
    return breedingMatch;
  };

  return (
    <DataContext.Provider
      value={{
        genebanks,
        users,
        colors,
        setGenebanks,
        setUsers,
        loadData,
        createBreeding,
        createBirth,
        updateBreeding,
        findBreedingMatch,
      }}
    >
      {props.children}
    </DataContext.Provider>
  );
}
