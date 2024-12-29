// File: BatchRabbitUpdateStep.tsx

import React, { useState, useEffect } from "react";
import BatchRabbitUpdateForm from "./BatchRabbitUpdateForm";
import { get } from "@app/communication";
import { useMessageContext } from "@app/message_context";
import { Typography } from "@material-ui/core";
import {
  filterRabbitsForYearlyReport,
  Individual,
  isRabbitBornBeforeYearEnd,
  hasValidTrackingInPeriod,
  hasValidMeasurementsInPeriod,
  isRabbitAliveAtYearEnd,
} from "./utils/rabbit_filters";

interface BatchRabbitUpdateStepProps {
  herdId: string | null;
  reportRoundId?: number;
  reportYear?: number;
  onUpdateStatus?: (status: string) => void;
}

export const BatchRabbitUpdateStep: React.FC<BatchRabbitUpdateStepProps> = ({
  herdId,
  reportRoundId,
  reportYear,
  onUpdateStatus,
}) => {
  const [skipStep, setSkipStep] = useState(false);
  const [loading, setLoading] = useState(true);
  const [skippedRabbits, setSkippedRabbits] = useState<Individual[]>([]);
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
        const startDate = new Date(`${reportYear}-12-01`);
        const endDate = new Date(reportRound.end_date);

        // Debug logging for report period
        console.log("Report period:", {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          reportRound,
        });

        const herdResponse = await get(`/api/herd/${herdId}`);
        const individualsData = herdResponse.individuals || [];

        // Filter rabbits using the shared filtering logic
        const { needUpdate, canSkip } = filterRabbitsForYearlyReport(
          individualsData,
          reportYear,
          startDate,
          endDate
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
          {skippedRabbits.map((rabbit) => {
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
