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

export interface LimitedIndividual {
    id: number,
    name: string | null,
    number: string,
    sex?: string,
}

export interface Individual extends LimitedIndividual{
    herd: HerdNameID
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
    weights: Array<DateValue> | null
    bodyfat: Array<DateValue> | null
    herd_tracking: Array<DateValue> | null
    herd_active: boolean
    active: boolean
    alive: boolean
}

export interface Herd {
    id: number
    genebank: number
    herd: string
    herd_name: string | null
    has_details: boolean
    is_active: boolean | null
    start_date: string | null
    name: string | null
    name_privacy?: string | null
    physical_address: string | null
    physical_address_privacy?: string | null
    location: string | null
    location_privacy?: string | null
    email: string | null
    email_privacy?: string | null
    email_verified: boolean | null
    www: string | null
    www_privacy?: string | null
    mobile_phone: string | null
    mobile_phone_privacy?: string | null
    wire_phone: string | null
    wire_phone_privacy?: string | null
    latitude: string | null
    longitude: string | null
    coordinates_privacy?: string | null
    individuals?: Individual[]
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
    setGenebanks(data: Genebank[]): void,
    setUsers(data: NameID[]): void,
    loadData(data: string | Array<string>): Promise<boolean>
}

export type ServerMessage = {
    status: 'unchanged' | 'updated' | 'created' | 'success' | 'error',
    message?: string,
    data?: any
}

const emptyContext: DataContext = {
  genebanks: [],
  users: [],
  setGenebanks() {},
  setUsers() {},
  async loadData() {return false},
}

export const DataContext = React.createContext(emptyContext)
