import * as React from "react";

export interface NameID {
  name: string;
  email?: string;
  id: number;
}

export interface HerdNameID {
  herd_name?: string;
  herd: string;
  id?: number;
}

export interface DateValue {
  date: string;
  value: string | number;
  id?: number;
}

export interface DateWeight {
  date: string;
  weight: number;
}

export type BodyFat = "low" | "normal" | "high";

export interface DateBodyfat {
  date: string;
  bodyfat: BodyFat;
}

export interface LimitedIndividual {
  id?: number;
  name?: string | null;
  number: string | null;
  sex?: string;
}

export interface LimitedIndividualForReport {
  id: number;
  number: string;
  herd: string;
  yearly_report_date: Date;
}

export interface Individual extends LimitedIndividual {
  herd: HerdNameID | string;
  origin_herd?: HerdNameID;
  genebank?: string;
  certificate: string | null;
  digital_certificate?: string | null;
  birth_date: string | null;
  mother: LimitedIndividual | null;
  father: LimitedIndividual | null;
  color?: string | null;
  color_note: string | null;
  death_date: string | null;
  death_note: string | null;
  litter_size: number | null;
  litter_size6w: number | null;
  notes: string | null;
  weights?: Array<DateWeight> | null;
  bodyfat?: Array<DateBodyfat> | null;
  herd_tracking: Array<DateValue> | null;
  herd_active: boolean;
  is_active: boolean;
  is_registered: boolean;
  alive: boolean;
  belly_color: string | null;
  eye_color: string | null;
  claw_color: string | null;
  inbreeding?: number;
  MK?: number;
  children?: number;
  hair_notes: string;
  selling_date: string | null;
  breeding: number | null;
  butchered: boolean;
  castration_date: string | null;
}

export type PrivacyLevel = "private" | "authenticated" | "public" | null;

export interface LimitedHerd {
  id: number;
  genebank: number;
  herd: string;
  herd_name: string | null;
  is_active: boolean | null;
}

export interface Herd extends LimitedHerd {
  has_details: boolean;
  start_date: string | null;
  name: string | null;
  name_privacy?: PrivacyLevel;
  physical_address: string | null;
  physical_address_privacy?: PrivacyLevel;
  location: string | null;
  location_privacy?: PrivacyLevel;
  email: string | null;
  email_privacy?: PrivacyLevel;
  email_verified: boolean | null;
  www: string | null;
  www_privacy?: PrivacyLevel;
  mobile_phone: string | null;
  mobile_phone_privacy?: PrivacyLevel;
  wire_phone: string | null;
  wire_phone_privacy?: PrivacyLevel;
  latitude: string | null;
  longitude: string | null;
  coordinates_privacy?: PrivacyLevel;
  individuals?: Individual[];
}

export interface LimitedBreeding {
  date: string | null;
  breeding_herd: string;
  mother: string;
  father: string;
  notes?: string;
}

export interface Breeding {
  [key: string]: any;
  id?: number;
  breeding_herd: string;
  breed_date: string | null;
  breed_notes?: string;
  father: string;
  mother: string;
  birth_date: string | null;
  birth_notes?: string;
  litter_size: number | null;
  litter_size6w: number | null;
}

export interface ExtendedBreeding extends Breeding {
  mother_name: string | null | undefined;
  father_name: string | null | undefined;
  individuals: Individual[] | null | undefined;
}

export interface Birth {
  id: number;
  date: string;
  litter_size: number | null;
  litter_size6w: number | null;
  notes?: string;
}

export interface Color {
  id: number;
  name: string;
  comment: string;
}

export function individualLabel(individual: LimitedIndividual): string {
  let label = `${individual.number}`;
  if (individual.name) {
    label += ` - ${individual.name}`;
  }
  return label;
}

