// File: BatchRabbitUpdateStep.tsx

import React, { useState, useEffect } from "react";
import BatchRabbitUpdateForm from "./BatchRabbitUpdateForm";
import { get } from "@app/communication";
import { useMessageContext } from "@app/message_context";
import { Typography } from "@material-ui/core";
import {
  filterRabbitsForYearlyReport,
  Individual,
} from "./utils/rabbit_filters";

interface Weight {
  date: string;
  weight: number;
}

interface Bodyfat {
  date: string;
  bodyfat: string;
}

// Component to render the list of rabbits with their measurements
export const RabbitList: React.FC<{
  rabbits: Individual[];
  reportYear: number;
}> = ({ rabbits, reportYear }) => {
  const startDate = new Date(`${reportYear}-12-01`);
  const endDate = new Date(`${reportYear}-12-31`);

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
        {rabbits.map((rabbit) => {
          // Get the most recent tracking date that's not in the future
          const latestTracking = rabbit.herd_tracking
            .filter((tracking) => new Date(tracking.date) <= new Date())
            .sort(
              (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
            )[0];

          // Get measurements for the report year
          const periodWeight = rabbit.weights?.find((w) => {
            const wDate = new Date(w.date);
            return wDate >= startDate && wDate <= endDate;
          }) as Weight | undefined;

          const periodBodyfat = rabbit.bodyfat?.find((bf) => {
            const bfDate = new Date(bf.date);
            return bfDate >= startDate && bfDate <= endDate;
          }) as Bodyfat | undefined;

          const measurements = [];
          if (periodWeight) {
            measurements.push(
              `Vikt: ${periodWeight.weight}kg (${new Date(
                periodWeight.date
              ).toLocaleDateString("sv-SE")})`
            );
          }
          if (periodBodyfat) {
            measurements.push(
              `Hull: ${periodBodyfat.bodyfat} (${new Date(
                periodBodyfat.date
              ).toLocaleDateString("sv-SE")})`
            );
          }

          return (
            <li key={rabbit.id}>
              {rabbit.name} {rabbit.number} - Levande i besättningen:{" "}
              {new Date(latestTracking.date).toLocaleDateString("sv-SE")}
              {measurements.length > 0 && (
                <div
                  style={{
                    marginLeft: "1em",
                    fontSize: "0.9em",
                    color: "#666",
                  }}
                >
                  {measurements.join(", ")}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};

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

  // Add a function to fetch all rabbits with valid measurements
  const fetchValidRabbits = async (
    herdId: string,
    reportYear: number,
    reportRoundId: number
  ) => {
    try {
      const roundsResponse = await get("/api/manage/yearly_report_rounds");
      const rounds = Array.isArray(roundsResponse)
        ? roundsResponse
        : roundsResponse.rounds || [];
      const reportRound = rounds.find(
        (round: any) => round.id === reportRoundId || round.year === reportYear
      );

      if (!reportRound) {
        userMessage(
          `Kunde inte hitta rapporteringsomgång för år ${reportYear}`,
          "error"
        );
        return;
      }

      const startDate = new Date(`${reportYear}-12-01`);
      const endDate = new Date(reportRound.end_date);

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
    }
  };

  useEffect(() => {
    onUpdateStatus?.("pending");
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!herdId || !reportYear || !reportRoundId) {
        setLoading(false);
        return;
      }

      await fetchValidRabbits(herdId, reportYear, reportRoundId);
      setLoading(false);
    };
    fetchData();
  }, [herdId, reportYear, reportRoundId]);

  if (loading) {
    return <div>Laddar...</div>;
  }

  if (skipStep && reportYear) {
    return <RabbitList rabbits={skippedRabbits} reportYear={reportYear} />;
  }

  return (
    <BatchRabbitUpdateForm
      herdId={herdId!}
      reportYear={reportYear}
      reportRoundId={reportRoundId}
      onUpdateStatus={onUpdateStatus}
      onUpdateComplete={() => {
        if (herdId && reportYear && reportRoundId) {
          fetchValidRabbits(herdId, reportYear, reportRoundId);
        }
      }}
    />
  );
};
