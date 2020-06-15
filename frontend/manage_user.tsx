/**
 * @file This file contains the ManageUser function. This function is used for
 * add users and set user permissions.
 */
import React from 'react'
import { makeStyles } from '@material-ui/core/styles';

/**
 * Provides a form for changing user metadata and user roles.
 */
export function ManageUser(props: {id: number | undefined}) {

  return <>
    <h2>User {props.id}</h2>
  </>
}
