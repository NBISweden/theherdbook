import React, { useState } from "react";

import { get } from "@app/communication";
import { useMessageContext } from "@app/message_context";
import { useDataContext } from "./data_context";
import { Breeding, ExtendedBreeding } from "./data_context_global";
import { useUserContext } from "./user_context";
import { SortedTable, Column } from "./sorted_table";
import { Typography } from "@material-ui/core";
import { IndividualBreedingForm } from "./individual_breeding_form";

// Material UI
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
} from "@material-ui/core";

export const BreedingDialog = ({
  open,
  close,
  breed_id,
  individual,
  onUpdateIndividual,
}: {
  breed_id: string | undefined;
  individual: Individual;
  onUpdateIndividual: any;
}) => {
  const [selectedValue, setSelectedValue] = useState("");
  const [active, setActive] = React.useState(null as any);
  const [extendedBreeding, setExtendedBreeding] = React.useState(
    [] as Breeding[]
  );
  const [breedingsChanged, setBreedingsChanged] = React.useState(true);
  const { userMessage } = useMessageContext();
  const handleBreedingsChanged = () => {
    setBreedingsChanged(true);
  };
  React.useEffect(() => {
    if (breed_id) {
      get(`/api/breeding/id/${breed_id}`).then(
        (data: { breeding: Breeding[] }) => {
          data && setExtendedBreeding(data.breeding);
        },
        (error) => {
          console.error(error);
          userMessage(error, "error");
        }
      );
    }
  }, [breed_id]);

  const handleActive = (breeding: Breeding) => {
    setActive(breeding);
  };
  return (
    <Dialog
      open={open}
      fullWidth={true}
      maxWidth={"sm"}
      scroll="body"
      keepMounted
      onClose={close}
      aria-labelledby="alert-dialog-slide-title"
      aria-describedby="alert-dialog-slide-description"
    >
      <div>
        <DialogContent>
          <IndividualBreedingForm
            data={extendedBreeding}
            herdId={extendedBreeding.breeding_herd}
            handleBreedingsChanged={handleBreedingsChanged}
            handleActive={handleActive}
            individual={individual}
            onUpdateIndividual={onUpdateIndividual}
            closeDialog={close}
          />
        </DialogContent>
      </div>
    </Dialog>
  );
};
