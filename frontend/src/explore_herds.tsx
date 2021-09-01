/**
 * @file This file contains the ExploreHerds function. This function is used for
 * selecting herds and displaying them with the Herds function.
 */
import React from "react";
import { Tabs, Tab } from "@material-ui/core/";
import { Box } from "@material-ui/core";
import { HerdView } from "@app/herd_view";
import { Genebank, Herd, herdLabel } from "@app/data_context_global";
import { useDataContext } from "@app/data_context";

export function ExploreHerds({ id }: { id: number | undefined }) {
  const { genebanks } = useDataContext();
  const [herdTab, setHerdTab] = React.useState(0);
  const [herd, setHerd] = React.useState(undefined as any);
  const [genebank, setGenebank] = React.useState(undefined as Genebank | any);

  const herdChange = (event: React.ChangeEvent<{}>, newValue: number) => {
    setHerdTab(newValue);
    if (genebank) {
      setHerd(genebank.herds[newValue].herd);
    }
  };

  React.useEffect(() => {
    const currentGenebank = genebanks.find((g) => g.id == id);
    if (currentGenebank) {
      setGenebank(currentGenebank);
      if (herd == undefined && currentGenebank.herds.length > 0) {
        setHerd(currentGenebank.herds[0].herd);
      }
    }
  }, [genebanks, id]);

  return (
    <>
      <div className="sidebar">
        <Tabs
          orientation="vertical"
          variant="scrollable"
          value={herdTab}
          onChange={herdChange}
          className="verticalTabs"
        >
          {genebank &&
            genebank.herds
              .sort((a: Herd, b: Herd) => +a.herd - +b.herd)
              .map((h: any, i: number) => {
                return <Tab key={i} label={herdLabel(h)} />;
              })}
        </Tabs>
      </div>

      <Box className="controls">
        <HerdView id={herd} />
      </Box>
    </>
  );
}
