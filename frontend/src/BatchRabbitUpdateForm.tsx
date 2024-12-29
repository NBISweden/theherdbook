import React, { useEffect, useState } from "react";
import {
  Button,
  Checkbox,
  FormControlLabel,
  TextField,
  Typography,
  Paper,
  Grid,
  makeStyles,
  RadioGroup,
  FormControl,
  FormLabel,
  Radio,
} from "@material-ui/core";
import {
  KeyboardDatePicker,
  MuiPickersUtilsProvider,
} from "@material-ui/pickers";
import { get, patch } from "./communication"; // Adjust import paths as necessary
import { useMessageContext } from "./message_context";
import { useDataContext } from "./data_context";
import DateFnsUtils from "@date-io/date-fns";
import svLocale from "date-fns/locale/sv"; // Swedish locale
import { dateFormat, inputVariant, BodyFat } from "@app/data_context_global";
import {
  filterRabbitsForYearlyReport,
  Individual,
} from "./utils/rabbit_filters";

const useStyles = makeStyles({
  container: {
    padding: "2em",
  },
  formContainer: {
    marginBottom: "2em",
  },
  rabbitRow: {
    padding: "1em",
    borderBottom: "1px solid #ccc",
  },
  submitButton: {
    marginTop: "1em",
  },
  datePicker: {
    maxWidth: "25em",
  },
  wideControl: {
    margin: "5px 0",
    minWidth: "195px",
    width: "100%",
    paddingRight: "5px",
  },
});

interface RabbitData {
  individual: Individual;
  isAlive: boolean;
  reportDate: Date | null;
  weight: string;
  weightDate: Date | null;
  bodyFat: string;
  bodyFatDate: Date | null;
  deathDate: Date | null;
  butchered: boolean;
  deathNote: string;
}

interface BatchRabbitUpdateFormProps {
  herdId: string;
  reportYear?: number;
  reportRoundId?: number;
  onUpdateStatus?: (status: string) => void;
  onUpdateComplete?: () => void;
}

