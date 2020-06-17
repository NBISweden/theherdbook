import * as React from 'react'

import {post, get} from './communication'

export interface NameID {
    name: string
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
}

/**
 * The data context holds genebank, herd, and individual data, as well as
 * funtions to request and modify the data.
 *
 * The data is arranged in `genebanks`, `herds`, and `individuals`.
 */
export interface DataContext {
    genebanks: Array<NameID>
    herds: Array<Herd>
    getGenebanks(): Promise<boolean>
}

const emptyContext: DataContext = {
  genebanks: [],
  herds: [],
  async getGenebanks() {return false},
}

const DataContext = React.createContext(emptyContext)

/**
 *
 */
export function useDataContext(): DataContext {
  return React.useContext(DataContext)
}

export function WithDataContext(props: {children: React.ReactNode}) {
  const [genebanks, setGenebanks] = React.useState([] as Array<NameID>)
  const [herds, setHerds] = React.useState([] as Array<Herd>)

  async function getGenebanks() {
    return await get('/api/genebanks').then(
      data => {
        if (!data) {
          return false;
        }
        setGenebanks(data);
        console.debug("geniebynky:",  data, genebanks)
        return true;
      },
      error => {
        console.error(error);
        return false;
      }
    )
  }

  React.useEffect(() => {
    getGenebanks()
  }, [])

  return (
    <DataContext.Provider value={{genebanks, herds, getGenebanks}}>
      {props.children}
    </DataContext.Provider>
  )
}