export function breedingLabel(individual: Individual): string {
  let father = `${individual.father.number}`;
  let mother = `${individual.mother.number}`;
  let testDate = new Date(individual.birth_date).toString();
  if (testDate == "Invalid Date") {
    return "Väntar på giltigt födelsedatum......";
  }
  let date = new Date(individual.birth_date)?.toISOString().split("T")[0];
  return (
    "[" +
    "Födsel " +
    date +
    "] " +
    father +
    "(" +
    individual.father.name +
    ") - " +
    mother +
    "(" +
    individual.mother.name +
    ")"
  );
}

export function herdLabel(herd: LimitedHerd): string {
  let label = `${herd.herd}`;
  if (herd.herd_name) {
    label += ` - ${herd.herd_name}`;
  }
  return label;
}

export function userLabel(user: NameID): string {
  let label: string = `${user.email}`;
  if (user.name) {
    label = `${user.name} - ${user.email}`;
  }
  return label;
}

export interface Genebank {
  id: number;
  name: string;
  herds: Array<LimitedHerd>;
  individuals: Array<Individual>;
}

export interface DataContext {
  genebanks: Array<Genebank>;
  users: Array<NameID>;
  colors: { [genebank: string]: Color[] };
  herdChangeListener: number;
  herdListener: string;
  setHerdChangeListener(data: number): void;
  setHerdListener(data: string): void;
  setGenebanks(data: Genebank[]): void;
  setUsers(data: NameID[]): void;
  loadData(data: string | Array<string>): Promise<boolean>;
}

export type ServerMessage = {
  status: "unchanged" | "updated" | "created" | "success" | "error";
  message?: string;
  data?: any;
};

export type OptionType = { value: string; label: string };

export const dateFormat = "yyyy-MM-dd";
export const locale = "sv";
export const inputVariant = "filled" as "filled" | "outlined" | "standard";

/**
 * Formats the given `dateString` according to the currently defined `locale`.
 * If no `dateString` is given the current date is used.
 *
 * @param dateString (optional) datestring in javascript understandable format.
 */
export function asLocale(dateString?: string) {
  if (!dateString) {
    return "";
  }
  const date = dateString ? new Date(dateString) : new Date();
  return date.toLocaleDateString(locale);
}

/**
 * Returns alive individuals of given sex in the genebank from a given date
 * @param genebank the genebank data to filter active individuals from
 * @param sex the sex of the active individuals
 * @param fromDate the latest birth date from which individuals should be retrieved
 * @param herdId the id of the herd to filter individual data
 * @param showDead boolen to show or hide dead animals
 */
export function individualsFromDate(
  genebank: Genebank | undefined,
  sex: string,
  fromDate: Date,
  herdId: string | undefined,
  showDead: boolean | false
) {
  const originHerdNameID: HerdNameID = {
    herd: herdId,
  };
  if (!genebank) {
    return [];
  }
  return genebank?.individuals
    .filter(
      (i) =>
        i.sex == sex &&
        (showDead || i.alive) &&
        (sex === "female" && herdId
          ? i.herd.herd == originHerdNameID.herd
          : true) &&
        new Date(i.birth_date ? i.birth_date : new Date()) >= fromDate
    )
    .sort((a, b) => {
      if (sex === "male") {
        if (
          a.herd.herd === originHerdNameID.herd &&
          b.herd.herd !== originHerdNameID.herd
        ) {
          return -1; // a is male from the matching herd and should come before b
        } else if (
          a.herd.herd !== originHerdNameID.herd &&
          b.herd.herd === originHerdNameID.herd
        ) {
          return 1; // b is male from the matching herd and should come before a
        }
      }
      return 0; // default case, leave a and b in their current order
    });
}

export const toLimitedIndividuals = (
  inds: Individual[]
): LimitedIndividual[] => {
  const active = inds.map((i) => {
    return {
      id: i.id,
      name: i.name,
      number: i.number,
    };
  });
  return active;
};

const emptyContext: DataContext = {
  genebanks: [],
  users: [],
  colors: {},
  setGenebanks() {},
  setUsers() {},
  async loadData() {
    return false;
  },
};

export const DataContext = React.createContext(emptyContext);
