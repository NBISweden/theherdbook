/**
 * @file This file contains the form that allows a user to choose mother and father to calculate coefficient of inbreeding
 */
import React from "react";
import { Link, useRouteMatch, useHistory } from "react-router-dom";

import { makeStyles } from "@material-ui/core/styles";
import { Autocomplete } from "@material-ui/lab";
import { createFilterOptions } from "@material-ui/lab/Autocomplete";
import { TextField, Button, Typography, Paper } from "@material-ui/core";

import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";

import DateFnsUtils from "@date-io/date-fns";

import {
  getIndividuals,
  toLimitedIndividuals,
  individualLabel,
  Individual,
  LimitedIndividual,
  Genebank,
  dateFormat,
} from "@app/data_context_global";
import { useUserContext } from "@app/user_context";
import { useDataContext } from "@app/data_context";
import { useMessageContext } from "@app/message_context";
import { InbreedingRecommendation } from "@app/testbreed_recommendation";

const useStyles = makeStyles({
  title: {
    fontSize: "2em",
    fontWeight: "bold",
    paddingLeft: "20px",
  },
  buttonBar: {
    margin: "5px 5px 5px 20px",
  },
  form: {
    width: "100%",
    height: "100%",
    padding: "10px",
    paddingBottom: "90px",
    display: "flex",
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  chooseAncestor: {
    padding: "2px",
    margin: "20px",
    borderSizing: "border-box",
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    flexBasis: "45%",
  },
  lineBreak: {
    flexBasis: "100%",
    height: "0px",
  },
  inputAncestor: {
    padding: "3px",
    flexBasis: "45%",
    margin: "6px",
  },
  bottomButton: {
    margin: "15px",
    padding: "10px",
    flexBasis: "15%",
    borderRadius: "5px",
  },
});

const inputVariant = "outlined";

export interface testBreedIndividuals {
  male: Individual | null;
  female: Individual | null;
  maleGF: LimitedIndividual | null;
  maleGM: LimitedIndividual | null;
  femaleGF: LimitedIndividual | null;
  femaleGM: LimitedIndividual | null;
}

export interface ancestorLabels {
  maleGFLabel: string;
  maleGMLabel: string;
  femaleGFLabel: string;
  femaleGMLabel: string;
}

const emptyIndividuals: testBreedIndividuals = {
  male: null,
  female: null,
  maleGF: null,
  maleGM: null,
  femaleGF: null,
  femaleGM: null,
};

const emptyLabels: ancestorLabels = {
  maleGFLabel: "",
  maleGMLabel: "",
  femaleGFLabel: "",
  femaleGMLabel: "",
};

/**
 * Form where mother or female grandparents and father or male grandparents
 * can be chosen out of the active females and males in the chosen genebank.
 * The chosen ancestors will be used to calculate coefficient of inbreeding
 */
export function InbreedingForm() {
  const style = useStyles();
  const { url } = useRouteMatch();
  const history = useHistory();
  const { user } = useUserContext();
  const is_admin = !!(user?.is_manager || user?.is_admin);
  const is_owner = !!(user?.is_owner && user.is_owner.length > 0);
  const { genebanks } = useDataContext();
  const [genebank, setGenebank] = React.useState(
    undefined as Genebank | undefined
  );
  const { popup } = useMessageContext();
  const [individuals, setIndividuals] = React.useState(
    emptyIndividuals as testBreedIndividuals
  );
  const [labels, setLabels] = React.useState(emptyLabels as ancestorLabels);
  let defaultDate = new Date();
  defaultDate.setFullYear(defaultDate.getFullYear() - 10);
  const [fromDate, setFromDate] = React.useState(defaultDate as Date);
  // Updates which genebank is targeted
  const subpath = location.pathname.replace(url, "").trim().replace(/\//, "");
  React.useLayoutEffect(() => {
    if (!subpath && genebanks.length > 0) {
      history.push(`${url}/${genebanks[0].name}`);
    } else if (genebanks.length > 0) {
      const targetGenebank = genebanks.find(
        (g: Genebank) => g.name.toLowerCase() == subpath.toLowerCase()
      );
      if (targetGenebank && targetGenebank !== genebank) {
        setGenebank(targetGenebank);
        setIndividuals(emptyIndividuals);
        setLabels(emptyLabels);
      }
    }
  }, [subpath, genebank, genebanks]);

  const filterOptions = createFilterOptions<Individual>({
    limit: 300,
  });

  const femaleGrandParentDefined = individuals.femaleGF && individuals.femaleGM;
  const maleGrandParentDefined = individuals.maleGF && individuals.maleGM;

  const inbreedCalcPossible =
    (individuals.female && individuals.male) ||
    (femaleGrandParentDefined && maleGrandParentDefined) ||
    (individuals.female && maleGrandParentDefined) ||
    (individuals.male && femaleGrandParentDefined);

  const [activeMalesLimited, setActiveMalesLimited] = React.useState([]);
  const [activeFemalesLimited, setActiveFemalesLimited] = React.useState([]);

  const [activeMales, setActiveMales] = React.useState([]);
  const [activeFemales, setActiveFemales] = React.useState([]);

  React.useEffect(() => {
    setActiveFemales(
      getIndividuals("female", true, genebank, fromDate, undefined)
    );
    setActiveMales(getIndividuals("male", true, genebank, fromDate, undefined));
    setActiveFemalesLimited(
      toLimitedIndividuals(
        getIndividuals("female", true, genebank, fromDate, undefined)
      )
    );
    setActiveMalesLimited(
      toLimitedIndividuals(
        getIndividuals("male", true, genebank, fromDate, undefined)
      )
    );
  }, [fromDate, genebank]);

  return (
    <>
      <Paper>
        <Typography variant="h5" className={style.title}>
          Provparning
        </Typography>
        <div className={style.buttonBar}>
          {genebanks.length > 1 &&
            genebanks.map((g: Genebank, i: number) => {
              return (
                <Link to={`${url}/${g.name}`} key={g.id}>
                  <Button
                    variant="contained"
                    value={g.id}
                    color={
                      genebank && genebank.id == g.id ? "primary" : "default"
                    }
                  >
                    {g.name}
                  </Button>
                </Link>
              );
            })}
        </div>
        <div className={style.lineBreak}></div>
        <form className={style.form}>
          <MuiPickersUtilsProvider utils={DateFnsUtils}>
            {is_admin ||
              (is_owner && (
                <KeyboardDatePicker
                  autoOk
                  variant="inline"
                  inputVariant={inputVariant}
                  disableFuture
                  className="simpleField"
                  label="Äldsta födelsedatum"
                  format={dateFormat}
                  value={fromDate}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  onChange={(value: Date) => {
                    fromDate && setFromDate(value);
                  }}
                />
              ))}
          </MuiPickersUtilsProvider>
          <div className={style.chooseAncestor}>
            <Autocomplete
              className={style.inputAncestor}
              options={activeFemales}
              getOptionLabel={(option: Individual) => individualLabel(option)}
              value={individuals.female}
              onChange={(event, newValue) => {
                setIndividuals({
                  ...individuals,
                  ...{ female: newValue, femaleGF: null, femaleGM: null },
                });
                setLabels({
                  ...labels,
                  ...{
                    femaleGFLabel: newValue
                      ? individualLabel(newValue.father)
                      : "",
                    femaleGMLabel: newValue
                      ? individualLabel(newValue.mother)
                      : "",
                  },
                });
              }}
              filterOptions={filterOptions}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Välj mor"
                  helperText="Om ännu ej registrerad, välj morföräldrar nedan"
                  variant={inputVariant}
                />
              )}
            />
            <div className={style.lineBreak}></div>
            <Autocomplete
              className={style.inputAncestor}
              disabled={individuals.female ? true : false}
              options={activeFemalesLimited}
              getOptionLabel={(option: LimitedIndividual) =>
                individualLabel(option)
              }
              getOptionSelected={(option, value) => option.id === value.id}
              value={individuals.femaleGM}
              // FEEDBACK, is there a possibility for individuals to not have a registered mother/father?
              // Is '' a valid input in those cases?
              inputValue={labels.femaleGMLabel}
              onInputChange={(event, newValue) => {
                if (event) {
                  setLabels({ ...labels, ...{ femaleGMLabel: newValue } });
                }
              }}
              onChange={(event, newValue) => {
                setIndividuals({ ...individuals, ...{ femaleGM: newValue } });
                setLabels({
                  ...labels,
                  ...{
                    femaleGMLabel: newValue ? individualLabel(newValue) : "",
                  },
                });
              }}
              filterOptions={filterOptions}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Välj mormor"
                  variant={inputVariant}
                />
              )}
            />
            <Autocomplete
              className={style.inputAncestor}
              disabled={individuals.female ? true : false}
              getOptionSelected={(option, value) => option.id === value.id}
              options={activeMalesLimited}
              getOptionLabel={(option: LimitedIndividual) =>
                individualLabel(option)
              }
              value={individuals.femaleGF}
              inputValue={labels.femaleGFLabel}
              onInputChange={(event, newValue) => {
                if (event) {
                  setLabels({ ...labels, ...{ femaleGFLabel: newValue } });
                }
              }}
              onChange={(event, newValue) => {
                setIndividuals({ ...individuals, ...{ femaleGF: newValue } });
                setLabels({
                  ...labels,
                  ...{
                    femaleGFLabel: newValue ? individualLabel(newValue) : "",
                  },
                });
              }}
              filterOptions={filterOptions}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Välj morfar"
                  variant={inputVariant}
                />
              )}
            />
          </div>
          <div className={style.chooseAncestor}>
            <Autocomplete
              className={style.inputAncestor}
              options={activeMales}
              getOptionLabel={(option: Individual) => individualLabel(option)}
              value={individuals.male}
              onChange={(event, newValue) => {
                setIndividuals({
                  ...individuals,
                  ...{ male: newValue, maleGF: null, maleGM: null },
                });
                setLabels({
                  ...labels,
                  ...{
                    maleGFLabel: newValue
                      ? individualLabel(newValue.father)
                      : "",
                    maleGMLabel: newValue
                      ? individualLabel(newValue.mother)
                      : "",
                  },
                });
              }}
              filterOptions={filterOptions}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Välj far"
                  helperText="Om ännu ej registrerad, välj farföräldrar nedan"
                  variant={inputVariant}
                />
              )}
            />
            <div className={style.lineBreak}></div>
            <Autocomplete
              className={style.inputAncestor}
              disabled={individuals.male ? true : false}
              options={activeFemalesLimited}
              getOptionLabel={(option: LimitedIndividual) =>
                individualLabel(option)
              }
              getOptionSelected={(option, value) => option.id === value.id}
              value={individuals.maleGM}
              // FEEDBACK, is there a possibility for individuals to not have a registered mother/father?
              // Is '' a valid input in those cases?
              inputValue={labels.maleGMLabel}
              onInputChange={(event, newValue) => {
                if (event) {
                  setLabels({ ...labels, ...{ maleGMLabel: newValue } });
                }
              }}
              onChange={(event, newValue) => {
                setIndividuals({ ...individuals, ...{ maleGM: newValue } });
                setLabels({
                  ...labels,
                  ...{
                    maleGMLabel: newValue ? individualLabel(newValue) : "",
                  },
                });
              }}
              filterOptions={filterOptions}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Välj farmor"
                  variant={inputVariant}
                />
              )}
            />
            <Autocomplete
              className={style.inputAncestor}
              disabled={individuals.male ? true : false}
              options={activeMalesLimited}
              getOptionLabel={(option: LimitedIndividual) =>
                individualLabel(option)
              }
              getOptionSelected={(option, value) => option.id === value.id}
              value={individuals.maleGF}
              inputValue={labels.maleGFLabel}
              onInputChange={(event, newValue) => {
                if (event) {
                  setLabels({ ...labels, ...{ maleGFLabel: newValue } });
                }
              }}
              onChange={(event, newValue) => {
                setIndividuals({ ...individuals, ...{ maleGF: newValue } });
                setLabels({
                  ...labels,
                  ...{
                    maleGFLabel: newValue ? individualLabel(newValue) : "",
                  },
                });
              }}
              filterOptions={filterOptions}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Välj farfar"
                  variant={inputVariant}
                />
              )}
            />
          </div>
          <div className={style.lineBreak}></div>
          <Button
            className={style.bottomButton}
            variant="contained"
            color="primary"
            disabled={!inbreedCalcPossible}
            onClick={() =>
              popup(
                <InbreedingRecommendation
                  chosenAncestors={individuals}
                  genebankId={genebank?.id}
                />,
                undefined
              )
            }
          >
            Beräkna inavelkoefficient
          </Button>
        </form>
      </Paper>
    </>
  );
}
