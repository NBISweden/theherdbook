import React, { useEffect, useState } from "react";
import {
  TableContainer,
  Paper,
  Table,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  Typography,
  TextField,
} from "@material-ui/core";

interface User {
  username: string;
  fullname: string;
  last_active: string;
}

export function ActiveUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [minutes, setMinutes] = useState(15);

  useEffect(() => {
    fetch(`/api/active_users?minutes=${minutes}`)
      .then((response) => response.json())
      .then(setUsers);
  }, [minutes]);

  const handleMinutesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setMinutes(Number(event.target.value));
  };

  return (
    <div>
      <Typography variant="h4" component="h1" gutterBottom>
        Inloggade och aktiva användare
      </Typography>
      <TextField
        label="Hur många minuter tillbaka?"
        type="number"
        variant="filled"
        value={minutes}
        onChange={handleMinutesChange}
      />
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Username</TableCell>
              <TableCell>Full Name</TableCell>
              <TableCell>Last Active</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.username}>
                <TableCell>{user.username}</TableCell>
                <TableCell>{user.fullname}</TableCell>
                <TableCell>
                  {new Date(user.last_active).toLocaleString("sv-SE")}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}
