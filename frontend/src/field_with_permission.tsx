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
                className="permissionFieldExtended"
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
