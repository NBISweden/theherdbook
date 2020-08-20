import * as React from 'react'

export interface NameID {
    name: string
    email?: string
    id: number
}

export interface DateValue {
    date: string
    value: string | number
    id?: number
}

export interface Individual {
    id: number
    herd: NameID
    name: string | null
    certificate: string | null
    number: string
    sex: string | null
    birthDate: string | null
    mother: NameID | null
    father: NameID | null
    color: string | null
    colorNote: string | null
    deathDate: string | null
    deathNote: string | null
    litter: number | null
    notes: string | null
    weights: Array<DateValue> | null
    bodyfat: Array<DateValue> | null
    herdTracking: Array<DateValue> | null
}

export interface Herd {
    id: number
    genebank: number
    herd: number
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

export interface Genebank {
    id: number
    name: string
    herds: Array<Herd>
    individuals: Array<Individual>
}

export interface DataContext {
    genebanks: Array<Genebank>
    users: Array<NameID>
    loadData(data: string | Array<string>): Promise<boolean>
}

const emptyContext: DataContext = {
  genebanks: [],
  users: [],
  async loadData() {return false},
}

console.debug('Reloading data_context_global')

export const DataContext = React.createContext(emptyContext)
