import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { get } from "./communication";
import { useDataContext } from "./data_context";
import { Genebank } from "./data_context_global";
import { useMessageContext } from "./message_context";

const useStyles = makeStyles((theme) => ({
  container: {
    padding: theme.spacing(3),
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: theme.spacing(3),
  },
  genebankSelector: {
    marginBottom: theme.spacing(3),
  },
  button: {
    marginRight: theme.spacing(1),
  },
  tableContainer: {
    marginTop: theme.spacing(2),
  },
}));

interface YearlyReport {
  herd: string;
  name: string;
  status: string;
  litter_count: number;
  total_kits_born: number;
  living_kits_6weeks: number;
  registered_females_yearend: number;
  registered_males_yearend: number;
  breeding_females_used: number;
  breeding_males_used: number;
  publish: string;
  email: string;
  eligible_for_support: boolean;
  bank_account: string;
  bank_name: string;
  defects_malformations: string;
  disease_cases: string;
  submission_date: string;
  fullname?: string;
}

/**
 * Shows yearly reports for a specific round
 */
export function YearlyReportViewer() {
  const { roundId } = useParams<{ roundId: string }>();
  const classes = useStyles();
  const { genebanks } = useDataContext();
  const { userMessage } = useMessageContext();
  const [selectedGenebank, setSelectedGenebank] = useState<Genebank | null>(
    null
  );
  const [reports, setReports] = useState<YearlyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [reportYear, setReportYear] = useState<string>("");

  useEffect(() => {
    if (selectedGenebank) {
      fetchReports();
    }
  }, [selectedGenebank, roundId]);

  const fetchReports = async () => {
    if (!selectedGenebank || !roundId) return;

    setLoading(true);
    try {
      const response = await get(
        `/api/manage/yearly-reports/${roundId}/${selectedGenebank.id}`
      );
      if (response.status === "success") {
        setReports(response.reports);
        if (response.report_year) {
          setReportYear(response.report_year.toString());
        }
      } else {
        throw new Error(response.message);
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Ett okänt fel inträffade";
      userMessage("Kunde inte hämta rapporter: " + errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    if (!selectedGenebank || !roundId) return;

    try {
      const response = await fetch(
        `/api/manage/yearly-reports/${roundId}/${selectedGenebank.id}/export`,
        {
          method: "GET",
          credentials: "same-origin",
          headers: {
            Accept: "text/csv",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `arsrapporter-${selectedGenebank.name}-${reportYear || roundId}.csv`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      const errMessage =
        err instanceof Error ? err.message : "Ett okänt fel inträffade";
      userMessage("Kunde inte exportera rapporter: " + errMessage, "error");
    }
  };

  return (
    <Paper className={classes.container}>
      <div className={classes.header}>
        <Typography variant="h5">Årsrapporter</Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={handleExportCSV}
          disabled={!selectedGenebank || loading}
          className={classes.button}
        >
          Exportera till CSV
        </Button>
      </div>

      <div className={classes.genebankSelector}>
        <Typography variant="h6" gutterBottom>
          Välj Genbank
        </Typography>
        <div>
          {genebanks.map((genebank) => (
            <Button
              key={genebank.id}
              variant="contained"
              color={
                selectedGenebank?.id === genebank.id ? "primary" : "default"
              }
              onClick={() => setSelectedGenebank(genebank)}
              className={classes.button}
            >
              {genebank.name}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <CircularProgress />
      ) : (
        <TableContainer component={Paper} className={classes.tableContainer}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Besättningsnummer</TableCell>
                <TableCell>Namn</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Antal kullar under året</TableCell>
                <TableCell>Totalt antal födda ungar under året</TableCell>
                <TableCell>Totalt antal levande ungar efter 6 veckor</TableCell>
                <TableCell>
                  Registrerade honor vid årsskiftet i genbanken, antal
                </TableCell>
                <TableCell>
                  Registrerade hanar vid årsskiftet i genbanken, antal
                </TableCell>
                <TableCell>Använda honor i avel under året, antal</TableCell>
                <TableCell>Använda hanar i avel under året, antal</TableCell>
                <TableCell>Publicering i Koharen</TableCell>
                <TableCell>E-post</TableCell>
                <TableCell>Uppfyller kraven för stöd</TableCell>
                <TableCell>Bankkontonr</TableCell>
                <TableCell>Bank</TableCell>
                <TableCell>Defekter/missbildningar</TableCell>
                <TableCell>Sjukdomsfall under året</TableCell>
                <TableCell>Datum för ifyllnad</TableCell>
                <TableCell>Ifylld av</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.herd}>
                  <TableCell>{report.herd}</TableCell>
                  <TableCell>{report.name}</TableCell>
                  <TableCell>{report.status}</TableCell>
                  <TableCell>{report.litter_count}</TableCell>
                  <TableCell>{report.total_kits_born}</TableCell>
                  <TableCell>{report.living_kits_6weeks}</TableCell>
                  <TableCell>{report.registered_females_yearend}</TableCell>
                  <TableCell>{report.registered_males_yearend}</TableCell>
                  <TableCell>{report.breeding_females_used}</TableCell>
                  <TableCell>{report.breeding_males_used}</TableCell>
                  <TableCell>{report.publish}</TableCell>
                  <TableCell>{report.email}</TableCell>
                  <TableCell>
                    {report.eligible_for_support ? "Ja" : "Nej"}
                  </TableCell>
                  <TableCell>{report.bank_account}</TableCell>
                  <TableCell>{report.bank_name}</TableCell>
                  <TableCell>{report.defects_malformations}</TableCell>
                  <TableCell>{report.disease_cases}</TableCell>
                  <TableCell>{report.submission_date}</TableCell>
                  <TableCell>{report.fullname}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Paper>
  );
}
