/**
 * @file This file displays the calculated coefficient of inbreeding (COI)
 * of the offspring of chosen ancestors and the resulting recommendations
 * based on that COI.
 */
import React from "react";
import {
  AppBar,
  Box,
  Tabs,
  Tab,
  Tooltip,
  CircularProgress,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  Typography,
} from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import CheckCircleSharpIcon from "@material-ui/icons/CheckCircleSharp";
import CancelSharpIcon from "@material-ui/icons/CancelSharp";
import HelpOutlineIcon from "@material-ui/icons/HelpOutline";
import { Genebank, individualLabel } from "./data_context_global";
import { useDataContext } from "@app/data_context";
import { get, post } from "@app/communication";
import { testBreedPedigree } from "@app/pedigree";
import { useMessageContext } from "@app/message_context";
import { testBreedIndividuals } from "@app/testbreed_form";
import { TestbreedPedigreView } from "@app/testbreed_pedigree_view";

const useStyles = makeStyles({
  container: {
    display: "block",
    width: "80vw",
    height: "70vh",
    minWidth: "400px",
    minHeight: "500px",
  },
  loading: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  inbreedCoefficient: {
    width: "45%",
    marginTop: "30px",
    borderStyle: "solid",
    borderColor: "#d3d3d3",
    borderWidth: "1px",
  },
  tableCell: {
    padding: "5px",
    fontSize: "1.25em",
  },
  recommendation: {
    alignItems: "center",
    fontSize: "1.30em",
  },
  fillWidth: {
    width: "100%",
  },
  netWorkConfiguration: {
    width: "30%",
    height: "30%",
    marginTop: "30px",
  },
  generationsInput: {
    width: "140px",
    margin: "5px 0px 5px 0px",
  },
  toggle: {
    margin: "5px 0px 5px 0px",
  },
});

/**
 * Requests backend to get calculated coefficient of inbreeding (COI)
 * based on the chosen ancestors. The COI is displayed, as well as
 * recommendations based on how the COI compares to the genebank specific
 * threshold. In addition, a pedigree is available where users can see the
 * pedigree of the chosen ancestors and highlight their common ancestors
 */
