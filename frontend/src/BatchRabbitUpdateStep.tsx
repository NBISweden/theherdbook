// File: BatchRabbitUpdateStep.tsx

import React, { useState, useEffect } from "react";
import BatchRabbitUpdateForm from "./BatchRabbitUpdateForm";
import { get } from "@app/communication";
import { useMessageContext } from "@app/message_context";
import { Typography } from "@material-ui/core";

interface BatchRabbitUpdateStepProps {
  herdId: string | null;
  reportRoundId?: number;
  reportYear?: number;
}

export const BatchRabbitUpdateStep: React.FC<BatchRabbitUpdateStepProps> = ({
  herdId,
  reportRoundId,
  reportYear,
}) => {
  const [skipStep, setSkipStep] = useState(false);
  const [loading, setLoading] = useState(true);
  const [skippedRabbits, setSkippedRabbits] = useState<any[]>([]);
  const { userMessage } = useMessageContext();

  useEffect(() => {
    const fetchData = async () => {
      if (!herdId || !reportYear) {
        setLoading(false);
        return;
      }

      try {
        const herdResponse = await get(`/api/herd/${herdId}`);
        const individualsData = herdResponse.individuals || [];
        const yearEndDate = `${reportYear}-12-31`;

        const rabbitsWithStatus = individualsData.filter((individual: any) => {
          const isAlive = individual.alive === true;
          const hasCertificate =
            individual.certificate || individual.digital_certificate;
          return isAlive && hasCertificate;
        });

        // Separate rabbits into those needing update and those that can be skipped
        const { needUpdate, canSkip } = rabbitsWithStatus.reduce(
          (acc: { needUpdate: any[]; canSkip: any[] }, rabbit: any) => {
            // Sort herd_tracking entries by date in descending order
            const sortedTrackings = [...(rabbit.herd_tracking || [])].sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            );

            // Get the latest tracking date
            const latestTracking = sortedTrackings[0];
            const latestTrackingDate = latestTracking
              ? new Date(latestTracking.date)
              : null;
            const endDate = new Date(yearEndDate);

            if (latestTrackingDate && latestTrackingDate >= endDate) {
              // Add the sorted tracking dates to the rabbit object for display
              acc.canSkip.push({
                ...rabbit,
                herd_tracking: sortedTrackings,
              });
            } else {
              acc.needUpdate.push(rabbit);
            }
            return acc;
          },
          { needUpdate: [], canSkip: [] }
        );

        setSkippedRabbits(canSkip);

        if (needUpdate.length === 0) {
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
  }, [herdId, reportYear]);

  if (loading) {
    return <div>Laddar...</div>;
  }

  if (skipStep) {
    return (
      <div>
        <Typography>
          Alla kaniner har redan uppdaterad information. Detta steg kan hoppas
          över.
        </Typography>
        <Typography variant="h6" style={{ marginTop: "1em" }}>
          Följande kaniner kommer att inkluderas i årsrapporten:
        </Typography>
        <ul>
          {skippedRabbits.map((rabbit: any) => {
            const latestTracking = rabbit.herd_tracking[0]; // Already sorted in descending order
            return (
              <li key={rabbit.id}>
                {rabbit.name} {rabbit.number} - Senaste uppdatering:{" "}
                {new Date(latestTracking.date).toLocaleDateString("sv-SE")}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <BatchRabbitUpdateForm
      herdId={herdId!}
      reportYear={reportYear}
      reportRoundId={reportRoundId}
    />
  );
};
