import React, { useState, useEffect } from "react";
import { get, post } from "./communication";
import {
  Button,
  Typography,
  TextField,
  Paper,
  Grid,
  List,
  ListItem,
  ListItemText,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";

interface YearlyReportRound {
  id: number;
  start_date: string;
  end_date: string;
  description: string;
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
    start_date: "",
    end_date: "",
    description: "",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await post("/api/manage/yearly_report_round", newRound);
      if (response.status === "success") {
        fetchRounds();
        setNewRound({ start_date: "", end_date: "", description: "" });
      }
    } catch (error) {
      console.error("Error creating yearly report round:", error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewRound({ ...newRound, [e.target.name]: e.target.value });
  };

  return (
    <Paper className={classes.manageSection}>
      <Typography variant="h5" gutterBottom>
        Yearly Report Rounds
      </Typography>
      <List className={classes.roundsList}>
        {rounds.map((round) => (
          <ListItem key={round.id}>
            <ListItemText
              primary={`${new Date(round.start_date).toLocaleDateString()} to ${new Date(
                round.end_date
              ).toLocaleDateString()} - ${round.description}`}
              secondary={`${round.report_count} reports`}
            />
          </ListItem>
        ))}
      </List>
      <Typography variant="h6" gutterBottom>
        Create New Round
      </Typography>
      <form onSubmit={handleSubmit} className={classes.form}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Start Date"
              type="date"
              name="start_date"
              value={newRound.start_date}
              onChange={handleChange}
              InputLabelProps={{
                shrink: true,
              }}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="End Date"
              type="date"
              name="end_date"
              value={newRound.end_date}
              onChange={handleChange}
              InputLabelProps={{
                shrink: true,
              }}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Description"
              name="description"
              value={newRound.description}
              onChange={handleChange}
              fullWidth
            />
          </Grid>
          <Grid item xs={12}>
            <Button type="submit" variant="contained" color="primary">
              Create Round
            </Button>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
};

export default YearlyReportRounds;

