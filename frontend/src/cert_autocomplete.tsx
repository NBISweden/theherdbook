import { TextField } from "@material-ui/core";
import React from "react";
import { OptionType } from "./data_context_global";
import { Individual, inputVariant } from "@app/data_context_global";
import { Autocomplete } from "@material-ui/lab";

export const CertAutocomplete = ({
  individual,
  updateIndividual,
  canManage,
  edit,
}: {
  individual: Individual;
  updateIndividual: <T extends keyof Individual>(
    field: T,
    value: Individual[T]
  ) => void;
  canManage: boolean;
  edit: boolean;
}) => {
  const defaultCert = !!individual.certificate
    ? "paper"
    : !!individual.digital_certificate
    ? "digital"
    : "none";
  const [certType, setCertType] = React.useState(defaultCert);

  const certTypeOptions: OptionType[] = [
    { value: "digital", label: "Digital" },
    { value: "paper", label: "Papper" },
    { value: "none", label: "Inget intyg" },
  ];

  /**
   * This is to make sure there never is a value in the local state for
   * both digital and paper certificate, only for one (or none) of them.
   * Without this, redundant values could be remaining in the state if the user
   * changes the cert type after putting in a number.
   *
   */
  const onCertTypeChange = (type: OptionType) => {
    setCertType(type.value);
    if (type.value == "digital") {
      updateIndividual("certificate", null);
    } else if (type.value == "paper") {
      updateIndividual("digital_certificate", null);
    } else {
      updateIndividual("digital_certificate", null);
      updateIndividual("certificate", null);
    }
  };
  return (
    <>
      <Autocomplete
        disabled={!canManage && edit}
        className="controlWidth"
        options={certTypeOptions ?? []}
        value={certTypeOptions.find(
          (option) =>
            option.value == certType ??
            certTypeOptions[certTypeOptions.length - 1]
        )}
        getOptionLabel={(option: OptionType) => option.label}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Typ av intyg"
            className="control"
            inputProps={{ className: "data-hj-allow" }}
            variant={inputVariant}
            margin="normal"
          />
        )}
        onChange={(event: any, newValue: OptionType) => {
          onCertTypeChange(newValue);
        }}
      />
      {certType == "paper" ? (
        <TextField
          disabled={!canManage && edit}
          label="Nummer på pappersintyg"
          className="control controlWidth"
          inputProps={{ className: "data-hj-allow" }}
          variant={inputVariant}
          value={individual.certificate ?? ""}
          onChange={(event) => {
            updateIndividual("certificate", event.currentTarget.value);
          }}
        />
      ) : certType == "digital" ? (
        <TextField
          disabled={!canManage && edit}
          label="Nummer på digitaltintyg"
          className="control controlWidth"
          inputProps={{ className: "data-hj-allow" }}
          variant={inputVariant}
          value={individual.digital_certificate ?? ""}
          onChange={(event) => {
            updateIndividual("digital_certificate", event.currentTarget.value);
          }}
        />
      ) : (
        <TextField
          label="Intygsnummer - välj typ först"
          disabled
          className="control controlWidth"
          inputProps={{ className: "data-hj-allow" }}
          variant={inputVariant}
          value=""
          onChange={() => {}}
        />
      )}
    </>
  );
};
