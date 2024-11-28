// File: YearlyReportStep.tsx

import React, { useState, useEffect } from "react";
import { Typography } from "@material-ui/core";
import YearlyReportForm from "./YearlyReportForm";
import { get } from "@app/communication";
import { useMessageContext } from "@app/message_context";

interface YearlyReportStepProps {
  herdId: string | null;
}

export const YearlyReportStep: React.FC<YearlyReportStepProps> = ({
  herdId,
}) => {
  const [existingReportData, setExistingReportData] = useState<any>(null);
  const { userMessage } = useMessageContext();

  useEffect(() => {
    const checkReport = async () => {
      if (!herdId) return;

      try {
        const response = await get(`/api/herd/${herdId}/yearlyreport`);
        if (response.status === "success" && response.report) {
          setExistingReportData(response.report.data);
        }
      } catch (error) {
        if (error.response && error.response.status === 404) {
          // No report found
          setExistingReportData(null);
        } else {
          console.error(error);
          userMessage("Kunde inte kontrollera årsrapporten.", "error");
        }
      }
    };
    checkReport();
  }, [herdId]);

  return (
    <div>
      {existingReportData && (
        <Typography>
          Årsrapporten har redan lämnats in. Du kan uppdatera den nedan.
        </Typography>
      )}
      <YearlyReportForm
        herdId={herdId!}
        existingReportData={existingReportData}
      />
    </div>
  );
};
