/**
 * @file This file contains the HerdForm function. This function is used for
 * changing herd attributes in the database.
 */
import React from 'react'
import { TextField } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import {Link} from "react-router-dom";
import { get } from './communication';

// Define styles for tab menu
const useStyles = makeStyles({
  form: {
    borderLeft: "1px solid rgba(0,0,0,0.1)",
    paddingLeft: "0.5cm",
    display: "flex",
    flexDirection: "column",
  },
  simpleField: {
    width: "400px",
  },
});

/**
 * Provides genebanks management forms for granting and revoking herd
 * permissions, and managing herd animals.
 */
export function HerdForm(props: {id: any | undefined}) {
  const [herd, setHerd] = React.useState(undefined as any)
  const [loading, setLoading] = React.useState(true);
  const classes = useStyles();
  const simpleFields = [
    {key: 'name', title: "Namn"},
    {key: 'email', title: "E-post"},
    {key: 'mobile_phone', title: "Mobiltelefon"},
    {key: 'wire_phone', title: "Fast telefon"},
    {key: 'physical_address', title: "Adress"},
    {key: 'www', title: "Hemsida"},
  ];

  React.useEffect(() => {
    setLoading(true);
    if (props.id) {
      get(`/api/herd/${props.id}`).then(
        data => {
          data && setHerd(data);
          setLoading(false);
        },
        error => console.error(error)
      );
    }
  }, [props])

  const setFormField = (label: string, value: string | number) => {
    herd[label] = value;
    setHerd(herd);
  }

  return <>
    {loading && <h2>Loading...</h2> ||  herd &&
      <>
        <h1>{herd.name ?? `Besättning ${herd.id}`}</h1>
        <form className={classes.form} noValidate autoComplete="off">
          {simpleFields.map((field: any, i: number) => {
            return <TextField
                    key={i}
                    id={field.key}
                    label={field.title}
                    value={herd[field.key] ?? undefined}
                    className={classes.simpleField}
                    onChange={e => setFormField(field.key, e.target.value)} />
            })
          }
        </form>
        <h2>Individer</h2>
        <ul>
          {herd.individuals.map((individual: any, i:number) => {
            return <Link key={i} to={`/individual/${individual.id}`}>
              <li>{individual.name ?? individual.number}</li>
            </Link>
          })}
        </ul>
      </>
    }
  </>
}
