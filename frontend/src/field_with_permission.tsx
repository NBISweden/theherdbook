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
 * Regexp validation of the supported types, email, tel, url, and text, where
 * empty values are always valid, and any text value is valid.
 *
 * @param fieldType
 * @param value
 */
function validateType(fieldType: LimitedInputType, value: string | null): boolean {
  if (!value) {
    return true
  }
  switch (fieldType) {
    case 'email':
      // Validation with RFC5322
      return !!value.match(/(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])/);
    case 'url':
      // validation from urlregex.com
      return !!value.match(/((([A-Za-z]{3,9}:(?:\/\/)?)(?:[\-;:&=\+\$,\w]+@)?[A-Za-z0-9\.\-]+|(?:www\.|[\-;:&=\+\$,\w]+@)[A-Za-z0-9\.\-]+)((?:\/[\+~%\/\.\w\-_]*)?\??(?:[\-\+=&;%@\.\w_]*)#?(?:[\.\!\/\\\w]*))?)/)
    case 'tel':
      // very general match - basically allow anything that starts with
      // `+<num>(0)` or `0`, followed by any combination of numbers, whitespace
      // and dashes.
      return !!value.match(/^(\+?[0-9]{1,3}\(0\)|0)[\s0-9\-]+$/)
  }
  return true
}


export type LimitedInputType = 'text' | 'tel' | 'url' | 'email';

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
  fieldType = 'text'
}: {
  field: string;
  label: string;
  value: string | null;
  permission: PrivacyLevel | undefined;
  setValue: Function;
  fieldType: LimitedInputType
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
          error={!validateType(fieldType, value)}
          value={value}
          type={fieldType ?? 'text'}
          variant={inputVariant}
          onChange={(e: any) => {
            setValue(field, e.target.value)
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
