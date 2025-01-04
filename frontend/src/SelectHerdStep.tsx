// File: SelectHerdStep.tsx

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Button,
  Typography,
  TextField,
  Dialog,
  IconButton,
} from "@material-ui/core";
import { Edit as EditIcon } from "@material-ui/icons";
import { BreedingForm } from "./breeding_form";
import { useBreedingContext } from "./breeding_context";
import { useDataContext } from "@app/data_context";
import { useMessageContext } from "@app/message_context";
import { get } from "@app/communication";
import { ExtendedBreeding } from "./data_context_global";

interface SelectHerdStepProps {
  user: any;
  genebankName: string | null;
  herdId: string | null;
  setHerdId: (id: string) => void;
  genebank?: string;
  change?: boolean;
  reportYear?: number;
  onUpdateStatus?: (status: string) => void;
}

interface RawBreeding {
  id: number;
  birth_date?: string;
  breed_date?: string;
  mother?: string;
  mother_name?: string;
  father?: string;
  father_name?: string;
  individuals?: any[];
  litter_size?: number;
  litter_size6w?: number;
  breeding_herd: string;
}

export const SelectHerdStep: React.FC<SelectHerdStepProps> = ({
  user,
  genebankName,
  herdId,
  setHerdId,
  genebank,
  change = false,
  reportYear,
  onUpdateStatus,
}): React.ReactElement => {
  const { genebanks } = useDataContext();
  const { userMessage } = useMessageContext();
  const breedingContext = useBreedingContext();

  const [herdOptions, setHerdOptions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [herdBreedings, setHerdBreedings] = useState<ExtendedBreeding[]>([]);
  const [selectedBreeding, setSelectedBreeding] = useState<
    ExtendedBreeding | "new" | null
  >(null);
  const [isBreedingDialogOpen, setIsBreedingDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleHerdSelect = useCallback(
    (id: string) => {
      setHerdId(id);
    },
    [setHerdId]
  );

  const handleBreedingClick = useCallback((breeding: ExtendedBreeding) => {
    setSelectedBreeding(breeding);
    setIsBreedingDialogOpen(true);
  }, []);

  const handleNewBreedingClick = useCallback(() => {
    setSelectedBreeding("new");
    setIsBreedingDialogOpen(true);
  }, []);

  const fetchBreedings = useCallback(async () => {
    if (!herdId || isLoading) return;

    setIsLoading(true);
    try {
      const data = (await get(`/api/breeding/${herdId}`)) as {
        breedings: RawBreeding[];
      };

      if (!data?.breedings) {
        setHerdBreedings([]);
        return;
      }

      const sortedBreedings = data.breedings.sort(
        (a: RawBreeding, b: RawBreeding) => {
          const dateA = new Date(a.birth_date || "9999-12-31");
          const dateB = new Date(b.birth_date || "9999-12-31");
          if (dateA < dateB) return -1;
          if (dateA > dateB) return 1;
          return a.id - b.id;
        }
      );

      const processedBreedings: ExtendedBreeding[] = sortedBreedings.map(
        (breeding: RawBreeding, index: number) => ({
          ...breeding,
          number: index + 1,
          mother_name: breeding.mother_name || breeding.mother || "",
          father_name: breeding.father_name || breeding.father || "",
          individuals: breeding.individuals || [],
          breed_notes: "",
          birth_notes: "",
          birth_date: breeding.birth_date || null,
          breed_date: breeding.breed_date || null,
          mother: breeding.mother || "",
          father: breeding.father || "",
          litter_size: breeding.litter_size || null,
          litter_size6w: breeding.litter_size6w || null,
          breeding_herd: breeding.breeding_herd,
        })
      );

      setHerdBreedings(processedBreedings);
      onUpdateStatus?.("completed");
    } catch (error: unknown) {
      userMessage("Kunde inte hämta kullar.", "error");
      console.error("Failed to fetch breedings:", error);
      onUpdateStatus?.("error");
    } finally {
      setIsLoading(false);
    }
  }, [herdId, isLoading, onUpdateStatus, userMessage]);

  const handleBreedingDialogClose = useCallback(() => {
    setSelectedBreeding(null);
    setIsBreedingDialogOpen(false);
    fetchBreedings();
  }, [fetchBreedings]);

  useEffect(() => {
    if (!genebanks.length || !user) return;

    if (user.is_admin) {
      if (genebankName) {
        const foundGenebank = genebanks.find(
          (g: any) => g.name === genebankName
        );
        if (foundGenebank) {
          setHerdOptions(foundGenebank.herds);
        }
      }
    } else if (user.is_manager?.length > 0) {
      if (genebankName) {
        const foundGenebank = genebanks.find(
          (g: any) => g.name === genebankName
        );
        if (foundGenebank && user.is_manager.includes(foundGenebank.id)) {
          setHerdOptions(foundGenebank.herds);
        }
      }
    } else {
      if (user.is_owner && user.is_owner.length > 0) {
        const filteredHerds = genebanks.flatMap((g: any) =>
          g.herds.filter((herd: any) => user.is_owner.includes(herd.herd))
        );
        setHerdOptions(filteredHerds);

        if (filteredHerds.length === 1 && !herdId) {
          handleHerdSelect(filteredHerds[0].herd);
          onUpdateStatus?.("completed");
        }
      }
    }
  }, [genebanks, user, herdId, handleHerdSelect, onUpdateStatus, genebankName]);

  useEffect(() => {
    if (!herdId || isLoading) {
      setHerdBreedings([]);
      return;
    }

    fetchBreedings();
  }, [herdId]);

  const selectedHerdBreedings = useMemo(() => {
    if (!herdBreedings?.length || !reportYear) return herdBreedings || [];

    return herdBreedings
      .filter((breeding) => {
        if (!breeding) return false;

        if (breeding.birth_date) {
          const birthYear = new Date(breeding.birth_date).getFullYear();
          if (birthYear === reportYear) {
            return true;
          }
        }

        if (breeding.breed_date) {
          const breedDate = new Date(breeding.breed_date);
          const breedYear = breedDate.getFullYear();

          if (breedYear === reportYear) {
            const yearEnd = new Date(reportYear, 11, 31);
            const daysBefore = Math.floor(
              (yearEnd.getTime() - breedDate.getTime()) / (1000 * 60 * 60 * 24)
            );
            return daysBefore >= 30;
          }
        }

        return false;
      })
      .map((breeding, index) => ({
        ...breeding,
        number: index + 1,
      }));
  }, [herdBreedings, reportYear]);

  const filteredHerds = useMemo(() => {
    if (!searchTerm) return herdOptions;
    const search = searchTerm.toLowerCase();
    return herdOptions.filter((herd) => {
      const herdName = herd.herd_name?.toLowerCase() || "";
      const herdIdLower = herd.herd?.toLowerCase() || "";
      return herdName.includes(search) || herdIdLower.includes(search);
    });
  }, [herdOptions, searchTerm]);

  const getRowStyle = useCallback((breeding: any) => {
    if (!breeding.birth_date || breeding.litter_size6w == null) {
      return { backgroundColor: "#ffebee" };
    }
    if (breeding.litter_size6w === 0) {
      return { backgroundColor: "#fff3e0" };
    }
    return {};
  }, []);

  const renderInfoCard = (selectedHerdId: string) => (
    <div
      className="yearlyReportCard"
      style={{
        marginTop: "2em",
        padding: "1em",
        border: "1px solid #ccc",
        borderRadius: "8px",
      }}
    >
      <Typography variant="body1" gutterBottom>
        Besättning {selectedHerdId} är vald.
      </Typography>

      <Typography variant="body2" gutterBottom>
        För att årsrapporten ska uppdateras automatiskt behöver du:
      </Typography>

      <Typography variant="body2" gutterBottom component="div">
        <ul>
          <li>
            Rapportera alla kullar direkt här genom att klicka på "Lägg till ny
            kull" eller redigera befintliga kullar genom att klicka på
            redigeringsikonen.
          </li>
          <li>
            Ange minst födelsedatum, kullstorlek och antal ungar som lever efter
            sex veckor.
          </li>
          <li>Du behöver inte skapa oregistrerade kaniner om du inte vill.</li>
          <li>
            Om du inte redan har årsrapporterat dina kaniner med intyg, kan du
            göra det för alla kaniner vid ett senare tillfälle – allt i ett enda
            steg.
          </li>
        </ul>
        Om du redan har skapat intyg för minst en kanin i varje kull behöver du
        inte göra något mer.
      </Typography>
    </div>
  );

  const renderBreedingTable = () => (
    <div>
      {selectedHerdBreedings.length === 0 && reportYear && (
        <div
          className="yearlyReportCard"
          style={{
            marginTop: "2em",
            padding: "1em",
            border: "1px solid #ccc",
            borderRadius: "8px",
            backgroundColor: "#fff3e0",
          }}
        >
          <Typography variant="body1" color="textSecondary" gutterBottom>
            Inga kullar registrerade för år: {reportYear}. Vänlig lägg till
            rapportårets alla kullar, det är dock OK att gå vidare om du inte
            har tagit några kullar iår.
          </Typography>
          <div style={{ marginTop: "1em", textAlign: "right" }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleNewBreedingClick}
              startIcon={<EditIcon />}
            >
              Lägg till ny kull
            </Button>
          </div>
        </div>
      )}
      {selectedHerdBreedings.length > 0 && (
        <div
          className="yearlyReportCard"
          style={{
            marginTop: "2em",
            padding: "1em",
            border: "1px solid #ccc",
            borderRadius: "8px",
          }}
        >
          <Typography variant="h6" gutterBottom>
            Registrerade kullar för år: {reportYear}
          </Typography>
          <Typography
            variant="subtitle1"
            style={{
              marginBottom: "1em",
              padding: "1em",
              backgroundColor: "#fff3e0",
              border: "1px solid #ffb74d",
              borderRadius: "4px",
            }}
          >
            OBS! Kontrollera noga att alla kullar för {reportYear} är korrekt
            registrerade. Detta är viktigt för årsrapportens kvalitet. Om någon
            kull saknas eller är felaktig, vänligen korrigera detta innan du
            fortsätter med årsrapporten.
          </Typography>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th
                  style={{
                    border: "1px solid #ddd",
                    padding: "8px",
                    width: "40px",
                  }}
                >
                  Nr
                </th>
                <th style={{ border: "1px solid #ddd", padding: "8px" }}>
                  Födelsedatum
                </th>
                <th style={{ border: "1px solid #ddd", padding: "8px" }}>
                  Moder
                </th>
                <th style={{ border: "1px solid #ddd", padding: "8px" }}>
                  Fader
                </th>
                <th
                  style={{
                    border: "1px solid #ddd",
                    padding: "8px",
                    width: "80px",
                  }}
                >
                  Antal Ungar
                </th>
                <th
                  style={{
                    border: "1px solid #ddd",
                    padding: "8px",
                    width: "80px",
                  }}
                >
                  Levande efter 6v
                </th>
                <th
                  style={{
                    border: "1px solid #ddd",
                    padding: "8px",
                    width: "50px",
                  }}
                ></th>
              </tr>
            </thead>
            <tbody>
              {selectedHerdBreedings.map((breeding) => (
                <tr key={breeding.id} style={getRowStyle(breeding)}>
                  <td
                    style={{
                      border: "1px solid #ddd",
                      padding: "8px",
                      textAlign: "center",
                    }}
                  >
                    {breeding.number}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                    {breeding.birth_date}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                    {breeding.mother_name}
                  </td>
                  <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                    {breeding.father_name}
                  </td>
                  <td
                    style={{
                      border: "1px solid #ddd",
                      padding: "8px",
                      textAlign: "center",
                    }}
                  >
                    {breeding.litter_size}
                  </td>
                  <td
                    style={{
                      border: "1px solid #ddd",
                      padding: "8px",
                      textAlign: "center",
                    }}
                  >
                    {breeding.litter_size6w}
                  </td>
                  <td
                    style={{
                      border: "1px solid #ddd",
                      padding: "8px",
                      textAlign: "center",
                    }}
                  >
                    <IconButton
                      size="small"
                      onClick={() => handleBreedingClick(breeding)}
                      title="Redigera"
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ marginTop: "1em", textAlign: "right" }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleNewBreedingClick}
              startIcon={<EditIcon />}
            >
              Lägg till ny kull
            </Button>
          </div>
        </div>
      )}

      <Dialog
        open={isBreedingDialogOpen}
        onClose={handleBreedingDialogClose}
        maxWidth="md"
        fullWidth
      >
        <div style={{ position: "relative", padding: "1em" }}>
          <Button
            style={{
              position: "absolute",
              right: "8px",
              top: "8px",
              zIndex: 1,
            }}
            onClick={handleBreedingDialogClose}
          >
            Stäng
          </Button>
          {selectedBreeding && (
            <BreedingForm
              data={selectedBreeding}
              herdId={herdId || undefined}
              handleBreedingsChanged={(shouldClose?: boolean) => {
                fetchBreedings();
                if (shouldClose) {
                  handleBreedingDialogClose();
                }
              }}
              handleActive={() => {}}
            />
          )}
        </div>
      </Dialog>
    </div>
  );

  if (!genebankName && (!user?.is_owner || user.is_owner.length === 0)) {
    return <Typography>Du äger ingen besättning.</Typography>;
  }

  if (
    user?.is_owner?.length === 1 &&
    !user.is_admin &&
    (!user.is_manager || user.is_manager.length === 0)
  ) {
    return (
      <div style={{ width: "100%" }}>
        {renderInfoCard(user.is_owner[0])}
        {renderBreedingTable()}
      </div>
    );
  }

  return (
    <div
      className="yearly-report-container"
      style={{ width: "100%", maxWidth: "1200px", margin: "0 auto" }}
    >
      {(!genebankName &&
        user?.is_owner &&
        user.is_owner.length === 1 &&
        !user.is_admin &&
        (!user.is_manager || user.is_manager.length === 0)) ||
      herdId ? (
        <div style={{ width: "100%" }}>
          {herdId
            ? renderInfoCard(herdId)
            : user?.is_owner && renderInfoCard(user.is_owner[0])}
          {renderBreedingTable()}
        </div>
      ) : (
        <>
          <Typography variant="h6">Välj besättning för årsrapport:</Typography>
          <TextField
            label="Sök besättning"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            fullWidth
            margin="normal"
          />
          <div style={{ maxHeight: "300px", overflowY: "auto" }}>
            {filteredHerds.map((herd: any) => (
              <Button
                key={herd.herd}
                variant={herd.herd === herdId ? "contained" : "outlined"}
                color={herd.herd === herdId ? "primary" : "default"}
                onClick={() => handleHerdSelect(herd.herd)}
                style={{ margin: "0.5em" }}
              >
                {herd.herd_name
                  ? `${herd.herd} - ${herd.herd_name}`
                  : herd.herd}
              </Button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
