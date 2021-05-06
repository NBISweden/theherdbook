/**
 * @file This file contains the FieldWithPermission function. This function
 * provides an input field with an attached permission level field.
 */
import React from "react";
import { TextField } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { Autocomplete } from "@material-ui/lab";
import {
  inputVariant,
  OptionType,
  PrivacyLevel,
} from "@app/data_context_global";

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
    marginTop: 0,
    marginLeft: "5px",
  },
});

/**
 * The FieldWithPermission function provides an input field, with the input tag
 * `field`, having the input label `label`, with the value `value`. If
 * permission is not `null`, then a permission field will be attached with the
 * level `permission`. When a value is changed in either field the new value
 * will be returned by the `setValue` callback.
 */
export function FieldWithPermission({
  field,
  label,
  value,
  permission,
  setValue,
}: {
  field: string;
  label: string;
  value: string | null;
  permission: PrivacyLevel | undefined;
  setValue: Function;
}) {
  const classes = useStyles();

  const options = [
    { value: "private", label: "Endast Manager" },
    { value: "authenticated", label: "Endast Inloggade" },
    { value: "public", label: "Alla kan se" },
  ];

  return (
    <>
      <div className={classes.permissionGroup}>
        <TextField
          label={label}
          className={classes.simpleField}
          value={value}
          variant={inputVariant}
          onChange={(e: any) => {
            setValue(field, e.target.value);
          }}
        />
        {permission !== undefined && (
          <Autocomplete
            options={options ?? []}
            value={
              options.find((option) => option.value == permission) ?? options[0]
            }
            getOptionLabel={(option: OptionType) => option.label}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Synlighet"
                variant={inputVariant}
                className={classes.permissionField}
                margin="normal"
              />
            )}
            onChange={(event: any, newValue: OptionType | null) => {
              setValue(`${field}_privacy`, newValue?.value);
            }}
          />
        )}
      </div>
    </>
  );
}
