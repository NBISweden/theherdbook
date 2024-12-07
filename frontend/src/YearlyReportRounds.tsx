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
} from "@material-ui/core";
import {
  KeyboardDatePicker,
  MuiPickersUtilsProvider,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import svLocale from "date-fns/locale/sv";
import { makeStyles } from "@material-ui/core/styles";
import "date-fns/locale/sv";

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
  const [newRound, setNewRound] = useState({
    start_date: new Date(),
    end_date: new Date(),
  });

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
    setNewRound({ ...newRound, [name]: date });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        start_date: newRound.start_date.toISOString().split("T")[0],
        end_date: newRound.end_date.toISOString().split("T")[0],
      };
      const response = await post("/api/manage/yearly_report_round", payload);
      if (response.status === "success") {
        fetchRounds();
        setNewRound({
          start_date: new Date(),
          end_date: new Date(),
        });
      }
    } catch (error) {
      console.error("Error creating yearly report round:", error);
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
            <Grid item xs={12} sm={6}>
              <KeyboardDatePicker
                label="Startdatum"
                format="dd/MM/yyyy"
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
                format="dd/MM/yyyy"
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
