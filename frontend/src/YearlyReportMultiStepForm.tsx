import React, { useState, useEffect } from "react";
import {
  Stepper,
  Step,
  StepLabel,
  Button,
  Paper,
  Typography,
} from "@material-ui/core";
import { useUserContext } from "@app/user_context";
import { useMessageContext } from "@app/message_context";
import { useDataContext } from "@app/data_context";
import { get } from "@app/communication";

// Import your existing components
import { SelectGenebankStep } from "./SelectGenebankStep";
import { SelectHerdStep } from "./SelectHerdStep";
import { HerdContactUpdateStep } from "./HerdContactUpdateStep";
import { BatchRabbitUpdateStep } from "./BatchRabbitUpdateStep";
import { YearlyReportStep } from "./YearlyReportStep";
import { ExtendedBreeding } from "./data_context_global";

interface YearlyReportMultiStepFormProps {
  reportRoundId?: number;
  reportYear?: number;
}

const YearlyReportMultiStepForm: React.FC<YearlyReportMultiStepFormProps> = ({
  reportRoundId,
  reportYear,
}) => {
  const { user } = useUserContext();
  const { userMessage } = useMessageContext();
  const { loadData, genebanks } = useDataContext();

  const [activeStep, setActiveStep] = useState(0);
  const [genebankName, setGenebankName] = useState<string | null>(null);
  const [herdId, setHerdId] = useState<string | null>(null);
  const [herdData, setHerdData] = useState<any>(null);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [extendedBreedings, setExtendedBreedings] = React.useState(
    [] as ExtendedBreeding[]
  );

  const isManagerOrAdmin =
    user?.is_admin || (user?.is_manager ? user.is_manager.length > 0 : false);

  const steps = isManagerOrAdmin
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
      ];

  useEffect(() => {
    // For regular users with one herd
    if (!isManagerOrAdmin && user?.is_owner && user.is_owner.length === 1) {
      setHerdId(user.is_owner[0]);
    }
  }, [user]);

  useEffect(() => {
    if (herdId) {
      get(`/api/herd/${herdId}`).then(
        (data) => {
          setHerdData(data);
          // Check if the yearly report has already been submitted
          if (data.yearlyReportSubmitted) {
            setReportSubmitted(true);
          } else {
            setReportSubmitted(false);
          }
        },
        (error) => {
          console.error(error);
          userMessage("Kunde inte hämta besättningsdata.", "error");
        }
      );
      get(`/api/breeding/${herdId}`).then(
        (data: { breedings: ExtendedBreeding[] }) => {
          if (data && data.breedings) {
            setExtendedBreedings(data.breedings);
          }
        },
        (error) => {
          console.error(error);
          userMessage(error, "error");
        }
      );
    }
  }, [herdId]);

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
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleReset = () => {
    setActiveStep(0);
    setGenebankName(null);
    setHerdId(null);
    setHerdData(null);
    setReportSubmitted(false);
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
            />
          );
        case 1:
          return (
            <SelectHerdStep
              user={user}
              genebankName={genebankName}
              herdId={herdId}
              setHerdId={setHerdId}
            />
          );
        case 2:
          return (
            <HerdContactUpdateStep
              herdData={herdData}
              herdId={herdId}
              loadData={loadData}
            />
          );
        case 3:
          return <BatchRabbitUpdateStep herdId={herdId} />;
        case 4:
          return <YearlyReportStep herdId={herdId} />;
        default:
          return "Okänt steg";
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
            />
          );
        case 1:
          return (
            <HerdContactUpdateStep
              herdData={herdData}
              herdId={herdId}
              loadData={loadData}
            />
          );
        case 2:
          return <BatchRabbitUpdateStep herdId={herdId} />;
        case 3:
          return <YearlyReportStep herdId={herdId} />;
        default:
          return "Okänt steg";
      }
    }
  };

  return (
    <Paper style={{ padding: "2em" }}>
      <Typography variant="h5" gutterBottom>
        Årsrapportering för år {reportYear}
      </Typography>
      <Typography variant="body1" gutterBottom>
        Besättning G1832 är vald.
      </Typography>

      <Typography variant="body2" gutterBottom>
        Årsrapportens autmatik bygger på att du har rapporterat alla kullar
        redan under din besättning (url /owner) sedan tabben "Kullar och
        Parningar" du behöver lägga till minst födelsedatum, Kullstorlek ,
        levane efter 6 veckor . Du behöver inte skapa oregisterade kaniner om du
        inte vill. Har du registrerat och skapat intyg från minst en kanin från
        varje kull så behöver du inte göra något mera.
      </Typography>
      {extendedBreedings && extendedBreedings.length > 0 && (
        <Typography variant="body2" gutterBottom>
          {extendedBreedings.map((breeding) => (
            <div key={breeding.id}>
              {breeding.birth_date} - {breeding.mother_name} -{" "}
              {breeding.father_name} - {breeding.litter_size} -{" "}
              {breeding.litter_size6w}
            </div>
          ))}
        </Typography>
      )}
      <Stepper activeStep={activeStep}>
        {steps.map((label, index) => {
          const stepProps: { completed?: boolean } = {};
          if (reportSubmitted && index < steps.length - 1) {
            stepProps.completed = true;
          }
          return (
            <Step key={label} {...stepProps}>
              <StepLabel>{label}</StepLabel>
            </Step>
          );
        })}
      </Stepper>
      <div>
        {activeStep === steps.length ? (
          <div>
            <Typography>Årsrapporten är klar!</Typography>
            <Button onClick={handleReset}>Börja om</Button>
          </div>
        ) : (
          <div>
            {getStepContent(activeStep)}
            <div style={{ marginTop: "1em" }}>
              {activeStep !== 0 && (
                <Button onClick={handleBack}>Tillbaka</Button>
              )}
              <Button
                variant="contained"
                color="primary"
                onClick={handleNext}
                style={{ marginLeft: "1em" }}
              >
                {activeStep === steps.length - 1 ? "Slutför" : "Nästa"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </Paper>
  );
};

export default YearlyReportMultiStepForm;
