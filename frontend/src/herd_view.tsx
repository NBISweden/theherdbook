/**
 * @file This file contains the HerdView function. This function fetches herd
 *       for a given `id` (parsed from the url), as well as the individuals
 *       belonging to that herd.
 */
import React from "react";
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
  const {
    genebanks,
    herdChangeListener,
    herdListener,
    setHerdChangeListener,
    setHerdListener,
  } = useDataContext();
  const [algo, set_algo] = React.useState("Martin" as "Martin" | "Dan");
  const [pedigreeView, setPedigreeView] = React.useState(false as boolean);

  const triggerPedigreeViewState = () => {
    setPedigreeView(true);
  };
  const pedigree = React.useMemo(
    () => pedigreeView && herdPedigree(genebanks, id, 3, algo),
    [genebanks, id, algo, pedigreeView]
  );

  const getHerd = () => {
    if (id) {
      setHerdListener(id);
      get(`/api/herd/${id}`).then(
        (data: Herd) => data && setHerd(data),
        (error) => {
          console.error(error);
          userMessage(error, "error");
        }
      );
    }
  };

  React.useEffect(() => {
    getHerd();
  }, [id, herdChangeListener]);

  React.useEffect(() => {
    if (herd && herd.individuals) {
      setHerdIndividuals(herd.individuals);
    }
  }, [herd]);

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
            <Tab
              label="Lista över individer"
              value="list"
              onClick={() => {
                getHerd();
              }}
            />
            <Tab
              label="Parningstillfällen"
              disabled={!user?.canEdit(id)}
              value="breeding"
            />
            <Tab
              label="Släktträd för besättningen"
              value="pedigree"
              onClick={triggerPedigreeViewState}
            />
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
                { field: "is_active", label: "Visa inaktiva djur" },
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
          {pedigreeView && (
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
