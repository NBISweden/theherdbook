/**
 * @file This file contains the HerdForm function. This function is used for
 * changing herd attributes in the database.
 */
import React from 'react'
import { useHistory } from "react-router-dom";
import { FormControlLabel, TextField, Button, Typography, Checkbox } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import Select from 'react-select';
import { useDataContext } from './data_context'
import { Herd, Individual, Genebank } from '~data_context_global';

import { get, updateHerd, createHerd } from './communication';

// Define styles for the form
const useStyles = makeStyles({
  form: {
    display: "flex",
    flexDirection: "row",
  },
  simpleField: {
    width: "100%",
  },
  title: {
    fontSize: 16,
    borderBottom: '1px solid lightgrey',
    margin: '5px 0 20px 0',
  },
  subheading: {
    fontSize: 14,
    borderBottom: '1px solid lightgrey',
    margin: '20px 0 5px 0',
  },
  formCard: {
    padding: '15px',
    margin: '10px',
    maxWidth: '450px',
    border: '1px solid grey',
    borderRadius: '5px',
  }
});

const defaultValues: Herd = {
  id: -1,
  genebank: -1,
  herd: '',
  herd_name: '',
  has_details: false,
  is_active: false,
  start_date: '',
  name: '',
  name_privacy: 'private',
  physical_address: '',
  physical_address_privacy: 'private',
  location: '',
  location_privacy: 'private',
  email: '',
  email_privacy: 'private',
  email_verified: false,
  www: '',
  www_privacy: 'private',
  mobile_phone: '',
  mobile_phone_privacy: 'private',
  wire_phone: '',
  wire_phone_privacy: 'private',
  latitude: '',
  longitude: '',
  coordinates_privacy: 'private',
  individuals: []
}

/**
 * Provides herd management forms for setting herd metadata. The form will
 * load herd data for the id `id` if it's a number, or for a new herd if `id` is
 * `undefined` or `'new'`.
 */
