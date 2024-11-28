// File: BatchRabbitUpdateStep.tsx

import React, { useState, useEffect } from "react";
import BatchRabbitUpdateForm from "./BatchRabbitUpdateForm";
import { get } from "@app/communication";
import { useMessageContext } from "@app/message_context";
import { Typography } from "@material-ui/core";

interface BatchRabbitUpdateStepProps {
  herdId: string | null;
}

export const BatchRabbitUpdateStep: React.FC<BatchRabbitUpdateStepProps> = ({
  herdId,
}) => {
  const [skipStep, setSkipStep] = useState(false);
  const [loading, setLoading] = useState(true);
  const { userMessage } = useMessageContext();

  useEffect(() => {
    // Fetch rabbit data and determine if we need to skip this step
    const fetchData = async () => {
      if (!herdId) {
        setLoading(false);
        return;
      }
      try {
        const herdResponse = await get(`/api/herd/${herdId}`);
        const individualsData = herdResponse.individuals || [];

        const rabbitsNeedingUpdate = individualsData.filter(
          (individual: any) => {
            const isAlive = individual.alive === true;

            const hasCertificate =
              individual.certificate || individual.digital_certificate;

            const currentYear = new Date().getFullYear();

            // Check if there is a herd_tracking entry for the current year
            const herdTrackingThisYear =
              individual.herd_tracking?.some((entry: any) => {
                if (entry.date) {
                  const trackingDate = new Date(entry.date);
                  return trackingDate.getFullYear() === currentYear;
                }
                return false;
              }) || false;

            // Check if there's a weight entry this year
            const weightThisYear =
              individual.weights?.some((weightEntry: any) => {
                if (weightEntry.date) {
                  const weightDate = new Date(weightEntry.date);
                  return weightDate.getFullYear() === currentYear;
                }
                return false;
              }) || false;

            // Check if there's a body fat entry this year
            const bodyFatThisYear =
              individual.bodyfat?.some((bodyFatEntry: any) => {
                if (bodyFatEntry.date) {
                  const bodyFatDate = new Date(bodyFatEntry.date);
                  return bodyFatDate.getFullYear() === currentYear;
                }
                return false;
              }) || false;

            // Determine if the rabbit needs an update
            const needsUpdate =
              isAlive &&
              hasCertificate &&
              (!herdTrackingThisYear || !weightThisYear || !bodyFatThisYear);

            return needsUpdate;
          }
        );

        console.log("needs", rabbitsNeedingUpdate);

        if (rabbitsNeedingUpdate.length === 0) {
          // All rabbits are recently updated, skip this step
          setSkipStep(true);
        }
      } catch (error) {
        console.error(error);
        userMessage("Kunde inte hämta kanindata.", "error");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [herdId]);

  if (loading) {
    return <div>Laddar...</div>;
  }

  if (skipStep) {
    return (
      <Typography>
        Alla kaniner har redan uppdaterad information. Detta steg kan hoppas
        över.
      </Typography>
    );
  }

  return <BatchRabbitUpdateForm herdId={herdId!} />;
};