export function InbreedingRecommendation({
  chosenAncestors,
  genebank,
}: {
  chosenAncestors: testBreedIndividuals;
  genebank: Genebank | undefined;
}) {
  const style = useStyles();
  const { userMessage } = useMessageContext();
  const [offspringCOI, setOffspringCOI] = React.useState(
    undefined as number | undefined
  );
  const [activeTab, setActiveTab] = React.useState("COI" as TabValue);
  let generationsOptions: number[] = [];
  for (let i = 3; i < 8; i++) {
    generationsOptions.push(i);
  }

  // Send request with chosen ancestors to /api/testbreed to
  // get COI of their potential offspring
  React.useEffect(() => {
    setOffspringCOI(undefined);
    let payload = { genebankId: genebank?.id };
    Object.entries(chosenAncestors).forEach(([key, value]) => {
      if (value) {
        payload[key] = value.number;
      }
    });
    post("/api/testbreed", payload).then(
      (data: any) => {
        setOffspringCOI(data.offspringCOI);
        console.log("R-api data", data);
      },
      (error) => {
        console.error(error);
        userMessage(
          "Något gick fel i kontakt med R-api, vänligen kontakta Admin.",
          "error"
        );
      }
    );
  }, [chosenAncestors]);

  //TODO, error handling
  let calculationError = false;
  let thresholdCOI = genebank?.id === 1 ? 4 : 15;
  let beneficialCOI = offspringCOI ? offspringCOI <= thresholdCOI : false;

  let mother = chosenAncestors["female"]
    ? individualLabel(chosenAncestors["female"])
    : `♀(${chosenAncestors["femaleGM"].name}+${chosenAncestors["femaleGF"].name})`;

  let father = chosenAncestors["male"]
    ? individualLabel(chosenAncestors["male"])
    : `♂(${chosenAncestors["maleGM"].name}+${chosenAncestors["maleGF"].name})`;

  let recommendationText;
  let recommendationSymbol;
  if (calculationError) {
    recommendationText = "Något gick fel i beräkningen";
    recommendationSymbol = (
      <CancelSharpIcon style={{ color: "#F44304", paddingRight: "4px" }} />
    );
  } else if (beneficialCOI) {
    recommendationText = "Föreningen rekommenderar parningen";
    recommendationSymbol = (
      <CheckCircleSharpIcon style={{ color: "#4CB950", paddingRight: "4px" }} />
    );
  } else {
    recommendationText = "Föreningen rekommenderar EJ parningen";
    recommendationSymbol = (
      <CancelSharpIcon style={{ color: "#F44304", paddingRight: "4px" }} />
    );
  }

  type TabValue = "COI" | "pedigree";

  interface TabPanelProps
    extends React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLDivElement>,
      HTMLDivElement
    > {
    children?: React.ReactNode;
    index: any;
    value: any;
  }

  function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;

    return (
      <div
        role="tabpanel"
        hidden={value !== index}
        id={`full-width-tabpanel-${index}`}
        aria-labelledby={`full-width-tab-${index}`}
        {...other}
      >
        {value === index && <Box>{children}</Box>}
      </div>
    );
  }

  return (
    <>
      {offspringCOI ? (
        <div className={style.container}>
          <h1>
            {" "}
            Provparning {mother} och {father}
          </h1>
          <AppBar position="static" color="default">
            <Tabs
              value={activeTab}
              onChange={(event: React.ChangeEvent<{}>, newValue: TabValue) => {
                setActiveTab(newValue);
              }}
              indicatorColor="primary"
              textColor="primary"
              variant="fullWidth"
            >
              <Tab label="Beräkning inavelskoefficient" value="COI" />
              <Tab label="Släktträd för potentiell avkomma" value="pedigree" />
            </Tabs>
          </AppBar>
          <TabPanel value={activeTab} index="COI">
            {!calculationError && (
              <Table className={style.inbreedCoefficient} size="small">
                <TableHead>
                  <TableRow>
                    <TableCell className={style.tableCell}></TableCell>
                    <TableCell className={style.tableCell} align="left">
                      Beräknad för avkomma
                    </TableCell>
                    <TableCell className={style.tableCell} align="left">
                      Genomsnitt
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell
                      className={style.tableCell}
                      component="th"
                      scope="row"
                    >
                      Inavelskoefficient
                    </TableCell>
                    <TableCell className={style.tableCell} align="left">
                      {offspringCOI}
                    </TableCell>
                    <TableCell className={style.tableCell} align="left">
                      {thresholdCOI}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
            <Typography variant="h6" className="pSpace">
              <p></p>
              Inaveln för {genebank?.name} ligger i genomsnitt på {thresholdCOI}
              %. Du bör sikta på att hamna under eller lika med dessa värden,
              men det behöver inte vara fel att få ett högre värde för den
              tänkta parningen, om andra faktorer talar för att kombinationen
              hona / hane är bra. Vänligen läs de fullständiga{" "}
              <a
                target={"_blank"}
                rel={"noopener noreferrer"}
                href="https://drive.google.com/file/d/1GAC5Gjbq9KOQwxcDuAfGxHotfnpoaq-y/view?usp=share_link"
              >
                avelsråden
              </a>{" "}
              innan du parar dessa kaniner!
            </Typography>
            {/* <p className={style.recommendation}> {recommendationSymbol} {recommendationText} </p> */}
          </TabPanel>
          <TabPanel value={activeTab} index="pedigree">
            <div className={style.fillWidth}>
              <TestbreedPedigreView
                chosenAncestors={chosenAncestors}
                generations={4}
              ></TestbreedPedigreView>
            </div>
          </TabPanel>
        </div>
      ) : (
        <div className={style.loading}>
          <h2>Beräknar provparning</h2>
          <CircularProgress />
        </div>
      )}
    </>
  );
}
