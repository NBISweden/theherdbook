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
import { Individual } from "@app/data_context_global";
import DateFnsUtils from "@date-io/date-fns";
import svLocale from "date-fns/locale/sv"; // Swedish locale
import { dateFormat, inputVariant, BodyFat } from "@app/data_context_global";

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
}

const BatchRabbitUpdateForm: React.FC<BatchRabbitUpdateFormProps> = ({
  herdId,
  reportYear,
  reportRoundId,
}) => {
  const classes = useStyles();
  const [rabbits, setRabbits] = useState<RabbitData[]>([]);
  const [loading, setLoading] = useState(true);
  const { userMessage } = useMessageContext();
  const { loadData } = useDataContext();

  useEffect(() => {
    const fetchData = async () => {
      if (!reportYear) {
        userMessage("Rapporteringsår saknas.", "error");
        return;
      }

      try {
        const herdResponse = await get(`/api/herd/${herdId}`);
        const individualsData: Individual[] = herdResponse.individuals || [];
        const yearEndDate = new Date(`${reportYear}-12-31`);
        const decemberFirst = new Date(`${reportYear}-12-01`);

        // Filter individuals who have a certificate and are alive
        const rabbitsWithCertificates = individualsData.filter(
          (individual) =>
            (individual.certificate || individual.digital_certificate) &&
            individual.alive === true
        );

        // Initialize rabbit data
        const rabbitDataList: RabbitData[] = await Promise.all(
          rabbitsWithCertificates.map(async (individual) => {
            // Find latest weight entry after Dec 1st
            const latestWeight = individual.weights
              ?.filter((w) => new Date(w.date) >= decemberFirst)
              .sort(
                (a, b) =>
                  new Date(b.date).getTime() - new Date(a.date).getTime()
              )[0];

            // Find latest body fat entry after Dec 1st
            const latestBodyFat = individual.bodyfat
              ?.filter((bf) => new Date(bf.date) >= decemberFirst)
              .sort(
                (a, b) =>
                  new Date(b.date).getTime() - new Date(a.date).getTime()
              )[0];

            return {
              individual,
              isAlive: true,
              reportDate: yearEndDate,
              weight: latestWeight?.weight.toString() || "",
              weightDate: latestWeight
                ? new Date(latestWeight.date)
                : yearEndDate,
              bodyFat: latestBodyFat?.bodyfat || "normal",
              bodyFatDate: latestBodyFat
                ? new Date(latestBodyFat.date)
                : yearEndDate,
              deathDate: null,
              butchered: false,
              deathNote: "",
            };
          })
        );

        setRabbits(rabbitDataList);
        setLoading(false);
      } catch (error) {
        console.error(error);
        userMessage("Kunde inte ladda kanindata.", "error");
        setLoading(false);
      }
    };
    fetchData();
  }, [herdId, reportYear]);

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

    // Update each rabbit individually
    for (const rabbit of rabbits) {
      const {
        individual,
        isAlive,
        reportDate,
        weight,
        weightDate,
        bodyFat,
        bodyFatDate,
        deathDate,
        butchered,
        deathNote,
      } = rabbit;
      const updateData: any = {
        id: individual.id,
        number: individual.number,
        herd: individual.herd,
      };

      if (isAlive) {
        // Update herd tracking (yearly report date)
        if (reportDate) {
          updateData.yearly_report_date = reportDate
            .toISOString()
            .split("T")[0];
        } else {
          continue; // If report date is missing, skip this rabbit
        }

        // Update weight if provided
        if (weight && weightDate) {
          updateData.weights = [
            ...(individual.weights || []),
            {
              date: weightDate.toISOString().split("T")[0],
              weight: parseFloat(weight.replace(",", ".")),
            },
          ];
        }

        // Update body fat if provided
        if (bodyFat && bodyFatDate) {
          updateData.bodyfat = [
            ...(individual.bodyfat || []),
            {
              date: bodyFatDate.toISOString().split("T")[0],
              bodyfat: bodyFat as BodyFat,
            },
          ];
        }
      } else {
        // Mark the rabbit as dead
        if (deathDate) {
          updateData.death_date = deathDate.toISOString().split("T")[0];
        } else {
          continue; // If death date is missing, skip this rabbit
        }
        updateData.butchered = butchered;
        updateData.death_note = deathNote;
      }

      try {
        const response = await patch("/api/individual", updateData);
        if (response.status === "success") {
          // Successful update for this rabbit
        } else {
          userMessage(
            `Misslyckades med att uppdatera kaninen ${individual.name} ${individual.number}.`,
            "error"
          );
        }
      } catch (error) {
        console.error(error);
        userMessage(
          `Ett fel inträffade vid uppdatering av kaninen ${individual.name} ${individual.number}.`,
          "error"
        );
      }
    }

    userMessage("Kaniner uppdaterades framgångsrikt.", "success");
    loadData(["genebanks"]); // Reload data if needed
  };

  if (loading) {
    return <div>Laddar...</div>;
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
