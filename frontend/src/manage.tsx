/**
 * @file This file contains the Manage function. This page is used for managing
 * users and herds.
 */
import React, { useState } from "react";
import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import { Switch, Route, useLocation, useHistory } from "react-router-dom";
import { useUserContext } from "@app/user_context";
import { useDataContext } from "@app/data_context";
import {
  Genebank,
  NameID,
  herdLabel,
  userLabel,
  OptionType,
  inputVariant,
  LimitedHerd,
} from "@app/data_context_global";
import {
  Button,
  Checkbox,
  FormControlLabel,
  TextField,
} from "@material-ui/core";
import { HerdForm } from "@app/herdForm";
import { UserForm } from "@app/userForm";
import { ActiveUsers } from "@app/activeUsers";
import { Autocomplete } from "@material-ui/lab";

const useStyles = makeStyles({
  main: {
    width: "100%",
    height: "100%",
    margin: "0",
    padding: "10px",
  },
  controls: {
    padding: "15px",
  },
  leftControls: {
    maxWidth: "40%",
    minHeight: "50px",
  },
  rightControls: {
    float: "right",
    width: "40%",
  },
  hidden: {
    display: "none",
  },
  inputForm: {
    width: "100%",
    padding: "10px",
    margin: "10px 0",
    minHeight: "200px",
  },
});

/**
 * Provides management forms for users and herds.
 */
