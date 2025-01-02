import React, { useState, useEffect } from "react";
import { get, patch, post } from "./communication";
import {
  Button,
  Typography,
  Paper,
  Grid,
  List,
  ListItem,
  ListItemText,
  TextField,
  FormControlLabel,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@material-ui/core";
import {
  KeyboardDatePicker,
  MuiPickersUtilsProvider,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import svLocale from "date-fns/locale/sv";
import { makeStyles } from "@material-ui/core/styles";
import "date-fns/locale/sv";
import { dateFormat } from "@app/data_context_global";
import { useMessageContext } from "@app/message_context";
import { useHistory } from "react-router-dom";

interface YearlyReportRound {
  id: number;
  start_date: string;
  end_date: string;
  report_count: number;
  created_by: number;
  created_by_username: string;
  creation_date: string;
  is_active: boolean;
  manually_activated: boolean;
  report_year: number;
}

const useStyles = makeStyles({
  manageSection: {
    padding: "2em",
  },
  roundsList: {
    // Add styles if needed
  },
  form: {
    // Add styles if needed
  },
  formSection: {
    marginTop: "2em",
  },
});

const YearlyReportRounds: React.FC = () => {
  const classes = useStyles();
  const [rounds, setRounds] = useState<YearlyReportRound[]>([]);
  const [selectedRoundId, setSelectedRoundId] = useState<number | null>(null);

  const nextYear = new Date().getFullYear() + 1;
  const defaultStartDate = new Date(nextYear, 0, 1); // January 1st next year
  const defaultEndDate = new Date(nextYear, 2, 31); // March 31st next year (month is 0-based, so 2 = March)

  const [newRound, setNewRound] = useState({
    start_date: defaultStartDate,
    end_date: defaultEndDate,
    report_year: nextYear - 1,
    is_active: false,
    manually_activated: false,
  });

  const { userMessage } = useMessageContext();
  const history = useHistory();

  useEffect(() => {
    fetchRounds();
  }, []);

  const fetchRounds = async () => {
    try {
      const response = await get("/api/manage/yearly_report_rounds");
      if (response.status === "success") {
        const roundsData = response.rounds as YearlyReportRound[];
        setRounds(roundsData);
      }
    } catch (error) {
      console.error("Error fetching yearly report rounds:", error);
    }
  };

  const handleDateChange = (date: Date | null, name: string) => {
    setNewRound((prevState) => {
      const updatedState = { ...prevState, [name]: date };

      // Don't update if date is null
      if (!date) {
        return prevState;
      }

      // Update report year when start date changes
      if (name === "start_date") {
        updatedState.report_year = date.getFullYear() - 1;
      }

      // Validate date range when either date changes
      if (name === "start_date" && updatedState.end_date) {
        if (date > updatedState.end_date) {
          userMessage("Startdatum kan inte vara efter slutdatum", "error");
          return prevState;
        }
      }
      if (name === "end_date" && updatedState.start_date) {
        if (date < updatedState.start_date) {
          userMessage("Slutdatum kan inte vara före startdatum", "error");
          return prevState;
        }
      }

      return updatedState;
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewRound({ ...newRound, [e.target.name]: e.target.value });
  };

  const handleRowClick = (round: YearlyReportRound) => {
    setNewRound({
      start_date: new Date(round.start_date),
      end_date: new Date(round.end_date),
      report_year: round.report_year,
      is_active: round.is_active,
      manually_activated: round.manually_activated,
    });
    setSelectedRoundId(round.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate dates before submission
    if (!newRound.start_date || !newRound.end_date) {
      userMessage("Både start- och slutdatum måste anges", "error");
      return;
    }

    if (newRound.start_date > newRound.end_date) {
      userMessage("Startdatum kan inte vara efter slutdatum", "error");
      return;
    }

    try {
      const payload = {
        start_date: newRound.start_date.toISOString().split("T")[0],
        end_date: newRound.end_date.toISOString().split("T")[0],
        report_year: newRound.report_year,
        is_active: newRound.is_active,
        manually_activated: newRound.manually_activated,
      };

      let response;
      if (selectedRoundId) {
        // Update existing round
        response = await patch(
          `/api/manage/yearly_report_round/${selectedRoundId}`,
          payload
        );
      } else {
        // Create new round
        response = await post("/api/manage/yearly_report_round", payload);
      }

      if (response.status === "success") {
        userMessage(
          selectedRoundId
            ? "Årsrapportomgång uppdaterad."
            : "Årsrapportomgång skapad.",
          "success"
        );
        fetchRounds();
        setNewRound({
          start_date: defaultStartDate,
          end_date: defaultEndDate,
          report_year: nextYear - 1,
          is_active: false,
          manually_activated: false,
        });
        setSelectedRoundId(null);
      } else {
        userMessage(
          `Kunde inte ${
            selectedRoundId ? "uppdatera" : "skapa"
          } årsrapportomgång: ${response.message}`,
          "error"
        );
      }
    } catch (error) {
      userMessage("Något gick fel, kontakta Admin: " + error, "error");
    }
  };

  const handleDelete = (roundId: number) => {
    // Confirm deletion
    if (window.confirm("Are you sure you want to delete this round?")) {
      fetch(`/api/manage/yearly_report_round/${roundId}`, {
        method: "DELETE",
        credentials: "include",
      })
        .then((response) => response.json())
        .then((data) => {
          if (data.status === "success") {
            // Update state to remove the deleted round
            setRounds(rounds.filter((round) => round.id !== roundId));
          } else {
            alert(data.message || "Failed to delete the round");
          }
        })
        .catch((error) => {
          console.error("Error deleting round:", error);
          alert("An error occurred while deleting the round");
        });
    }
  };

  return (
    <Paper className={classes.manageSection}>
      <Typography variant="h5" gutterBottom>
        Årliga Rapportperioder
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Rapportår</TableCell>
              <TableCell>Rapportantal</TableCell>
              <TableCell>Aktiv</TableCell>
              <TableCell>Manuellt aktiverad</TableCell>
              <TableCell>Startdatum</TableCell>
              <TableCell>Slutdatum</TableCell>
              <TableCell>Skapad av</TableCell>
              <TableCell>Skapad den</TableCell>
              <TableCell>Åtgärder</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rounds.map((round) => (
              <TableRow
                key={round.id}
                hover
                onClick={() => handleRowClick(round)}
              >
                <TableCell>{round.report_year}</TableCell>
                <TableCell>{round.report_count}</TableCell>
                <TableCell>{round.is_active ? "Ja" : "Nej"}</TableCell>
                <TableCell>{round.manually_activated ? "Ja" : "Nej"}</TableCell>
                <TableCell>
                  {new Date(round.start_date).toLocaleDateString("sv-SE")}
                </TableCell>
                <TableCell>
                  {new Date(round.end_date).toLocaleDateString("sv-SE")}
                </TableCell>
                <TableCell>{round.created_by_username}</TableCell>
                <TableCell>
                  {new Date(round.creation_date).toLocaleDateString("sv-SE")}
                </TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={() => handleDelete(round.id)}
                  >
                    Delete
                  </Button>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() =>
                      history.push(`/yearly-reports-view/${round.id}`)
                    }
                    style={{ marginLeft: "8px" }}
                  >
                    View Reports
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <div className={classes.formSection}>
        <Typography variant="h6" gutterBottom>
          {selectedRoundId ? "Redigera Period" : "Skapa Ny Period"}
        </Typography>
        <form onSubmit={handleSubmit} className={classes.form}>
          <MuiPickersUtilsProvider utils={DateFnsUtils} locale={svLocale}>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Rapportår"
                  name="report_year"
                  value={newRound.report_year}
                  onChange={handleChange}
                  fullWidth
                  required
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <KeyboardDatePicker
                  label="Startdatum"
                  format={dateFormat}
                  variant="inline"
                  value={newRound.start_date}
                  onChange={(date) => handleDateChange(date, "start_date")}
                  fullWidth
                  required
                  KeyboardButtonProps={{
                    "aria-label": "ändra datum",
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <KeyboardDatePicker
                  label="Slutdatum"
                  format={dateFormat}
                  variant="inline"
                  value={newRound.end_date}
                  onChange={(date) => handleDateChange(date, "end_date")}
                  fullWidth
                  required
                  KeyboardButtonProps={{
                    "aria-label": "ändra datum",
                  }}
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={newRound.is_active}
                      onChange={(e) =>
                        setNewRound({
                          ...newRound,
                          is_active: e.target.checked,
                        })
                      }
                      name="is_active"
                      color="primary"
                    />
                  }
                  label="Aktiv"
                />
              </Grid>
              <Grid item xs={12}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={newRound.manually_activated}
                      onChange={(e) =>
                        setNewRound({
                          ...newRound,
                          manually_activated: e.target.checked,
                        })
                      }
                      name="manually_activated"
                      color="primary"
                    />
                  }
                  label="Manuellt aktiverad"
                />
              </Grid>
              <Grid item xs={12}>
                <Button type="submit" variant="contained" color="primary">
                  {selectedRoundId ? "Uppdatera Period" : "Skapa Period"}
                </Button>
              </Grid>
            </Grid>
          </MuiPickersUtilsProvider>
        </form>
      </div>
    </Paper>
  );
};

export default YearlyReportRounds;