export function HerdForm({id}: {id: string | undefined}) {
  const {genebanks, setGenebanks} = useDataContext()
  const [herd, setHerd] = React.useState({...defaultValues} as Herd)
  const [loading, setLoading] = React.useState(true);
  const [postalcode, setPostalcode] = React.useState('000 00')
  const [postalcity, setPostalcity] = React.useState('')
  const [isNew, setNew] = React.useState(false)
  const history = useHistory()
  const classes = useStyles();

  /**
   * Loads herd data for herd `id`. If data is returned, the form is set to use
   * that data for making updates to the herd information. if no data is
   * returned, or if `id` is set to `'new'` or `undefined`, the form will be
   * emptied for creating new herds.
   */
  React.useEffect(() => {
    setLoading(true);
    setHerd({...defaultValues});
    setPostalcode('')
    setPostalcity('')
    if (id == 'new' || !id) {
      setNew(true);
    } else {
      get(`/api/herd/${id}`).then(
        data => {
          if (data) {
            // verify the data doesn't have nulls
            Object.keys(data).forEach((k: string) => {data[k] = data[k] ?? ''})

            // split physical address into address, postcode, postcity
            if (data?.physical_address && data.physical_address.includes('|')) {
              const [address, postcode, postcity] = data.physical_address.split('|')
              data.physical_address = address
              setPostalcode(postcode)
              setPostalcity(postcity)
            }
            setHerd(data)
            setNew(false)
          }
        },
        error => console.error(error)
      );
    }
    setLoading(false);
  }, [id])

  /**
   * Sets a single key `label` in the `herd` form to `value` (if herd isn't
   * undefined).
   */
  const setFormField = <K extends keyof Herd>(label: K, value: Herd[K]) => {
    herd && setHerd({...herd, [label]: value})
  }

  /**
   * Returns a genebank, identified by `genebankId`, as a React-Select option.
   * @param genebankId
   */
  const genebankOption = (genebankId: number) => {
    if (!genebanks) {
      return null;
    }
    const genebank = genebanks.find((g: Genebank) => g.id == herd.genebank)
    if (genebank) {
      return {value: genebank.id, label: genebank.name}
    }
    return null
  }

  /**
   * sends a POST request to create a new herd in the database if the `isNew` is
   * `true`, otherwise sends am UPDATE request to update a current database
   * entry. This function will also update the `genebanks` context with the
   * new information. If a new entry is created, the page will reroute to edit
   * that entry.
   */
  const submitForm = () => {
    if (herd == undefined) {
      return
    }
    const postData: Herd = {...herd};
    delete postData["individuals"];
    postData["physical_address"] = `${postData["physical_address"]}|${postalcode}|${postalcity}`

    if (isNew) {
      createHerd(postData).then(
        status => {
          if (status == 'success') {
            const genebank = genebanks.find((g: Genebank) => g.id == postData.genebank)
            if (genebank) {
              genebank.herds.push(postData)
              setGenebanks(Object.assign([], genebanks))

              // navigate to new herd to allow continued editing
              history.push(`/manage/${genebank?.name}/${postData.herd}`)
            }
          }
        }
      )
    } else {
      updateHerd(postData).then(
        status => {
          if (status == 'updated') {
            const genebank = genebanks.find((g: Genebank) => g.id == postData.genebank)
            if (genebank) {
              let toUpdate = genebank.herds.find((h: Herd) => h.herd == id)
              if (toUpdate) {
                toUpdate.herd_name = postData.herd_name
                setGenebanks(Object.assign([], genebanks))
              }
            }
          }
        }
      );
    }
  }

  return <>
    {loading && <h2>Loading...</h2> ||
      <>
        <h1>{herd ? `Besättning ${herd.herd}` : `Ny Besättning`}</h1>

        <form className={classes.form}>
          <div className={classes.formCard}>
            <Typography className={classes.title} color="primary" gutterBottom>
              Kontaktperson
            </Typography>

            <TextField label='Namn' className={classes.simpleField}
              value={herd.name}
              onChange={(e: any) => {setFormField('name', e.target.value)}}
              />
            <TextField label='E-mail' className={classes.simpleField}
              value={herd.email}
              onChange={(e: any) => {setFormField('email', e.target.value)}}
              />
            <TextField label='Mobiltelefon' className={classes.simpleField}
              value={herd.mobile_phone}
              onChange={(e: any) => {setFormField('mobile_phone', e.target.value)}}
              />
            <TextField label='Fast Telefon' className={classes.simpleField}
              value={herd.wire_phone}
              onChange={(e: any) => {setFormField('wire_phone', e.target.value)}}
              />
            <TextField label='Hemsida' className={classes.simpleField}
              value={herd.www}
              onChange={(e: any) => {setFormField('www', e.target.value)}}
              />
            <TextField label='Gatuadress' className={classes.simpleField}
              value={herd.physical_address}
              onChange={(e: any) => {setFormField('physical_address', e.target.value)}}
              />
            <TextField label='Postnummer'
              value={postalcode}
              onChange={(e: any) => {setPostalcode(e.target.value)}}
              />
            <TextField label='Postort'
              value={postalcity}
              onChange={(e: any) => {setPostalcity(e.target.value)}}
              />
          </div>

          <div className={classes.formCard}>
            <Typography className={classes.title} color="primary" gutterBottom>
              Besättningsinformation
            </Typography>

            <TextField label='Besättningsnamn' className={classes.simpleField}
              value={herd.herd_name}
              onChange={(e: any) => {setFormField('herd_name', e.target.value)}}
              />
            <FormControlLabel label="Aktiv" labelPlacement="end"
              control={<Checkbox color="primary" checked={herd.is_active == null ? false : !!herd.is_active} />}
              value={herd.is_active}
              onChange={(e: any) => {setFormField('is_active', e.target.checked)}}
              />
            <TextField label='Startdatum' className={classes.simpleField}
              value={herd.start_date}
              onChange={(e: any) => {setFormField('start_date', e.target.value)}}
              />

            <TextField label='Besättnings-ID' className={classes.simpleField}
              disabled={!isNew}
              value={herd.herd}
              onChange={(e: any) => {setFormField('herd', e.target.value)}}
              />

            <Typography className={classes.subheading} color="textSecondary">
              Genbank
            </Typography>
            <Select label='Genbank' isDisabled={!isNew}
              value={genebankOption(herd.genebank)}
              options={genebanks ? genebanks.map((g: Genebank) => {return {value: g.id, label: g.name}}) : []}
              onChange={(e: any) => setFormField('genebank', e.value)}
              />

            <Typography className={classes.subheading} color="textSecondary">
              Individer  {herd?.individuals ? `(${herd.individuals.length} st)` : ''}
            </Typography>
            <Select
                options={herd?.individuals ? herd.individuals.map((i: Individual) =>
                          {return {value: i.number, label: `${i.number}${i.name ? `, ${i.name}` : ''}`}})
                          : []
                        }
                />
          </div>

        </form>
        <Button variant="contained"
                color="primary"
                onClick={() => submitForm()}>
          {isNew ? "Skapa" : "Spara"}
        </Button>
      </>
    }
  </>
}