export function Manage() {
  const styles = useStyles();
  const { genebanks, users } = useDataContext();

  const history = useHistory();
  const location = useLocation();
  const { user } = useUserContext();
  const [topic, setTopic] = useState(undefined as string | undefined);
  const [genebank, setGenebank] = useState(undefined as string | undefined);
  const [target, setTarget] = useState(undefined as string | undefined);
  const [options, setOptions] = useState([] as any[]);
  const [selected, setSelected] = useState(null as any);
  const [showInactive, setShowInactive] = useState(false);
  const genebankValue = React.useMemo(() => {
    if (topic == "user" || !genebanks) {
      return null;
    }
    const genebank = genebanks.find((g) => g.name == topic);
    if (genebank) {
      return { value: genebank.id, label: genebank.name };
    }
    return null;
  }, [genebanks, topic]);

  /**
   * Set the options of the main select box to the list of current users.
   */
  const setUserOptions = () => {
    const userOptions: OptionType[] = users.map((u: NameID) => {
      return { value: "" + u.id, label: userLabel(u) };
    });
    userOptions.push({ value: "new", label: "New User" });
    setOptions(userOptions);
  };

  /**
   * Set the options to the main select box to the herds of the genebank
   * identified by `name`.
   *
   * @param name the name of the genebank to set options from
   */
  const setHerdOptions = (name: string) => {
    const dataset = genebanks.find((g: Genebank) => g.name == name);
    if (dataset) {
      const herdOptions: OptionType[] = dataset.herds.map((h: LimitedHerd) => {
        return { value: h.herd, label: herdLabel(h) };
      });
      herdOptions.push({ value: "new", label: "New Herd" });
      setOptions(herdOptions);
    }
  };

  /**
   * tries to set the current selected item in the main select box from the
   * category and path (2nd and 3rd block) of the current url.
   *
   * @param category the 2nd block of the current url, should be 'user' or the
   *     name of a genebank.
   * @param path the 3rd block of the current url, should be the identifier of
   *     an item in `category`.
   */
  const parseTarget = (category: string, path: string) => {
    if (!path) {
      setSelected(undefined);
      return;
    }

    let targetOption: any = null;
    if (category == "user" && path == "new") {
      targetOption = { value: "new", label: "New User" };
    } else if (category == "user" && !isNaN(+path)) {
      const targetUser = users.find((u: NameID) => u.id == +path);
      if (targetUser) {
        targetOption = { value: targetUser.id, label: userLabel(targetUser) };
      }
    } else if (path.length > 0 && !!path[0].match(/[a-z]/i)) {
      const dataset = genebanks.find((g: Genebank) => g.name == category);
      if (dataset) {
        const targetHerd = dataset.herds.find(
          (h: LimitedHerd) => h.herd == path
        );
        if (targetHerd) {
          targetOption = {
            value: targetHerd.herd,
            label: herdLabel(targetHerd),
          };
        }
      }
    }
    setSelected(targetOption);
  };

  const filtered = (options: OptionType[]) => {
    if (showInactive || topic == "user") {
      return options;
    }
    const genebank = genebanks.find((g) => g.name == topic);
    if (!genebank) {
      return options;
    }
    // make index just in case:
    let activeIndex: { [herd: string]: boolean | null | undefined } = {};
    genebank.herds.forEach((h) => {
      activeIndex[h.herd] = h.is_active;
    });

    return options.filter((option) => {
      // Add special case for new herds
      if (option.value == "new") {
        return true;
      }
      return activeIndex[option.value];
    });
  };

  /**
   * Parses the current url to set the current options, users and (if possible)
   * selected item.
   */
  React.useEffect(() => {
    const [_, pagepath, topicpath, selectpath] = location.pathname.split("/");
    if (pagepath != "manage" || !genebanks) {
      return;
    }
    if (topicpath) {
      setTopic(topicpath);
      console.log(topicpath);
      if (topicpath != "user" && topicpath != "active_users") {
        setGenebank(topicpath);
      } else if (!genebank && genebanks.length > 0) {
        setGenebank(genebanks[0].name);
      }
      if (topicpath == "user") {
        setUserOptions();
      } else if (topicpath == "active_users") {
        // Handle the case where topicpath is "active_users"
        // For example, you might want to call a function to fetch active users
      } else {
        setHerdOptions(topicpath);
      }
    } else if (genebanks.length > 0) {
      if (user.is_admin) {
        const defaultTopic = genebanks[0].name;
        setTopic(defaultTopic);
        setGenebank(defaultTopic);
        setHerdOptions(defaultTopic);
      } else {
        const defaultTopic = genebanks[user.is_manager[0] - 1].name;
        setTopic(defaultTopic);
        setGenebank(defaultTopic);
        setHerdOptions(defaultTopic);
      }
    }
    if (selectpath) {
      setTarget(selectpath);
      parseTarget(topicpath, selectpath);
    }
  }, [genebanks, users, location]);

  console.log("topic:", topic);
  console.log("genebank:", genebank, "target:", target);

  return (
    <>
      <Paper className={styles.main}>
        <Paper className={styles.controls}>
          <div>
            <div className={styles.rightControls}>
              <div
                className={
                  topic == "user" || topic == "active_users"
                    ? styles.hidden
                    : undefined
                }
              >
                <Autocomplete
                  options={
                    genebanks
                      ? genebanks.map((g: Genebank) => {
                          return { value: g.id, label: g.name };
                        })
                      : []
                  }
                  value={genebankValue}
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
                    newValue &&
                      history.push(
                        `/manage/${newValue.label}/${target ? target : ""}`
                      );
                  }}
                />
              </div>
            </div>
            <div className={styles.leftControls}>
              <Button
                variant="contained"
                color={
                  topic != "user" && topic != "active_users"
                    ? "primary"
                    : "default"
                }
                onClick={() =>
                  history.push(`/manage/${genebank}/${target ? target : ""}`)
                }
              >
                Besättningar
              </Button>
              <Button
                variant="contained"
                color={topic == "user" ? "primary" : "default"}
                onClick={() =>
                  history.push(`/manage/user/${target ? target : ""}`)
                }
              >
                Användare
              </Button>
              <Button
                variant="contained"
                color={topic == "active_users" ? "primary" : "default"}
                onClick={() => history.push(`/manage/active_users`)}
              >
                Lista inloggade aktiva användare
              </Button>
            </div>
          </div>
          {topic !== "active_users" && (
            <>
              <Autocomplete
                options={filtered(options) ?? []}
                value={selected}
                getOptionLabel={(option: OptionType) => option.label}
                getOptionSelected={(o: OptionType, v: OptionType) =>
                  o.value == v.value
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label={topic == "user" ? "Sök användare" : "Sök besättning"}
                    variant={inputVariant}
                    margin="normal"
                  />
                )}
                onChange={(event: any, newValue: OptionType | null) => {
                  newValue &&
                    history.push(`/manage/${topic}/${newValue.value}`);
                }}
              />
              <FormControlLabel
                disabled={!topic == "user" || topic == "active_users"}
                control={
                  <Checkbox
                    checked={showInactive}
                    onChange={(event) =>
                      setShowInactive(event.currentTarget.checked)
                    }
                    color="primary"
                  />
                }
                label="Visa inaktiva"
              />
            </>
          )}
        </Paper>

        {/* Only show the input form for the currently selected type */}
        <Switch>
          <Route path="/manage/active_users">
            <Paper className={styles.inputForm}>
              <ActiveUsers />
            </Paper>
          </Route>
          <Route path="/manage/user">
            <Paper className={styles.inputForm}>
              <UserForm id={selected?.value} />
            </Paper>
          </Route>
          <Route path="/manage/">
            <Paper className={styles.inputForm}>
              <HerdForm
                id={selected?.value}
                genebank={genebankValue?.value}
                view={"form"}
                change={false}
              />
            </Paper>
          </Route>
        </Switch>
      </Paper>
    </>
  );
}
