/**
 * @file This file contains the UserForm function. This function is used to
 * change user information and permissions.
 */

import React from "react";
import { unstable_batchedUpdates } from "react-dom";
import {
  TextField,
  Checkbox,
  FormControlLabel,
  Button,
  TableContainer,
  Paper,
  Table,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { get, post, patch } from "@app/communication";
import { useDataContext } from "@app/data_context";
import {
  Herd,
  Genebank,
  herdLabel,
  ServerMessage,
  inputVariant,
  OptionType,
} from "@app/data_context_global";
import { useHistory } from "react-router-dom";
import { useMessageContext } from "@app/message_context";
import { useUserContext } from "./user_context";
import { NameID } from "@app/data_context_global";
import { Autocomplete } from "@material-ui/lab";

// Define styles for tab menu
const useStyles = makeStyles({
  form: {
    borderLeft: "1px solid rgba(0,0,0,0.1)",
    paddingLeft: "0.5cm",
    display: "flex",
    flexDirection: "column",
  },
  simpleField: {
    width: "400px",
  },
  permissionTable: {},
  permissionTitle: {
    fontWeight: "bold",
    textTransform: "capitalize",
  },
  hidden: {
    visibility: "hidden",
  },
});

/** description of a user to manage */
export interface ManagedUser {
  id: number | "new";
  email: string;
  username: string;
  fullname: string;
  validated: boolean;
  privileges: any;
  password?: string;
}

const defaultValues: ManagedUser = {
  id: -1,
  email: "",
  username: "",
  fullname: "",
  validated: false,
  privileges: [],
  password: "",
};

/** These are the permission levels that can be added using the user form */
const PermissionLevels = [
  { value: "owner", label: "Owner" },
  { value: "manager", label: "Manager" },
  { value: "viewer", label: "Viewer" },
];
/**
 * Provides a form for changing user metadata and user roles. The form will
 * load data for the user id `id` if it's a number, or for a new user if `id` is
 * `undefined` or `'new'`.
 */
export function UserForm({ id }: { id: number | "new" | undefined }) {
  const { genebanks, users, loadData, setUsers } = useDataContext();
  const { userMessage } = useMessageContext();
  const { user } = useUserContext();
  const [userToEdit, setUser] = React.useState({
    ...defaultValues,
  } as ManagedUser);
  const [isNew, setNew] = React.useState(false);
  const [level, setLevel] = React.useState(PermissionLevels[0] as OptionType);
  const [newPassword, setNewPassword] = React.useState("");
  const [genebank, setGenebank] = React.useState(
    genebanks.length > 0
      ? { value: "" + genebanks[0].id, label: genebanks[0].name }
      : (null as OptionType | null)
  );
  const [herd, setHerd] = React.useState(null as any);
  const history = useHistory();
  const classes = useStyles();

  const loadUser = (id: number) => {
    get(`/api/manage/user/${id}`).then(
      (data: ServerMessage) => {
        if (data.status == "success") {
          unstable_batchedUpdates(() => {
            setUser(data?.data);
            setNew(false);
          });
        } else {
          unstable_batchedUpdates(() => {
            if (data.message) {
              userMessage(data?.message, "error");
            }
            setNew(true);
          });
        }
      },
      (error) => console.error(error)
    );
  };

  async function changePassword() {
    await post("/api/manage/setpassword/", {
      newpassword: newPassword,
    }).then(
      (data) => {
        userMessage("Ändrat");
      },
      (error) => {
        userMessage("Något gick fel", "error");
      }
    );
  }

  /**
   * Loads the user information for `id`, or sets the form to accept a new user.
   */
  React.useEffect(() => {
    setUser({ ...defaultValues });
    if (typeof id == "number") {
      loadUser(id);
      setNew(false);
    } else if (id == "new" || !id) {
      setNew(true);
    }
  }, [id]);

  /**
   * If `isNew` is set, this function creates a POST request to create a new
   * user in the backend, and then navigates to edit the new user. Otherwise
   * the current form is sent as an PATCH request to update the user `id`.
   */
  const submitForm = () => {
    let postData = { ...userToEdit };
    delete postData["privileges"];
    let protocol = isNew ? post : patch;
    protocol(`/api/manage/user/${id == "new" ? 0 : id}`, postData).then(
      (data: ServerMessage) => {
        switch (data.status) {
          case "updated":
          case "unchanged":
            const newUsers: NameID[] = users.filter(
              (u: NameID) => u.id != postData.id
            );
            newUsers.push({
              email: postData.email,
              id: +postData.id,
              name: postData.username,
              fullname: postData.fullname,
            });
            setUsers(newUsers);
            userMessage("Changes saved", "success");
            break; // updated user
          case "success":
          case "created":
            const newUserId = data.data;
            unstable_batchedUpdates(() => {
              setNew(false);
              const new_user = {
                email: userToEdit.email,
                id: newUserId,
                name: userToEdit.username,
                fullname: userToEdit.fullname,
              };
              setUsers([...users, new_user]);
              userMessage("User saved", "success");
            });
            history.push(`/manage/user/${newUserId}`);
            break; // added user
          default:
            userMessage("Error: " + data?.message, "error");
            console.warn("status:", data); // something went wrong
        }
      },
      (error) => console.error(error)
    );
  };

  /**
   * Returns a list of all herds of the genebank identified by `genebankId`,
   * formatted as react-select options, i.e. `{value: <id>, label: <name>}`.
   *
   * @param genebankId Id of the genebank to get herds from.
   */
  const genebankHerds = (genebankId: string | undefined): OptionType[] => {
    if (genebankId === undefined || genebank === null) {
      return [];
    }

    const currentGenebank = genebanks.find(
      (g: Genebank) => "" + g.id == genebank.value
    );
    if (currentGenebank === undefined) {
      return [];
    }
    return currentGenebank.herds.map((h) => {
      return { value: "" + h.id, label: herdLabel(h) };
    });
  };

  /**
   * Converts a herd database id to a human readable label formatted as:
   * '<herd-id>' or '<herd-id> - <herd-name>' depending on if the herd has a
   * herd name or not.
   *
   * @param herdId database id of the herd to convert.
   */
  const herdIdToLabel = (herdId: number) => {
    let allHerds: Herd[] = genebanks.flatMap((g: Genebank) => g.herds);
    const targetHerd = allHerds.find((h: Herd) => h.id == herdId);
    if (!targetHerd) {
      return "Unknown";
    }
    return herdLabel(targetHerd);
  };

  /**
   * Sends an UPDATE request to update a user role in the database. Reloads the
   * user data on success.
   * @param operation an object describing an update operation.
   */
  type Operation = { action: "remove" | "add"; user: number | "new" };
  type HerdOperation = Operation & { role: "owner"; herd: number };
  type GenebankOperation = Operation & {
    role: "manager" | "viewer";
    genebank: number | undefined;
  };
  const updateRole = (operation: HerdOperation | GenebankOperation) => {
    patch("/api/manage/role", operation).then(
      (data: ServerMessage) => {
        switch (data.status) {
          case "updated":
            if (id) {
              loadUser(+id);
            }
            loadData(["users"]);
            userMessage("permissions updated", "success");
            break; // updated user
          case "unchanged":
            userMessage("User already has permission", "info");
            break;
          default: {
            if (data.message) {
              userMessage(data.message, "error");
            }
            console.error("error:", data); // "failed" or other error
          }
        }
      },
      (error) => console.error(error)
    );
  };

  return (
    <>
      {userToEdit && (
        <>
          <h2>{isNew ? "Ny användare" : userToEdit.email}</h2>
          <form className={classes.form} noValidate autoComplete="off">
            <TextField
              label="E-mail"
              type="email"
              variant={inputVariant}
              className={classes.simpleField}
              value={userToEdit.email ?? ""}
              onChange={(e) =>
                setUser({ ...userToEdit, email: e.target.value })
              }
            />
            <TextField
              label="Användarnamn"
              type="username"
              variant={inputVariant}
              className={classes.simpleField}
              value={userToEdit.username ?? ""}
              onChange={(e) =>
                setUser({ ...userToEdit, username: e.target.value })
              }
            />
            <TextField
              label="Namn"
              type="fullname"
              variant={inputVariant}
              className={classes.simpleField}
              value={userToEdit.fullname ?? ""}
              onChange={(e) =>
                setUser({ ...userToEdit, fullname: e.target.value })
              }
            />
            {isNew ? (
              <TextField
                label="Lösenord"
                type="password"
                variant={inputVariant}
                hidden={true}
                className={classes.simpleField}
                value={userToEdit.password ?? ""}
                onChange={(e) =>
                  setUser({ ...userToEdit, password: e.target.value })
                }
              />
            ) : (
              ""
            )}
            <FormControlLabel
              control={
                <Checkbox
                  color="primary"
                  checked={userToEdit.validated ?? false}
                  onChange={(e) =>
                    setUser({ ...userToEdit, validated: e.target.checked })
                  }
                />
              }
              label="Validerad"
              labelPlacement="end"
            />
          </form>
          <Button
            variant="contained"
            color="primary"
            onClick={() => submitForm()}
          >
            {isNew ? "Skapa" : "Spara"}
          </Button>
        </>
      )}

      {!isNew && (
        <>
          {user?.is_admin ? (
            <>
              <h2>Uppdatera lösenord</h2>
              <form className={classes.form} noValidate autoComplete="off">
                <TextField
                  label="Nytt lösenord"
                  type="password"
                  variant={inputVariant}
                  hidden={false}
                  className={classes.simpleField}
                  onChange={(e) => setNewPassword(e.target.value)}
                  value={newPassword}
                />
              </form>
              <p></p>
              <Button
                variant="contained"
                color="primary"
                onClick={() => changePassword()}
              >
                Byt lösenord
              </Button>
            </>
          ) : (
            <></>
          )}

          <h3>Behörigheter</h3>
          <TableContainer component={Paper}>
            <Table className={classes.permissionTable}>
              <TableHead>
                <TableRow>
                  <TableCell>Behörighet</TableCell>
                  <TableCell align="right"></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {userToEdit &&
                  userToEdit.privileges.map((role: any, i: number) => {
                    return (
                      <TableRow key={i}>
                        <TableCell component="th" scope="row">
                          <span className={classes.permissionTitle}>
                            {role.level}
                          </span>
                          {role.genebank &&
                            `, ${
                              genebanks.find(
                                (g: Genebank) => g.id == role.genebank
                              )?.name
                            }`}
                          {role.herd && `, ${herdIdToLabel(role.herd)}`}
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={() =>
                              updateRole({
                                action: "remove",
                                role: role.level,
                                user: userToEdit.id,
                                genebank: role?.genebank,
                                herd: role?.herd,
                              })
                            }
                          >
                            Ta bort
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>

          <h3>Lägg till behörighet</h3>

          <Table className={classes.permissionTable}>
            <TableBody>
              <TableRow>
                <TableCell>
                  <Autocomplete
                    options={PermissionLevels}
                    value={level}
                    getOptionLabel={(option: OptionType) => option.label}
                    getOptionSelected={(o: OptionType, v: OptionType) =>
                      o.value == v.value
                    }
                    renderInput={
                      // jscpd:ignore-start

                      (params) => (
                        <TextField
                          {...params}
                          label="Behörighet"
                          variant={inputVariant}
                          margin="normal"
                        />
                      )
                      // jscpd:ignore-end
                    }
                    onChange={(event: any, newValue: OptionType | null) => {
                      newValue && setLevel(newValue);
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Autocomplete
                    options={genebanks.map((g: Genebank) => {
                      return { value: "" + g.id, label: g.name };
                    })}
                    value={genebank}
                    getOptionLabel={(option: OptionType) => option.label}
                    getOptionSelected={(o: OptionType, v: OptionType) =>
                      o.value == v.value
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Genbank"
                        variant={inputVariant}
                        margin="normal"
                      />
                    )}
                    onChange={(event: any, newValue: OptionType | null) => {
                      newValue && setGenebank(newValue);
                      setHerd(null);
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Autocomplete
                    options={genebankHerds(genebank?.value) ?? []}
                    value={herd}
                    className={
                      level.value != "owner" ? classes.hidden : undefined
                    }
                    disabled={level.value != "owner"}
                    getOptionLabel={(option: OptionType) => option.label}
                    getOptionSelected={(o: OptionType, v: OptionType) =>
                      o.value == v.value
                    }
                    renderInput={
                      // jscpd:ignore-start
                      (params) => (
                        <TextField
                          {...params}
                          label="Besättning"
                          variant={inputVariant}
                          margin="normal"
                        />
                      )
                      // jscpd:ignore-end
                    }
                    onChange={(event: any, newValue: OptionType | null) => {
                      newValue && setHerd(newValue);
                    }}
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>

          <Button
            variant="contained"
            color="primary"
            onClick={() =>
              updateRole({
                action: "add",
                role: level.value,
                user: userToEdit ? userToEdit.id : -1,
                genebank:
                  level.value != "owner" ? +(genebank?.value ?? -1) : undefined,
                herd: level.value == "owner" ? +(herd?.value ?? -1) : undefined,
              })
            }
          >
            Lägg till
          </Button>
        </>
      )}
    </>
  );
}
