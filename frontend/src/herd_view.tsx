/**
 * @file This file contains the HerdView function. This function fetches herd
 *       for a given `id` (parsed from the url), as well as the individuals
 *       belonging to that herd.
 */
import React from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
  AppBar,
  Box,
  CircularProgress,
  Paper,
  Tab,
  Tabs,
} from "@material-ui/core";
import { get } from "@app/communication";
import { Herd, Individual } from "@app/data_context_global";
import { HerdForm } from "@app/herdForm";
import { useMessageContext } from "@app/message_context";
import { useDataContext } from "@app/data_context";
import { herdPedigree } from "@app/pedigree";
import { PedigreeNetwork } from "@app/pedigree_plot";
import { FilterTable } from "@app/filter_table";
import { IndividualView } from "@app/individual_view";
import { IndividualEdit } from "@app/individual_edit";
import { useUserContext } from "@app/user_context";
import { BreedingList } from "./breeding_list";

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

type TabValue = "list" | "pedigree" | "breeding";

/**
 * Shows herd information, with a list of all individuals belonging to that
 * herd.
 */
export function HerdView({ id }: { id: string | undefined }) {
  const [herd, setHerd] = React.useState(undefined as Herd | undefined);
  const [herdIndividuals, setHerdIndividuals] = React.useState(
    [] as Individual[]
  );
  const [activeTab, setActiveTab] = React.useState("list" as TabValue);
  const { userMessage, popup } = useMessageContext();
  const { user } = useUserContext();
  const { genebanks } = useDataContext();
  const [algo, set_algo] = React.useState("Martin" as "Martin" | "Dan");
  const pedigree = React.useMemo(
    () => herdPedigree(genebanks, id, 5, algo),
    [genebanks, id, algo]
  );

  React.useEffect(() => {
    if (id) {
      get(`/api/herd/${id}`).then(
        (data: Herd) => data && setHerd(data),
        (error) => {
          console.error(error);
          userMessage(error, "error");
        }
      );
    }
  }, [id]);

  React.useEffect(() => {
    if (herd && genebanks && herd.individuals) {
      const genebank = genebanks.find((g) =>
        g.herds.some((h) => h.herd == herd.herd)
      );
      const individualIds = herd.individuals.map((i) => i.number);
      if (genebank && genebank.individuals != null) {
        const individualsList = genebank.individuals.filter((i) =>
          individualIds.includes(i.number)
        );
        setHerdIndividuals(individualsList);
      }
    }
  }, [herd, genebanks]);

  return (
    <>
      <Paper className="container">
        {herd && <HerdForm id={id} view="info" fromHerd={herd} />}

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
            <Tab label="Lista över individer" value="list" />
            <Tab label="Parningstillfällen" value="breeding" />
            <Tab label="Släktträd för besättningen" value="pedigree" />
          </Tabs>
        </AppBar>

        <TabPanel value={activeTab} index="list">
          {herdIndividuals.length ? (
            <FilterTable
              id={id}
              individuals={herdIndividuals}
              title={"Individer i besättningen"}
              filters={[
                { field: "alive", label: "Visa döda" },
                { field: "active", label: "Visa inaktiva djur" },
              ]}
              action={
                user?.canEdit(id)
                  ? (event: any, rowData: any) => {
                      popup(<IndividualEdit id={rowData.number} />);
                    }
                  : undefined
              }
            />
          ) : (
            <div className="loading">
              <h2>Loading Individuals</h2>
              <CircularProgress />
            </div>
          )}
        </TabPanel>
        <TabPanel value={activeTab} index="breeding">
          <BreedingList id={id} />
        </TabPanel>
        <TabPanel value={activeTab} index="pedigree">
          <div style={{ marginTop: 10, display: "flex" }}>
            <label style={{ margin: "auto" }}>
              Algorithm:
              <select
                style={{ marginLeft: 10 }}
                onChange={(e) => e.target && set_algo(e.target.value as any)}
              >
                <option value="Martin">Martin</option>
                <option value="Dan">Dan</option>
              </select>
            </label>
          </div>
          {pedigree && (
            <PedigreeNetwork
              pedigree={pedigree}
              onClick={(node: string) =>
                popup(<IndividualView id={node} />, `/individual/${node}`)
              }
            />
          )}
        </TabPanel>
      </Paper>
    </>
  );
}
