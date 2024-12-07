import React, { useState, useEffect } from "react";
import { get, post } from "./communication";
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

interface YearlyReportRound {
  id: number;
  start_date: string;
  end_date: string;
  report_count: number;
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
});

const YearlyReportRounds: React.FC = () => {
  const classes = useStyles();
  const [rounds, setRounds] = useState<YearlyReportRound[]>([]);

  const nextYear = new Date().getFullYear() + 1;
  const defaultStartDate = new Date(nextYear, 0, 1); // January 1st next year
  const defaultEndDate = new Date(nextYear, 2, 31); // March 31st next year

  const [newRound, setNewRound] = useState({
    start_date: defaultStartDate,
    end_date: defaultEndDate,
    report_year: nextYear - 1,
    is_active: false,
  });

  const { userMessage } = useMessageContext();

  useEffect(() => {
    fetchRounds();
  }, []);

  const fetchRounds = async () => {
    try {
      const response = await get("/api/manage/yearly_report_rounds");
      if (response.status === "success") {
        setRounds(response.rounds);
      }
    } catch (error) {
      console.error("Error fetching yearly report rounds:", error);
    }
  };

  const handleDateChange = (date: Date | null, name: string) => {
    setNewRound((prevState) => {
      const updatedState = { ...prevState, [name]: date };
      if (name === "start_date" && date) {
        updatedState.report_year = date.getFullYear() - 1;
      }
      return updatedState;
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewRound({ ...newRound, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        start_date: newRound.start_date.toISOString().split("T")[0],
        end_date: newRound.end_date.toISOString().split("T")[0],
        report_year: newRound.report_year,
        is_active: newRound.is_active,
      };
      const response = await post("/api/manage/yearly_report_round", payload);
      if (response.status === "success") {
        userMessage("Årsrapportomgång skapad.", "success");
        fetchRounds();
        setNewRound({
          start_date: defaultStartDate,
          end_date: defaultEndDate,
          report_year: nextYear - 1,
          is_active: false,
        });
      } else {
        userMessage(
          "Kunde inte skapa årsrapportomgång: " + response.message,
          "error"
        );
      }
    } catch (error) {
      userMessage("Något gick fel kontakta Admin: " + error, "error");
    }
  };

  return (
    <Paper className={classes.manageSection}>
      <Typography variant="h5" gutterBottom>
        Årliga Rapportperioder
      </Typography>
      <List className={classes.roundsList}>
        {rounds.map((round) => (
          <ListItem key={round.id}>
            <ListItemText
              primary={`${new Date(round.start_date).toLocaleDateString(
                "sv-SE"
              )} till ${new Date(round.end_date).toLocaleDateString("sv-SE")}`}
              secondary={`${round.report_count} rapporter`}
            />
          </ListItem>
        ))}
      </List>
      <Typography variant="h6" gutterBottom>
        Skapa Ny Period
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
                locale="sv"
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
                locale="sv"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={newRound.is_active}
                    onChange={(e) =>
                      setNewRound({ ...newRound, is_active: e.target.checked })
                    }
                    name="is_active"
                    color="primary"
                  />
                }
                label="Aktiv"
              />
            </Grid>
            <Grid item xs={12}>
              <Button type="submit" variant="contained" color="primary">
                Skapa Period
              </Button>
            </Grid>
          </Grid>
        </MuiPickersUtilsProvider>
      </form>
    </Paper>
  );
};

export default YearlyReportRounds;
