// File: YearlyReportForm.tsx

import React, { useEffect, useState } from "react";
import { useFormik } from "formik";
import {
  Button,
  Checkbox,
  FormControlLabel,
  TextField,
  Typography,
  Paper,
  FormGroup,
  Grid,
} from "@material-ui/core";
import { get, post } from "@app/communication";
import { useUserContext } from "@app/user_context";
import { useDataContext } from "@app/data_context";
import { useMessageContext } from "@app/message_context";

interface YearlyReportFormProps {
  herdId: string;
  existingReportData?: any;
  reportRoundId?: number;
  reportYear?: number;
}

const YearlyReportForm: React.FC<YearlyReportFormProps> = ({
  herdId,
  existingReportData,
  reportRoundId,
  reportYear,
}) => {
  const { user } = useUserContext();
  const { genebanks } = useDataContext();
  const { userMessage } = useMessageContext();
  const [prefilledValues, setPrefilledValues] = useState<any>({});
  const [loading, setLoading] = useState(true);

  const [herdResponse, setHerdResponse] = useState<any>(null);
  const [herdName, setHerdName] = useState<string>("");
  // Define default values

  // Function to determine if an individual was active on a given date
  function isActiveOnDate(individual: any, date: Date): boolean {
    // Assuming herd is active; adjust if necessary
    const deathDate = individual.death_date
      ? new Date(individual.death_date)
      : null;

    const deathNote = individual.death_note;

    const castrationDate = individual.castration_date
      ? new Date(individual.castration_date)
      : null;

    const hasCertificate =
      individual.certificate || individual.digital_certificate;

    const herdTrackingEntries = individual.herd_tracking || [];

    // Find the latest herd tracking entry
    const latestHerdTrackingEntry = herdTrackingEntries.reduce(
      (latest: any, entry: any) => {
        const entryDate = new Date(entry.date);
        const latestDate = latest ? new Date(latest.date) : null;
        return !latestDate || entryDate > latestDate ? entry : latest;
      },
      null
    );
    const herdTrackingDate = latestHerdTrackingEntry
      ? new Date(latestHerdTrackingEntry.date)
      : null;

    // Check if the latest herd tracking date is equal to or after the date
    const herdTrackingDateValid = herdTrackingDate && herdTrackingDate >= date;

    const isActive =
      (!deathDate || deathDate > date) &&
      !deathNote &&
      (!castrationDate || castrationDate > date) &&
      hasCertificate &&
      latestHerdTrackingEntry &&
      herdTrackingDateValid;

    return isActive;
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Validate that reportYear is provided
        if (!reportYear) {
          userMessage(
            "Rapporteringsår saknas. Kontakta administratören.",
            "error"
          );
          setLoading(false);
          return;
        }

        // Fetch herd data
        const herdResponseData = await get(`/api/herd/${herdId}`);
        setHerdResponse(herdResponseData);
        const herdNameData = herdResponseData.herd_name || "";
        setHerdName(herdNameData);

        // Fetch breeding events
        const breedingResponse = await get(`/api/breeding/${herdId}`);
        const breedings = breedingResponse.breedings || [];

        // Get individuals from herdResponse
        const individualsData = herdResponseData.individuals || [];

        const breedingYear = reportYear;
        const breedingYearEndDate = new Date(`${breedingYear}-12-31`);

        // Filter breedings for the breedingYear with valid birth_date and litter_size > 0
        const breedingsThisYear = breedings.filter((breeding: any) => {
          const birthDateStr = breeding.birth_date;
          if (!birthDateStr) {
            return false; // Exclude breeding events without a birth_date
          }
          const birthDate = new Date(birthDateStr);
          if (isNaN(birthDate.getTime())) {
            return false; // Exclude invalid dates
          }
          const includeBreeding =
            birthDate.getFullYear() === breedingYear &&
            birthDate <= breedingYearEndDate && // Exclude future dates
            (breeding.litter_size || 0) > 0;

          return includeBreeding;
        });

        // Number of litters (each valid breeding event is a litter)
        const numberOfLitters = breedingsThisYear.length;

        // Total born (sum of litter sizes)
        const totalBorn = breedingsThisYear.reduce(
          (sum: number, breeding: any) => sum + (breeding.litter_size || 0),
          0
        );

        // Total alive after six weeks (sum of litter_size6w)
        const totalAliveAfterSixWeeks = breedingsThisYear.reduce(
          (sum: number, breeding: any) => sum + (breeding.litter_size6w || 0),
          0
        );

        // Number of females used in breeding (unique mothers)
        const femalesUsed = new Set(
          breedingsThisYear
            .map((breeding: any) => breeding.mother)
            .filter(Boolean)
        );
        const numberOfFemalesUsedInBreeding = femalesUsed.size;

        // Number of males used in breeding (unique fathers)
        const malesUsed = new Set(
          breedingsThisYear
            .map((breeding: any) => breeding.father)
            .filter(Boolean)
        );
        const numberOfMalesUsedInBreeding = malesUsed.size;

        // Number of females with certificate on Dec 31
        const femalesWithCertificate = individualsData.filter(
          (individual: any) =>
            individual.sex === "female" &&
            isActiveOnDate(individual, breedingYearEndDate)
        );
        const numberOfFemalesWithCertificate = femalesWithCertificate.length;

        // Number of males with certificate on Dec 31
        const malesWithCertificate = individualsData.filter(
          (individual: any) =>
            individual.sex === "male" &&
            isActiveOnDate(individual, breedingYearEndDate)
        );
        const numberOfMalesWithCertificate = malesWithCertificate.length;

        // Determine breed based on genebank ID
        const isGotlandskanin = herdResponseData.genebank === 1;
        const isMellerudskanin = herdResponseData.genebank === 2;

        // Prefill form values
        const calculatedValues = {
          genebankNumber: herdResponseData.herd,
          gotlandskanin: isGotlandskanin,
          mellerudskanin: isMellerudskanin,
          breedingYear: breedingYear,
          endingGenbank: false,
          numberOfLitters: numberOfLitters,
          totalBorn: totalBorn,
          totalAliveAfterSixWeeks: totalAliveAfterSixWeeks,
          numberOfFemalesUsedInBreeding: numberOfFemalesUsedInBreeding,
          numberOfMalesUsedInBreeding: numberOfMalesUsedInBreeding,
          numberOfFemalesWithCertificate: numberOfFemalesWithCertificate,
          numberOfMalesWithCertificate: numberOfMalesWithCertificate,
          allowPublication: [],
          notEligibleForSupport: false,
          eligibleForSupport: false,
          defectsMalformations: "",
          diseases: {
            myxomatosis: { numberOfAffectedRabbits: "", age: "" },
            rvhd: { numberOfAffectedRabbits: "", age: "" },
            coccidiosis: { numberOfAffectedRabbits: "", age: "" },
            other: { diseaseName: "", numberOfAffectedRabbits: "", age: "" },
          },
        };

        // Merge existing report data if available
        const initialValues = existingReportData
          ? {
              ...calculatedValues,
              ...existingReportData,
              allowPublication: existingReportData.allowPublication || [],
            }
          : {
              ...calculatedValues,
            };
        setPrefilledValues(initialValues);
        setLoading(false);
      } catch (error) {
        console.error(error);
        userMessage("Ett fel inträffade vid hämtning av data DEG", "error");
        setLoading(false);
      }
    };
    fetchData();
  }, [herdId, existingReportData]);

  // Function to map allowPublication to publish settings
  const mapAllowPublicationToPublishSettings = (allowPublication: string[]) => {
    const publishSettings = {
      publish: true,
      publish_tel: true,
      publish_email: true,
      publish_address: true,
    };

    if (allowPublication.includes("noPublication")) {
      publishSettings.publish = false;
      publishSettings.publish_tel = false;
      publishSettings.publish_email = false;
      publishSettings.publish_address = false;
      return publishSettings;
    }

    if (allowPublication.includes("all")) {
      // All publish settings are true
      return publishSettings;
    }

    // Adjust settings based on exclusions
    if (allowPublication.includes("noPhone")) {
      publishSettings.publish_tel = false;
    }

    if (allowPublication.includes("noEmail")) {
      publishSettings.publish_email = false;
    }

    if (allowPublication.includes("noAddress")) {
      publishSettings.publish_address = false;
    }

    return publishSettings;
  };

  // Initialize formik with prefilled values when they are ready
  const formik = useFormik({
    enableReinitialize: true,
    initialValues: prefilledValues,
    onSubmit: async (values) => {
      // Ensure herdResponse, herdName and reportRoundId are available
      if (!herdResponse || !herdName) {
        userMessage("Kunde inte hämta herd data.", "error");
        return;
      }
      if (!reportRoundId) {
        userMessage("Ingen aktiv rapporteringsomgång hittad.", "error");
        return;
      }

      // Prepare the payload
      const publishSettings = mapAllowPublicationToPublishSettings(
        values.allowPublication || []
      );
      const reportName = `Årsrapport ${
        reportYear || new Date().getFullYear()
      } ${herdResponse.herd} ${herdName}`;

      const payload = {
        data: values,
        name: reportName,
        version: "1.0",
        report_round_id: reportRoundId,
        report_year: reportYear,
        ...publishSettings,
      };

      try {
        const response = await post(
          `/api/herd/${herdId}/yearlyreport`,
          payload
        );
        if (response.status === "success") {
          userMessage("Årsrapporten har sparats!", "success");
        } else {
          userMessage(
            "Ett fel inträffade vid sparandet av årsrapporten.",
            "error"
          );
        }
      } catch (error) {
        console.error(error);
        userMessage(
          "Ett fel inträffade vid anslutningen till servern.",
          "error"
        );
      }
    },
  });

  if (loading || Object.keys(prefilledValues).length === 0) {
    return <div>Laddar...</div>;
  }

  // Auto-validate conditions
  const meetsBreedingRequirement = prefilledValues.numberOfLitters >= 1;

  return (
    <Paper style={{ padding: "2em" }}>
      <Typography variant="h5" gutterBottom>
        Årsrapport för genbanksanslutna kaniner
      </Typography>
      <form onSubmit={formik.handleSubmit}>
        <Grid container spacing={2}>
          {/* Genbanksnummer */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Genbanksnummer"
              name="genebankNumber"
              value={formik.values.genebankNumber}
              onChange={formik.handleChange}
              fullWidth
              margin="normal"
              disabled
            />
          </Grid>

          {/* Ras */}
          <Grid item xs={12}>
            <FormGroup row>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formik.values.gotlandskanin}
                    name="gotlandskanin"
                    onChange={formik.handleChange}
                    disabled
                  />
                }
                label="Gotlandskanin"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={formik.values.mellerudskanin}
                    name="mellerudskanin"
                    onChange={formik.handleChange}
                    disabled
                  />
                }
                label="Mellerudskanin"
              />
            </FormGroup>
          </Grid>

          {/* Avelsår */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Avelsår"
              name="breedingYear"
              type="number"
              value={formik.values.breedingYear}
              onChange={formik.handleChange}
              fullWidth
              margin="normal"
              disabled
            />
          </Grid>

          {/* Avslutar genbank */}
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={formik.values.endingGenbank}
                  name="endingGenbank"
                  onChange={formik.handleChange}
                />
              }
              label="Jag vill avsluta min genbank"
            />
          </Grid>

          {/* Antal kullar under året */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Antal kullar under året"
              name="numberOfLitters"
              type="number"
              value={formik.values.numberOfLitters}
              onChange={formik.handleChange}
              fullWidth
              margin="normal"
              disabled
            />
          </Grid>

          {/* Antal födda ungar */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Totalt antal födda ungar"
              name="totalBorn"
              type="number"
              value={formik.values.totalBorn}
              onChange={formik.handleChange}
              fullWidth
              margin="normal"
              disabled
            />
          </Grid>

          {/* Antal ungar vid sex veckor */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Antal ungar vid sex veckors ålder"
              name="totalAliveAfterSixWeeks"
              type="number"
              value={formik.values.totalAliveAfterSixWeeks}
              onChange={formik.handleChange}
              fullWidth
              margin="normal"
              disabled
            />
          </Grid>

          {/* Antal honor använda i avel */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Antal honor använda i avel"
              name="numberOfFemalesUsedInBreeding"
              type="number"
              value={formik.values.numberOfFemalesUsedInBreeding}
              onChange={formik.handleChange}
              fullWidth
              margin="normal"
              disabled
            />
          </Grid>

          {/* Antal hanar använda i avel */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Antal hanar använda i avel"
              name="numberOfMalesUsedInBreeding"
              type="number"
              value={formik.values.numberOfMalesUsedInBreeding}
              onChange={formik.handleChange}
              fullWidth
              margin="normal"
              disabled
            />
          </Grid>

          {/* Antal honor med genbanksintyg 31 dec */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Antal honor med genbanksintyg 31 dec"
              name="numberOfFemalesWithCertificate"
              type="number"
              value={formik.values.numberOfFemalesWithCertificate}
              onChange={formik.handleChange}
              fullWidth
              margin="normal"
              disabled
            />
          </Grid>

          {/* Antal hanar med genbanksintyg 31 dec */}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Antal hanar med genbanksintyg 31 dec"
              name="numberOfMalesWithCertificate"
              type="number"
              value={formik.values.numberOfMalesWithCertificate}
              onChange={formik.handleChange}
              fullWidth
              margin="normal"
              disabled
            />
          </Grid>

          {/* Allow publication */}
          <Grid item xs={12}>
            <Typography variant="h6">
              Jag tillåter att min genbank publiceras i medlemstidningen Koharen
              med innehavarens namn, postnummer + ort, telefonnummer och
              e-postadress.
            </Typography>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    name="allowPublication"
                    value="all"
                    checked={formik.values.allowPublication.includes("all")}
                    onChange={formik.handleChange}
                  />
                }
                label="Ja"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    name="allowPublication"
                    value="noPhone"
                    checked={formik.values.allowPublication.includes("noPhone")}
                    onChange={formik.handleChange}
                  />
                }
                label="Ja, men inte telefonnummer"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    name="allowPublication"
                    value="noEmail"
                    checked={formik.values.allowPublication.includes("noEmail")}
                    onChange={formik.handleChange}
                  />
                }
                label="Ja, men inte e-postadress"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    name="allowPublication"
                    value="noAddress"
                    checked={formik.values.allowPublication.includes(
                      "noAddress"
                    )}
                    onChange={formik.handleChange}
                  />
                }
                label="Ja, men inte postnummer + ort"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    name="allowPublication"
                    value="noPublication"
                    checked={formik.values.allowPublication.includes(
                      "noPublication"
                    )}
                    onChange={formik.handleChange}
                  />
                }
                label="Nej, ingen publicering"
              />
            </FormGroup>
          </Grid>

          {/* Eligibility for support */}
          <Grid item xs={12}>
            <Typography variant="h6">
              Jag uppfyller villkoren för genbanksstöd, jag har:
            </Typography>
            <ul>
              <li>
                Redovisat minst en hane och en hona med genbanksintyg 31
                december {prefilledValues.breedingYear}.
              </li>
              <li>
                Haft minst en kull under året och redovisat alla mina kaniner
                med genbanksintyg i Stamboken Online, alla kaniner jag sålt
                under året med genbanksintyg, samt alla kaniner i min besättning
                med intyg som dött under året.
              </li>
              <li>
                Vägt alla vuxna kaniner vid årets slut (födda{" "}
                {prefilledValues.breedingYear - 1} eller tidigare).
              </li>
              <li>
                Betalat medlemsavgiften för {prefilledValues.breedingYear}.
              </li>
            </ul>
            <FormControlLabel
              control={
                <Checkbox
                  name="eligibleForSupport"
                  checked={formik.values.eligibleForSupport}
                  onChange={formik.handleChange}
                  disabled={!meetsBreedingRequirement}
                />
              }
              label="Jag uppfyller villkoren för genbanksstöd"
            />
            {!meetsBreedingRequirement && (
              <Typography color="error">
                Du uppfyller inte villkoren för genbanksstöd (du har inte haft
                minst en kull under året).
              </Typography>
            )}
          </Grid>

          {/* Defekter/missbildningar */}
          <Grid item xs={12}>
            <TextField
              label="Defekter/missbildningar som noterats under året (gärna dokumenterat genom foto)"
              name="defectsMalformations"
              value={formik.values.defectsMalformations}
              onChange={formik.handleChange}
              fullWidth
              multiline
              rows={4}
              margin="normal"
            />
          </Grid>

          {/* Sjukdomsfall */}
          <Grid item xs={12}>
            <Typography variant="h6">Sjukdomsfall</Typography>
            {/* Table headers */}
            <Grid container spacing={1} alignItems="center">
              <Grid item xs={4}>
                <Typography variant="subtitle1">Sjukdomsfall</Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="subtitle1">
                  Antal drabbade kaniner
                </Typography>
              </Grid>
              <Grid item xs={4}>
                <Typography variant="subtitle1">Ålder</Typography>
              </Grid>

              {/* Myxomatos */}
              <Grid item xs={4}>
                <Typography>Myxomatos</Typography>
              </Grid>
              <Grid item xs={4}>
                <TextField
                  name="diseases.myxomatosis.numberOfAffectedRabbits"
                  value={
                    formik.values.diseases.myxomatosis.numberOfAffectedRabbits
                  }
                  onChange={formik.handleChange}
                  type="number"
                  fullWidth
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  name="diseases.myxomatosis.age"
                  value={formik.values.diseases.myxomatosis.age}
                  onChange={formik.handleChange}
                  fullWidth
                />
              </Grid>

              {/* RVHD typ 1 och 2 */}
              <Grid item xs={4}>
                <Typography>RVHD typ 1 och 2</Typography>
              </Grid>
              <Grid item xs={4}>
                <TextField
                  name="diseases.rvhd.numberOfAffectedRabbits"
                  value={formik.values.diseases.rvhd.numberOfAffectedRabbits}
                  onChange={formik.handleChange}
                  type="number"
                  fullWidth
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  name="diseases.rvhd.age"
                  value={formik.values.diseases.rvhd.age}
                  onChange={formik.handleChange}
                  fullWidth
                />
              </Grid>

              {/* Koccidios */}
              <Grid item xs={4}>
                <Typography>Koccidios</Typography>
              </Grid>
              <Grid item xs={4}>
                <TextField
                  name="diseases.coccidiosis.numberOfAffectedRabbits"
                  value={
                    formik.values.diseases.coccidiosis.numberOfAffectedRabbits
                  }
                  onChange={formik.handleChange}
                  type="number"
                  fullWidth
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  name="diseases.coccidiosis.age"
                  value={formik.values.diseases.coccidiosis.age}
                  onChange={formik.handleChange}
                  fullWidth
                />
              </Grid>

              {/* Annat */}
              <Grid item xs={4}>
                <TextField
                  label="Annat (Ange sjukdom)"
                  name="diseases.other.diseaseName"
                  value={formik.values.diseases.other.diseaseName}
                  onChange={formik.handleChange}
                  fullWidth
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  name="diseases.other.numberOfAffectedRabbits"
                  value={formik.values.diseases.other.numberOfAffectedRabbits}
                  onChange={formik.handleChange}
                  type="number"
                  fullWidth
                />
              </Grid>
              <Grid item xs={4}>
                <TextField
                  name="diseases.other.age"
                  value={formik.values.diseases.other.age}
                  onChange={formik.handleChange}
                  fullWidth
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Submit button */}
          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              style={{ marginTop: "1em" }}
            >
              Skicka in årsrapport
            </Button>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
};

export default YearlyReportForm;