const BatchRabbitUpdateForm: React.FC<BatchRabbitUpdateFormProps> = ({
  herdId,
  reportYear,
  reportRoundId,
  onUpdateStatus,
  onUpdateComplete,
}): React.ReactElement => {
  const classes = useStyles();
  const [rabbits, setRabbits] = useState<RabbitData[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const { userMessage } = useMessageContext();
  const { loadData } = useDataContext();

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

        const herdResponse = await get(`/api/herd/${herdId}`);
        const individualsData = herdResponse.individuals || [];

        const { needUpdate } = filterRabbitsForYearlyReport(
          individualsData as Individual[],
          reportYear,
          startDate,
          endDate
        );

        // Initialize rabbit data for those needing updates
        const rabbitDataList: RabbitData[] = needUpdate.map(
          (individual: Individual) => ({
            individual,
            isAlive: true,
            reportDate: new Date(`${reportYear}-12-31`),
            weight: "",
            weightDate: new Date(`${reportYear}-12-31`),
            bodyFat: "normal",
            bodyFatDate: new Date(`${reportYear}-12-31`),
            deathDate: null,
            butchered: false,
            deathNote: "",
          })
        );

        setRabbits(rabbitDataList);
        setLoading(false);
      } catch (error) {
        console.error(error);
        userMessage("Kunde inte hämta kanindata.", "error");
        setLoading(false);
      }
    };
    fetchData();
  }, [herdId, reportYear, reportRoundId]);

  const handleSubmit = async () => {
    // Validation
    const errors = [];
    for (const rabbit of rabbits) {
      if (rabbit.isAlive && !rabbit.reportDate) {
        errors.push(
          `Ange ett rapportdatum för kaninen ${rabbit.individual.name} ${rabbit.individual.number}.`
        );
      }
      if (!rabbit.isAlive && !rabbit.deathDate) {
        errors.push(
          `Ange ett dödsdatum för kaninen ${rabbit.individual.name} ${rabbit.individual.number}.`
        );
      }
    }
    if (errors.length > 0) {
      userMessage(errors.join("\n"), "warning");
      return;
    }

    try {
      // Update each rabbit individually
      for (const rabbit of rabbits) {
        const updateData: any = {
          id: rabbit.individual.id,
          number: rabbit.individual.number,
          herd: rabbit.individual.herd,
        };

        if (rabbit.isAlive) {
          // Check if we have tracking on or after report date
          const latestTracking = rabbit.individual.herd_tracking?.[0];
          const hasValidTracking =
            latestTracking &&
            new Date(latestTracking.date) >= new Date(rabbit.reportDate || "");

          // Only include yearly_report_date if no valid tracking exists
          if (rabbit.reportDate && !hasValidTracking) {
            updateData.yearly_report_date = rabbit.reportDate
              .toISOString()
              .split("T")[0];
          }

          // Update weight if provided
          if (rabbit.weight && rabbit.weightDate) {
            updateData.weights = [
              ...(rabbit.individual.weights || []),
              {
                date: rabbit.weightDate.toISOString().split("T")[0],
                weight: parseFloat(rabbit.weight.replace(",", ".")),
              },
            ];
          }

          // Update body fat if provided
          if (rabbit.bodyFat && rabbit.bodyFatDate) {
            updateData.bodyfat = [
              ...(rabbit.individual.bodyfat || []),
              {
                date: rabbit.bodyFatDate.toISOString().split("T")[0],
                bodyfat: rabbit.bodyFat as BodyFat,
              },
            ];
          }
        } else {
          // Mark the rabbit as dead
          if (rabbit.deathDate) {
            updateData.death_date = rabbit.deathDate
              .toISOString()
              .split("T")[0];
          } else {
            continue; // If death date is missing, skip this rabbit
          }
          updateData.butchered = rabbit.butchered;
          updateData.death_note = rabbit.deathNote;
        }

        const response = await patch("/api/individual", updateData);
        if (response.status !== "success") {
          throw new Error(
            `Failed to update rabbit ${rabbit.individual.number}`
          );
        }
      }

      userMessage("Kaniner uppdaterades framgångsrikt.", "success");
      loadData(["genebanks"]); // Reload data if needed
      setIsCompleted(true);
      onUpdateStatus?.("completed");
      onUpdateComplete?.();
    } catch (error) {
      console.error(error);
      userMessage("Ett fel inträffade vid uppdatering av kaninerna.", "error");
      onUpdateStatus?.("error");
    }
  };

  if (loading) {
    return <div>Laddar...</div>;
  }

  if (isCompleted) {
    return (
      <div>
        <Typography>Alla kaniner har uppdaterad information.</Typography>
        <Typography variant="h6" style={{ marginTop: "1em" }}>
          Följande kaniner kommer att inkluderas i årsrapporten:
        </Typography>
        <ul>
          {rabbits.map((rabbit) => (
            <li key={rabbit.individual.id}>
              {rabbit.individual.name} {rabbit.individual.number} - Senaste
              uppdatering: {rabbit.reportDate?.toLocaleDateString("sv-SE")}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <Paper className={classes.container}>
      <Typography variant="h5" gutterBottom>
        Årsuppdatering av Kaniner
      </Typography>
      <MuiPickersUtilsProvider utils={DateFnsUtils} locale={svLocale}>
        <div className={classes.formContainer}>
          {rabbits.map((rabbit, index) => (
            <Grid
              container
              spacing={2}
              key={rabbit.individual.id}
              className={classes.rabbitRow}
            >
              <Grid item xs={12}>
                <Typography variant="h6">
                  {rabbit.individual.name} {rabbit.individual.number}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={rabbit.isAlive}
                      onChange={(e) => {
                        const updatedRabbits = [...rabbits];
                        updatedRabbits[index].isAlive = e.target.checked;
                        setRabbits(updatedRabbits);
                      }}
                      color="primary"
                    />
                  }
                  label="Kaninen är vid liv och i min besättning under rapportåret."
                />
              </Grid>
              {rabbit.isAlive ? (
                <>
                  <Grid item xs={12} sm={6}>
                    <KeyboardDatePicker
                      autoOk
                      disableFuture
                      error={false}
                      invalidDateMessage="Datumet har fel format."
                      maxDateMessage="Datumet får inte ligga i framtiden."
                      variant="inline"
                      inputVariant={inputVariant}
                      label="Rapportdatum"
                      format={dateFormat}
                      className={classes.datePicker}
                      value={rabbit.reportDate}
                      InputLabelProps={{
                        shrink: true,
                      }}
                      onChange={(date) => {
                        const updatedRabbits = [...rabbits];
                        updatedRabbits[index].reportDate = date;
                        setRabbits(updatedRabbits);
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Vikt (kg)"
                      variant={inputVariant}
                      type="text"
                      inputProps={{ min: 0, step: 0.01 }}
                      value={rabbit.weight}
                      onChange={(e) => {
                        const updatedRabbits = [...rabbits];
                        updatedRabbits[index].weight = e.target.value;
                        setRabbits(updatedRabbits);
                      }}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <KeyboardDatePicker
                      autoOk
                      disableFuture
                      error={false}
                      invalidDateMessage="Datumet har fel format."
                      maxDateMessage="Datumet får inte ligga i framtiden."
                      variant="inline"
                      inputVariant={inputVariant}
                      label="Viktdatum"
                      format={dateFormat}
                      className={classes.datePicker}
                      value={rabbit.weightDate}
                      InputLabelProps={{
                        shrink: true,
                      }}
                      onChange={(date) => {
                        const updatedRabbits = [...rabbits];
                        updatedRabbits[index].weightDate = date;
                        setRabbits(updatedRabbits);
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Hull"
                      variant={inputVariant}
                      select
                      SelectProps={{
                        native: true,
                      }}
                      value={rabbit.bodyFat}
                      onChange={(e) => {
                        const updatedRabbits = [...rabbits];
                        updatedRabbits[index].bodyFat = e.target.value;
                        setRabbits(updatedRabbits);
                      }}
                      fullWidth
                    >
                      <option value="low">Låg</option>
                      <option value="normal">Normal</option>
                      <option value="high">Hög</option>
                    </TextField>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <KeyboardDatePicker
                      autoOk
                      disableFuture
                      error={false}
                      invalidDateMessage="Datumet har fel format."
                      maxDateMessage="Datumet får inte ligga i framtiden."
                      variant="inline"
                      inputVariant={inputVariant}
                      label="Hulldatum"
                      format={dateFormat}
                      className={classes.datePicker}
                      value={rabbit.bodyFatDate}
                      InputLabelProps={{
                        shrink: true,
                      }}
                      onChange={(date) => {
                        const updatedRabbits = [...rabbits];
                        updatedRabbits[index].bodyFatDate = date;
                        setRabbits(updatedRabbits);
                      }}
                    />
                  </Grid>
                </>
              ) : (
                <>
                  <Grid item xs={12}>
                    <Typography variant="body1">
                      Rapportera {rabbit.individual.name}{" "}
                      {rabbit.individual.number} som död
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <KeyboardDatePicker
                      autoOk
                      required
                      disableFuture
                      error={false}
                      invalidDateMessage="Datumet har fel format."
                      minDateMessage="Datumet måste ligga efter senaste rapporteringsdatum."
                      variant="inline"
                      inputVariant={inputVariant}
                      label="Dödsdatum"
                      format={dateFormat}
                      className={classes.datePicker}
                      value={rabbit.deathDate}
                      InputLabelProps={{
                        shrink: true,
                      }}
                      onChange={(date) => {
                        const updatedRabbits = [...rabbits];
                        updatedRabbits[index].deathDate = date;
                        setRabbits(updatedRabbits);
                      }}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl component="fieldset">
                      <FormLabel component="legend" required>
                        Har kaninen slaktats (t.ex. för kött, pga platsbrist
                        e.d.)
                      </FormLabel>
                      <RadioGroup
                        row
                        aria-label="butchered"
                        name={`butchered-${index}`}
                        value={rabbit.butchered ? "yes" : "no"}
                        onChange={(e) => {
                          const updatedRabbits = [...rabbits];
                          updatedRabbits[index].butchered =
                            e.target.value === "yes";
                          setRabbits(updatedRabbits);
                        }}
                      >
                        <FormControlLabel
                          value="no"
                          control={<Radio />}
                          label="Nej"
                        />
                        <FormControlLabel
                          value="yes"
                          control={<Radio />}
                          label="Ja"
                        />
                      </RadioGroup>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <TextField
                      label="Anteckningar om kaninens död"
                      variant={inputVariant}
                      className={classes.wideControl}
                      multiline
                      minRows={2}
                      value={rabbit.deathNote}
                      onChange={(e) => {
                        const updatedRabbits = [...rabbits];
                        updatedRabbits[index].deathNote = e.target.value;
                        setRabbits(updatedRabbits);
                      }}
                      fullWidth
                    />
                  </Grid>
                </>
              )}
            </Grid>
          ))}
        </div>
      </MuiPickersUtilsProvider>
      <Button
        variant="contained"
        color="primary"
        onClick={handleSubmit}
        className={classes.submitButton}
      >
        Skicka Uppdateringar
      </Button>
    </Paper>
  );
};

export default BatchRabbitUpdateForm;
