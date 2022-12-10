import { TextField, Tooltip } from "@material-ui/core";
import React from "react";
import { OptionType } from "./data_context_global";
import { Individual, inputVariant } from "@app/data_context_global";
import { Autocomplete } from "@material-ui/lab";

export const CertAutocomplete = ({
  individual,
  updateIndividual,
  canManage,
  edit,
  intygError,
}: {
  individual: Individual;
  updateIndividual: <T extends keyof Individual>(
    field: T,
    value: Individual[T]
  ) => void;
  canManage: boolean;
  edit: boolean;
  intygError: boolean;
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
        options={
          edit
            ? certTypeOptions ?? []
            : certTypeOptions.filter((option) => option.value != "digital")
        }
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
            variant={inputVariant}
            margin="normal"
          />
        )}
        onChange={(event: any, newValue: OptionType) => {
          onCertTypeChange(newValue);
        }}
      />
      {certType == "paper" ? (
        <Tooltip title="Detta är nummret på ditt pappers intyg, dvs antingen de du skriver för hand med eller de du köper och skriver ut med din skrivare.">
          <TextField
            disabled={!canManage && edit}
            label="Nummer på pappersintyg"
            error={intygError}
            className="control controlWidth"
            variant={inputVariant}
            value={individual.certificate ?? ""}
            onChange={(event) => {
              updateIndividual("certificate", event.currentTarget.value);
            }}
          />
        </Tooltip>
      ) : certType == "digital" ? (
        <Tooltip title="För att utfärda ett Digitalt intyg välj 'Skapa nytt intyg' på kaninens profilsida.">
          <TextField
            disabled={!canManage}
            label="Sätts automatiskt av systemet"
            className="control controlWidth"
            variant={inputVariant}
            value={individual.digital_certificate ?? ""}
            onChange={(event) => {
              updateIndividual(
                "digital_certificate",
                event.currentTarget.value
              );
            }}
          />
        </Tooltip>
      ) : (
        <Tooltip title="Väljer du 'Inget Intyg' kan du i ett senare steg utfärda ett Digitaltintyg för kaninen eller lägga till ett intygs nummer från ett pappersintyg. Du hittar kaninen om du klickar i 'Oregistrerade djur' under 'Min besättnning' ">
          <TextField
            label="Lägg till intyg senare"
            disabled
            className="control controlWidth"
            variant={inputVariant}
            value=""
            onChange={() => {}}
          />
        </Tooltip>
      )}
    </>
  );
};
