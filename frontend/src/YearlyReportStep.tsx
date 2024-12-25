// File: YearlyReportStep.tsx

import React, { useState, useEffect } from "react";
import { Typography } from "@material-ui/core";
import YearlyReportForm from "./YearlyReportForm";
import { get } from "@app/communication";
import { useMessageContext } from "@app/message_context";

interface YearlyReportStepProps {
  herdId: string | null;
  reportRoundId?: number;
  reportYear?: number;
}

export const YearlyReportStep: React.FC<YearlyReportStepProps> = ({
  herdId,
  reportRoundId,
  reportYear,
}) => {
  const [existingReportData, setExistingReportData] = useState<any>(null);
  const { userMessage } = useMessageContext();

  useEffect(() => {
    const checkReport = async () => {
      if (!herdId || !reportRoundId) return;

      try {
        const response = await get(
          `/api/herd/${herdId}/yearlyreport?round_id=${reportRoundId}`
        );
        if (response.status === "success" && response.report) {
          setExistingReportData(response.report.data);
        }
      } catch (error: unknown) {
        if (
          error &&
          typeof error === "object" &&
          "response" in error &&
          (error.response as { status?: number })?.status === 404
        ) {
          // No report found for this round
          setExistingReportData(null);
        } else {
          console.error(error);
          userMessage("Kunde inte kontrollera årsrapporten.", "error");
        }
      }
    };
    checkReport();
  }, [herdId, reportRoundId]);

  return (
    <div>
      {existingReportData && (
        <Typography>
          Årsrapporten har redan lämnats in för denna rapporteringsomgång. Du
          kan uppdatera den nedan.
        </Typography>
      )}
      <YearlyReportForm
        herdId={herdId!}
        existingReportData={existingReportData}
        reportRoundId={reportRoundId}
        reportYear={reportYear}
      />
    </div>
  );
};
