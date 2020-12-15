/**
 * @file This file contains the BreedingForm function. This function allows
 *       users to create and update breeding events in the database.
 */
import React from 'react'
import { makeStyles } from '@material-ui/core/styles';

import { Breeding } from './breeding_list';

const useStyles = makeStyles({
  form: {
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
});

/**
 * The BreedingForm function. This function allows users to create and update
 * breeding events in the database.
 */
export function BreedingForm({data}: {data: Breeding}) {
  const style = useStyles();

  return <>
    <form className={style.form}>
      <ul>
        {data && Object.keys(data).map((key: keyof Breeding) => {
          return <li>{key}: {data[key]}</li>
        })}
      </ul>
    </form>
  </>
}
