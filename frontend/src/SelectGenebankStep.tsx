// File: SelectGenebankStep.tsx

import React from "react";
import { Button, Typography } from "@material-ui/core";
import { useDataContext } from "@app/data_context";
import { useUserContext } from "@app/user_context";

interface SelectGenebankStepProps {
  user: any;
  genebankName: string | null;
  setGenebankName: (name: string) => void;
  onUpdateStatus?: (status: string) => void;
}

export const SelectGenebankStep: React.FC<SelectGenebankStepProps> = ({
  user,
  genebankName,
  setGenebankName,
  onUpdateStatus,
}) => {
  const { genebanks } = useDataContext();

  const handleGenebankSelect = (name: string) => {
    setGenebankName(name);
    onUpdateStatus?.("completed");
  };

  const availableGenebanks = genebanks.filter((g: any) => {
    if (user.is_admin) {
      return true;
    }
    if (user.is_manager) {
      return user.is_manager.includes(g.id);
    }
    return false;
  });

  if (availableGenebanks.length === 0) {
    return (
      <Typography>Du har inte behörighet att hantera någon genbank.</Typography>
    );
  }

  return (
    <div>
      <Typography variant="h6">Välj genbank:</Typography>
      {availableGenebanks.map((genebank: any) => (
        <Button
          key={genebank.name}
          variant={genebank.name === genebankName ? "contained" : "outlined"}
          color={genebank.name === genebankName ? "primary" : "default"}
          onClick={() => handleGenebankSelect(genebank.name)}
          style={{ margin: "0.5em" }}
        >
          {genebank.name}
        </Button>
      ))}
    </div>
  );
};
