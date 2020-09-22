/**
 * @file This file contains the FieldWithPermission function. This function
 * provides an input field with an attached permission level field.
 */
import React from 'react'
import { TextField } from '@material-ui/core';
import { makeStyles } from '@material-ui/core/styles';
import Select from 'react-select';
import { PrivacyLevel } from '~data_context_global';

// Define styles for the form
const useStyles = makeStyles({
  simpleField: {
    width: "100%",
  },
  permissionGroup: {
    display: "flex",
    flexDirection: "row",
  },
  permissionField: {
    width: "200px",
  }
});

/**
 * The FieldWithPermission function provides an input field, with the input tag
 * `field`, having the input label `label`, with the value `value`. If
 * permission is not `null`, then a permission field will be attached with the
 * level `permission`. When a value is changed in either field the new value
 * will be returned by the `setValue` callback.
 */
export function FieldWithPermission({field, label, value, permission, setValue}:
    {field: string, label: string, value: string | null, permission: PrivacyLevel | undefined, setValue: Function}) {
  const classes = useStyles();

  return <>
    <div className={classes.permissionGroup}>
      <TextField label={label} className={classes.simpleField}
        value={value}
        onChange={(e: any) => {setValue(field, e.target.value)}}
        />
      {permission !== undefined &&
        <Select className={classes.permissionField}
          value={{value: permission, label: permission}}
          options={[{value: 'private', label: 'private'},
                    {value: 'authenticated', label: 'authenticated'},
                    {value: 'public', label: 'public'}]}
          onChange={(v: any) => {setValue(`${field}_privacy`, v.value)}}
          />
      }
    </div>
  </>
}
