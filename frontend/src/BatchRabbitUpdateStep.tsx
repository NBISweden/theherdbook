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
  onUpdateStatus?: (status: string) => void;
}

interface RabbitFilterResult {
  needUpdate: any[];
  canSkip: any[];
}

export const BatchRabbitUpdateStep: React.FC<BatchRabbitUpdateStepProps> = ({
  herdId,
  reportRoundId,
  reportYear,
  onUpdateStatus,
}) => {
  const [skipStep, setSkipStep] = useState(false);
  const [loading, setLoading] = useState(true);
  const [skippedRabbits, setSkippedRabbits] = useState<any[]>([]);
  const { userMessage } = useMessageContext();

  useEffect(() => {
    onUpdateStatus?.("pending");
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!herdId || !reportYear || !reportRoundId) {
        setLoading(false);
        return;
      }

      try {
        // Get report round dates
        const roundsResponse = await get("/api/manage/yearly_report_rounds");

        // Check if response is in the expected format
        const rounds = Array.isArray(roundsResponse)
          ? roundsResponse
          : roundsResponse.rounds || [];
        const reportRound = rounds.find(
          (round: any) =>
            round.id === reportRoundId || round.year === reportYear
        );

        if (!reportRound) {
          userMessage(
            `Kunde inte hitta rapporteringsomgång för år ${reportYear}`,
            "error"
          );
          setLoading(false);
          return;
        }
        const startDate = new Date(reportRound.start_date);
        const endDate = new Date(reportRound.end_date);
        const yearEndDate = new Date(`${reportYear}-12-31`);

        const herdResponse = await get(`/api/herd/${herdId}`);
        const individualsData = herdResponse.individuals || [];

        const isValidMeasurementDate = (date: string) => {
          const measurementDate = new Date(date);
          return measurementDate >= startDate && measurementDate <= endDate;
        };

        const hasValidWeightAndBodyfat = (rabbit: any) => {
          // Check if rabbit has weight in valid range
          const hasValidWeight = (rabbit.weights || []).some((w: any) =>
            isValidMeasurementDate(w.date)
          );

          // Check if rabbit has bodyfat in valid range
          const hasValidBodyfat = (rabbit.bodyfat || []).some((bf: any) =>
            isValidMeasurementDate(bf.date)
          );

          return hasValidWeight && hasValidBodyfat;
        };

        // Filter rabbits that need updates
        const filterRabbits = (
          individualsData: any[],
          reportDate: Date
        ): RabbitFilterResult => {
          // First filter rabbits with certificates that were alive during report period
          const rabbitsWithStatus = individualsData.filter(
            (individual: any) => {
              const hasCertificate =
                individual.certificate || individual.digital_certificate;

              // Check if rabbit was alive at year end
              const deathDate = individual.death_date
                ? new Date(individual.death_date)
                : null;
              const wasAliveAtYearEnd = !deathDate || deathDate > yearEndDate;

              return hasCertificate && wasAliveAtYearEnd;
            }
          );

          // Then check tracking and measurements
          return rabbitsWithStatus.reduce(
            (acc: RabbitFilterResult, rabbit: any) => {
              const sortedTrackings = [...(rabbit.herd_tracking || [])].sort(
                (a, b) =>
                  new Date(b.date).getTime() - new Date(a.date).getTime()
              );

              const latestTracking = sortedTrackings[0];
              const latestTrackingDate = latestTracking
                ? new Date(latestTracking.date)
                : null;

              // Convert dates to start of day for comparison
              const trackingDateStart = latestTrackingDate
                ? new Date(latestTrackingDate.setHours(0, 0, 0, 0))
                : null;
              const yearEndStart = new Date(yearEndDate);
              yearEndStart.setHours(0, 0, 0, 0);

              // Skip if has tracking on year end or later AND has valid measurements
              if (
                trackingDateStart && // Check if tracking date exists
                trackingDateStart >= yearEndStart &&
                hasValidWeightAndBodyfat(rabbit)
              ) {
                acc.canSkip.push({ ...rabbit, herd_tracking: sortedTrackings });
              } else {
                acc.needUpdate.push(rabbit);
              }
              return acc;
            },
            { canSkip: [], needUpdate: [] }
          );
        };

        const { needUpdate, canSkip } = filterRabbits(
          individualsData,
          yearEndDate
        );

        setSkippedRabbits(canSkip);

        if (needUpdate.length === 0) {
          setSkipStep(true);
          onUpdateStatus?.("completed");
        }
      } catch (error) {
        console.error(error);
        userMessage("Kunde inte hämta kanindata.", "error");
        onUpdateStatus?.("error");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [herdId, reportYear, reportRoundId]);

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
      onUpdateStatus={onUpdateStatus}
    />
  );
};
