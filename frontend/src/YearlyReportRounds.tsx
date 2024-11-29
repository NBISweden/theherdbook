import React, { useState, useEffect } from "react";
import { get, post } from "./communication";

interface YearlyReportRound {
  id: number;
  start_date: string;
  end_date: string;
  description: string;
  report_count: number;
}

const YearlyReportRounds: React.FC = () => {
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
    <div className="manage-section">
      <h2>Yearly Report Rounds</h2>
      <ul className="rounds-list">
        {rounds.map((round) => (
          <li key={round.id}>
            <strong>{round.start_date}</strong> to{" "}
            <strong>{round.end_date}</strong> - {round.description} (
            <strong>{round.report_count}</strong> reports)
          </li>
        ))}
      </ul>
      <h3>Create New Round</h3>
      <form onSubmit={handleSubmit} className="round-form">
        <label>
          Start Date:
          <input
            type="date"
            name="start_date"
            value={newRound.start_date}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          End Date:
          <input
            type="date"
            name="end_date"
            value={newRound.end_date}
            onChange={handleChange}
            required
          />
        </label>
        <label>
          Description:
          <input
            type="text"
            name="description"
            value={newRound.description}
            onChange={handleChange}
          />
        </label>
        <button type="submit">Create Round</button>
      </form>
    </div>
  );
};

export default YearlyReportRounds;
