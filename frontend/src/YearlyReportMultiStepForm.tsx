import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Stepper,
  Step,
  StepLabel,
  Button,
  Paper,
  Typography,
} from "@material-ui/core";
import { useUserContext, UserState } from "@app/user_context";
import { useMessageContext } from "@app/message_context";
import { useDataContext } from "@app/data_context";
import { get } from "@app/communication";

// Import your existing components
import { SelectGenebankStep } from "./SelectGenebankStep";
import { SelectHerdStep } from "./SelectHerdStep";
import { HerdContactUpdateStep } from "./HerdContactUpdateStep";
import { BatchRabbitUpdateStep } from "./BatchRabbitUpdateStep";
import { YearlyReportStep } from "./YearlyReportStep";

interface StepStatus {
  genebank: string;
  herd: string;
  herdContact: string;
  batchUpdate: string;
  yearlyReport: string;
}

interface Props {
  reportRoundId?: number;
  reportYear?: number;
  onComplete?: () => void;
}

const YearlyReportMultiStepForm: React.FC<Props> = ({
  reportRoundId,
  reportYear,
  onComplete,
}) => {
  const { user } = useUserContext();
  const { userMessage } = useMessageContext();
  const { loadData } = useDataContext();

  const [activeStep, setActiveStep] = useState(0);
  const [genebankName, setGenebankName] = useState<string | null>(null);
  const [herdId, setHerdId] = useState<string | null>(null);
  const [herdData, setHerdData] = useState<any>(null);
  const [selectedHerd, setSelectedHerd] = useState<string | null>(null);
  const [selectedGenebank, setSelectedGenebank] = useState<number | null>(null);
  const [canProceed, setCanProceed] = useState(true);
  const formRef = useRef<{ submitForm: () => Promise<boolean> }>(null);
  const yearlyReportRef = useRef<{ submitForm: () => Promise<boolean> }>(null);

  const [stepStatus, setStepStatus] = useState<StepStatus>({
    genebank: "not_started",
    herd: "not_started",
    herdContact: "not_started",
    batchUpdate: "not_started",
    yearlyReport: "not_started",
  });

  const { isManagerOrAdmin, isHerdContactUpdateStep } = useMemo(() => {
    const isAdmin =
      user?.is_admin || (user?.is_manager ? user.is_manager.length > 0 : false);
    return {
      isManagerOrAdmin: isAdmin,
      isHerdContactUpdateStep: isAdmin ? activeStep === 2 : activeStep === 1,
    };
  }, [user, activeStep]);

  const steps = useMemo(
    () =>
      isManagerOrAdmin
        ? [
            "Välj Genbank",
            "Välj Besättning",
            "Uppdatera Kontaktinformation",
            "Uppdatera Kaniner",
            "Årsrapport",
          ]
        : [
            "Välj Besättning",
            "Uppdatera Kontaktinformation",
            "Uppdatera Kaniner",
            "Årsrapport",
          ],
    [isManagerOrAdmin]
  );

  useEffect(() => {
    // Update canProceed based on step status
    const currentStep = isManagerOrAdmin ? activeStep : activeStep + 1;
    switch (currentStep) {
      case 0:
        setCanProceed(stepStatus.genebank === "completed" || !isManagerOrAdmin);
        break;
      case 1:
        setCanProceed(stepStatus.herd === "completed");
        break;
      case 2:
        setCanProceed(
          stepStatus.herdContact === "completed" ||
            stepStatus.herdContact === "skipped"
        );
        break;
      case 3:
        setCanProceed(stepStatus.batchUpdate === "completed");
        break;
      case 4:
        // For the final step, we should allow proceeding if we've reached this step
        setCanProceed(true);
        break;
      default:
        setCanProceed(true);
    }
  }, [activeStep, stepStatus, isManagerOrAdmin]);

  const handleNext = () => {
    // Validation before moving to next step
    if (isManagerOrAdmin) {
      if (activeStep === 0 && !genebankName) {
        userMessage("Vänligen välj en genbank.", "warning");
        return;
      }
      if (activeStep === 1 && !herdId) {
        userMessage("Vänligen välj en besättning.", "warning");
        return;
      }
    } else {
      if (activeStep === 0 && !herdId) {
        userMessage("Vänligen välj en besättning.", "warning");
        return;
      }
    }
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    // If going back to herd selection step, reset herd-related state
    if (
      (isManagerOrAdmin && activeStep === 2) ||
      (!isManagerOrAdmin && activeStep === 1)
    ) {
      setHerdId(null);
      setHerdData(null);
      // Reset step status for steps that depend on herd
      setStepStatus((prev) => ({
        ...prev,
        herdContact: "not_started",
        batchUpdate: "not_started",
        yearlyReport: "not_started",
      }));
      // Force reload of herd data
      loadData(["herds"]);
    }
    // If going back to genebank selection (for admin/manager), reset genebank-related state
    if (isManagerOrAdmin && activeStep === 1) {
      setGenebankName(null);
      setHerdId(null);
      setHerdData(null);
      // Reset step status as we're starting over
      setStepStatus((prev) => ({
        ...prev,
        herdContact: "not_started",
        batchUpdate: "not_started",
        yearlyReport: "not_started",
      }));
      // Force reload of genebank data
      loadData(["genebanks"]);
    }
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleStepStatus = (step: keyof StepStatus, status: string) => {
    setStepStatus((prev) => ({
      ...prev,
      [step]: status,
    }));
  };

  const handleSubmitReport = async () => {
    if (yearlyReportRef.current) {
      try {
        const success = await yearlyReportRef.current.submitForm();
        if (success) {
          // Update step status first
          handleStepStatus("yearlyReport", "completed");
          // Show success message
          userMessage("Årsrapporten har skickats in", "success");
          // Move to completion step
          setActiveStep(steps.length);
          // Call onComplete callback if provided
          if (onComplete) {
            onComplete();
          }
          return true;
        } else {
          userMessage("Kunde inte skicka in årsrapporten", "error");
          return false;
        }
      } catch (error) {
        console.error("Error submitting report:", error);
        userMessage(
          "Ett fel uppstod när årsrapporten skulle skickas in",
          "error"
        );
        return false;
      }
    }
    return false;
  };

  const handleReset = () => {
    setActiveStep(0);
    setGenebankName(null);
    setHerdId(null);
    setHerdData(null);
    setSelectedHerd(null);
    setSelectedGenebank(null);
    setStepStatus({
      genebank: "not_started",
      herd: "not_started",
      herdContact: "not_started",
      batchUpdate: "not_started",
      yearlyReport: "not_started",
    });
  };

  const getStepContent = (step: number) => {
    if (isManagerOrAdmin) {
      switch (step) {
        case 0:
          return (
            <SelectGenebankStep
              user={user}
              genebankName={genebankName}
              setGenebankName={setGenebankName}
              onUpdateStatus={(status) => handleStepStatus("genebank", status)}
            />
          );
        case 1:
          return (
            <SelectHerdStep
              user={user}
              genebankName={genebankName}
              herdId={herdId}
              setHerdId={setHerdId}
              reportYear={reportYear}
              onUpdateStatus={(status) => handleStepStatus("herd", status)}
            />
          );
        case 2:
          return (
            <HerdContactUpdateStep
              herdData={herdData}
              herdId={herdId}
              loadData={loadData}
              onUpdateStatus={(status) =>
                handleStepStatus("herdContact", status)
              }
            />
          );
        case 3:
          return (
            <BatchRabbitUpdateStep
              herdId={herdId}
              reportYear={reportYear}
              reportRoundId={reportRoundId}
              onUpdateStatus={(status) =>
                handleStepStatus("batchUpdate", status)
              }
            />
          );
        case 4:
          return (
            <YearlyReportStep
              herdId={herdId}
              reportRoundId={reportRoundId}
              reportYear={reportYear}
              onUpdateStatus={(status) =>
                handleStepStatus("yearlyReport", status)
              }
              formRef={yearlyReportRef}
            />
          );
        default:
          return <div>Okänt steg</div>;
      }
    } else {
      switch (step) {
        case 0:
          return (
            <SelectHerdStep
              user={user}
              genebankName={genebankName}
              herdId={herdId}
              setHerdId={setHerdId}
              reportYear={reportYear}
              onUpdateStatus={(status) => handleStepStatus("herd", status)}
            />
          );
        case 1:
          return (
            <HerdContactUpdateStep
              herdData={herdData}
              herdId={herdId}
              loadData={loadData}
              onUpdateStatus={(status) =>
                handleStepStatus("herdContact", status)
              }
            />
          );
        case 2:
          return (
            <BatchRabbitUpdateStep
              herdId={herdId}
              reportYear={reportYear}
              reportRoundId={reportRoundId}
              onUpdateStatus={(status) =>
                handleStepStatus("batchUpdate", status)
              }
            />
          );
        case 3:
          return (
            <YearlyReportStep
              herdId={herdId}
              reportRoundId={reportRoundId}
              reportYear={reportYear}
              onUpdateStatus={(status) =>
                handleStepStatus("yearlyReport", status)
              }
              formRef={yearlyReportRef}
            />
          );
        default:
          return <div>Okänt steg</div>;
      }
    }
  };

  return (
    <Paper style={{ padding: "2em" }}>
      <Typography variant="h5" gutterBottom>
        Årsrapportering för år {reportYear}
      </Typography>
      <Stepper activeStep={activeStep} alternativeLabel>
        {steps.map((label, index) => (
          <Step key={label}>
            <StepLabel>{activeStep === steps.length ? "" : label}</StepLabel>
          </Step>
        ))}
      </Stepper>
      {activeStep === steps.length ? (
        // Completion step
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <Typography variant="h5" gutterBottom>
            Årsrapporten har skickats in
          </Typography>
          <Typography variant="body1" paragraph>
            Tack för din årsrapport. Du kan nu stänga denna sida eller starta en
            ny rapport.
          </Typography>
          <Button variant="contained" color="primary" onClick={handleReset}>
            Starta ny rapport
          </Button>
        </div>
      ) : (
        // Regular steps
        <div>
          {getStepContent(activeStep)}
          <div
            style={{
              marginTop: "20px",
              display: "flex",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <Button disabled={activeStep === 0} onClick={handleBack}>
              Tillbaka
            </Button>
            {isHerdContactUpdateStep && (
              <Button variant="outlined" onClick={handleNext}>
                Hoppa över
              </Button>
            )}
            {activeStep === steps.length - 1 ? (
              <Button
                variant="contained"
                color="primary"
                onClick={handleSubmitReport}
                disabled={!canProceed}
              >
                Skicka in årsrapport
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                onClick={handleNext}
                disabled={!canProceed}
              >
                Nästa
              </Button>
            )}
          </div>
        </div>
      )}
    </Paper>
  );
};

export default YearlyReportMultiStepForm;
