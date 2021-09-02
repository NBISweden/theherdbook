/**
 * @file This file contains the FieldWithPermission function. This function
 * provides an input field with an attached permission level field.
 */
import React from "react";
import { TextField } from "@material-ui/core";
import { Autocomplete } from "@material-ui/lab";
import {
  inputVariant,
  OptionType,
  PrivacyLevel,
} from "@app/data_context_global";

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
      // Validation with w3c regexp from emailregex.com
      return !!value.match(/^[a-zA-Z0-9.!#$%&’*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/);
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
  const options = [
    { value: "private", label: "Endast Manager" },
    { value: "authenticated", label: "Endast Inloggade" },
    { value: "public", label: "Alla kan se" },
  ];

  return (
    <>
      <div className="permissionGroup">
        <TextField
          label={label}
          className="simpleField"
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
                className="permissionFieldExtended"
                fullWidth={false}
                style={{ marginLeft: "45px" }}
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
