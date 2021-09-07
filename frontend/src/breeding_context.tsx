import React from "react";

import { Birth, Breeding, LimitedBreeding } from "./data_context_global";
import { useMessageContext } from "./message_context";
import { get, patch, post } from "./communication";

export interface BreedingContext {
  createBreeding(breedingData: LimitedBreeding): Promise<any>;
  createBirth(birthData: Birth): Promise<any>;
  updateBreeding(breedingData: Breeding): Promise<any>;
  findBreedingMatch(herdId: string, breedingData: Breeding): Promise<any>;
  modifyBreedingUpdates(updates: Breeding, breedingMatch: Breeding): Breeding;
  checkBirthUpdate(breeding: Breeding, breedingUpdates: Breeding): number;
}

const emptyBreedingContext: BreedingContext = {
  async createBreeding() {},
  async createBirth() {},
  async updateBreeding() {},
  async findBreedingMatch() {},
  modifyBreedingUpdates() {
    return {
      breed_date: null,
      breed_notes: "",
      father: "",
      mother: "",
      birth_date: null,
      birth_notes: "",
      litter_size: null,
    };
  },
  checkBirthUpdate() {
    return 0;
  },
};

export const BreedingContext = React.createContext(emptyBreedingContext);

export const useBreedingContext = () => {
  return React.useContext(BreedingContext);
};

export const WithBreedingContext = (props: { children: React.ReactNode }) => {
  const { userMessage } = useMessageContext();
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
      ["Forbidden", "Du har inte rätt behörighet."],
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

    if (!breedingMatch) {
      /* userMessage("Parningstillfället kunde inte hittas.", "error"); */
      return false;
    }
    return breedingMatch;
  };

  /**
   * Used before updating an existing breeding with user input.
   * It removes empty fields and adds the breeding id.
   * This way, the right breeding is updated and no empty fields are sent to the API.
   * Empty fields would cause error messages from the API.
   * */
  const modifyBreedingUpdates = (updates: Breeding, breedingMatch) => {
    let newUpdates: Breeding = { ...updates, ...{ id: breedingMatch.id } };
    for (let key in newUpdates) {
      if (newUpdates[key] === null || newUpdates[key] === undefined) {
        delete newUpdates[key];
      }
    }
    return newUpdates;
  };

  /**
   * When a breeding event is updated, this function checks if birth information was updated
   * and how many empty individuals should be created (can be 0).
   * @param breeding the breeding that is being updated
   * @param breedingUpdates the updates input by the user
   * @returns number of new individuals that should be created
   */
  const checkBirthUpdate = (breeding: Breeding, breedingUpdates: Breeding) => {
    if (!(breedingUpdates.birth_date && breedingUpdates.litter_size)) {
      return 0;
    }
    if (!breeding.litter_size) {
      return breedingUpdates.litter_size;
    }
    if (breeding.litter_size < breedingUpdates.litter_size) {
      return breedingUpdates.litter_size - breeding.litter_size;
    }
    return 0;
  };

  return (
    <BreedingContext.Provider
      value={{
        createBreeding,
        createBirth,
        updateBreeding,
        findBreedingMatch,
        modifyBreedingUpdates,
        checkBirthUpdate,
      }}
    >
      {props.children}
    </BreedingContext.Provider>
  );
};
