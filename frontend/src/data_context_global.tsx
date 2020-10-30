import * as React from 'react'

export interface NameID {
    name: string
    email?: string
    id: number
}

export interface HerdNameID {
    herd_name: string,
    herd: string,
    id: number
}

export interface DateValue {
    date: string
    value: string | number
    id?: number
}

export interface DateWeight {
    date: string
    weight: number
}

export type BodyFat = 'low' | 'normal' | 'high'

export interface DateBodyfat {
    date: string
    bodyfat: BodyFat
}

export interface LimitedIndividual {
    id: number,
    name: string | null,
    number: string,
    sex?: string,
}

export interface Individual extends LimitedIndividual{
    herd: HerdNameID
    origin_herd?: HerdNameID
    genebank: string
    certificate: string | null
    birth_date: string | null
    mother: LimitedIndividual | null
    father: LimitedIndividual | null
    colour: string | null
    colour_note: string | null
    death_date: string | null
    death_note: string | null
    litter: number | null
    notes: string | null
    weights: Array<DateWeight> | null
    bodyfat: Array<DateBodyfat> | null
    herd_tracking: Array<DateValue> | null
    herd_active: boolean
    active: boolean
    alive: boolean
    inbreeding?: number
    MK?: number
}

export type PrivacyLevel = 'private' | 'authenticated' | 'public' | null;


export interface Herd {
    id: number
    genebank: number
    herd: string
    herd_name: string | null
    has_details: boolean
    is_active: boolean | null
    start_date: string | null
    name: string | null
    name_privacy?: PrivacyLevel
    physical_address: string | null
    physical_address_privacy?: PrivacyLevel
    location: string | null
    location_privacy?: PrivacyLevel
    email: string | null
    email_privacy?: PrivacyLevel
    email_verified: boolean | null
    www: string | null
    www_privacy?: PrivacyLevel
    mobile_phone: string | null
    mobile_phone_privacy?: PrivacyLevel
    wire_phone: string | null
    wire_phone_privacy?: PrivacyLevel
    latitude: string | null
    longitude: string | null
    coordinates_privacy?: PrivacyLevel
    individuals?: Individual[]
}

export interface Color {
    id: number,
    name: string,
}

export function individualLabel(individual: LimitedIndividual): string {
    let label = `${individual.number}`
    if (individual.name){
        label += ` - ${individual.name}`
    }
    return label
}

export function herdLabel(herd: Herd): string {
    let label = `${herd.herd}`
    if (herd.herd_name) {
        label += ` - ${herd.herd_name}`
    }
    return label
}

export function userLabel(user: NameID): string {
    let label: string = `${user.email}`
    if (user.name) {
        label = `${user.name} - ${user.email}`
    }
    return label;
}

export interface Genebank {
    id: number
    name: string
    herds: Array<Herd>
    individuals: Array<Individual>
}

export interface DataContext {
    genebanks: Array<Genebank>
    users: Array<NameID>
    colors: {[genebank: string]:Color[]}
    setGenebanks(data: Genebank[]): void,
    setUsers(data: NameID[]): void,
    loadData(data: string | Array<string>): Promise<boolean>
}

export type ServerMessage = {
    status: 'unchanged' | 'updated' | 'created' | 'success' | 'error',
    message?: string,
    data?: any
}

export type OptionType = {value: string, label: string};

export const dateFormat = 'yyyy-MM-dd'
export const locale = 'SE-sv'

/**
 * Formats the given `dateString` according to the currently defined `locale`.
 * If no `dateString` is given the current date is used.
 *
 * @param dateString (optional) datestring in javascript understandable format.
 */
export function asLocale(dateString?: string) {
    const date = dateString ? new Date(dateString) : new Date()
    return date.toLocaleDateString(locale);
}

const emptyContext: DataContext = {
  genebanks: [],
  users: [],
  colors: {},
  setGenebanks() {},
  setUsers() {},
  async loadData() {return false},
}

export const DataContext = React.createContext(emptyContext)
