import * as React from "react";

export interface NameID {
  name: string;
  email?: string;
  id: number;
}

export interface HerdNameID {
  herd_name: string;
  herd: string;
  id: number;
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
  id: number;
  name: string | null;
  number: string;
  sex?: string;
}

export interface Individual extends LimitedIndividual {
  herd: HerdNameID;
  origin_herd?: HerdNameID;
  genebank: string;
  certificate: string | null;
  birth_date: string | null;
  mother: LimitedIndividual | null;
  father: LimitedIndividual | null;
  color: string | null;
  color_note: string | null;
  death_date: string | null;
  death_note: string | null;
  litter: number | null;
  notes: string | null;
  weights: Array<DateWeight> | null;
  bodyfat: Array<DateBodyfat> | null;
  herd_tracking: Array<DateValue> | null;
  herd_active: boolean;
  active: boolean;
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

export interface Color {
  id: number;
  name: string;
}

export function individualLabel(individual: LimitedIndividual): string {
  let label = `${individual.number}`;
  if (individual.name) {
    label += ` - ${individual.name}`;
  }
  return label;
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
export const inputVariant = "standard" as "filled" | "outlined" | "standard";

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
 * Returns active individuals of given sex in the genebank
 * @param genebank the genebank data to filter active individuals from
 * @param sex the sex of the active individuals
 */
export function activeIndividuals(genebank: Genebank | undefined, sex: string) {
  return React.useMemo(() => {
    if (!genebank) {
      return [];
    }
    return genebank?.individuals.filter(
      (i) => i.sex == sex && i.active == true
    );
  }, [genebank]);
}

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
