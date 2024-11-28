// File: SelectHerdStep.tsx

import React, { useState, useEffect } from "react";
import { Button, Typography, TextField } from "@material-ui/core";
import { useDataContext } from "@app/data_context";
import { useUserContext } from "@app/user_context";

interface SelectHerdStepProps {
  user: any;
  genebankName: string | null;
  herdId: string | null;
  setHerdId: (id: string) => void;
}

export const SelectHerdStep: React.FC<SelectHerdStepProps> = ({
  user,
  genebankName,
  herdId,
  setHerdId,
}) => {
  const { genebanks } = useDataContext();
  const [herdOptions, setHerdOptions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (genebankName) {
      const genebank = genebanks.find((g: any) => g.name === genebankName);
      if (genebank) {
        // Assuming genebank.herds contains the list of herds
        setHerdOptions(genebank.herds);
      }
    } else if (user?.is_owner && user.is_owner.length > 0) {
      // For regular users with herds
      setHerdOptions(
        genebanks.flatMap((g: any) =>
          g.herds.filter((herd: any) => user.is_owner.includes(herd.herd))
        )
      );
    }
  }, [genebankName, genebanks, user]);

  if (!genebankName && (!user?.is_owner || user.is_owner.length === 0)) {
    return <Typography>Du äger ingen besättning.</Typography>;
  }

  // For regular users with only one herd
  if (
    !genebankName &&
    user?.is_owner &&
    user.is_owner.length === 1 &&
    !user.is_admin &&
    !user.is_manager?.length
  ) {
    useEffect(() => {
      setHerdId(user.is_owner[0]);
    }, [user.is_owner, setHerdId]);
    return <Typography>Besättning {user.is_owner[0]} är vald.</Typography>;
  }

  const filteredHerds = herdOptions.filter((herd: any) => {
    const herdName = herd.herd_name ? herd.herd_name.toLowerCase() : "";
    const herdId = herd.herd ? herd.herd.toLowerCase() : "";
    const search = searchTerm.toLowerCase();
    return herdName.includes(search) || herdId.includes(search);
  });

  return (
    <div>
      <Typography variant="h6">Välj besättning för årsrapport:</Typography>
      <TextField
        label="Sök besättning"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        fullWidth
        margin="normal"
      />
      <div style={{ maxHeight: "300px", overflowY: "auto" }}>
        {filteredHerds.map((herd: any) => (
          <Button
            key={herd.herd}
            variant={herd.herd === herdId ? "contained" : "outlined"}
            color={herd.herd === herdId ? "primary" : "default"}
            onClick={() => setHerdId(herd.herd)}
            style={{ margin: "0.5em" }}
          >
            {herd.herd_name || herd.herd}
          </Button>
        ))}
      </div>
    </div>
  );
};
