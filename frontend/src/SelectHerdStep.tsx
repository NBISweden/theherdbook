// File: SelectHerdStep.tsx

import React, { useState, useEffect } from "react";
import {
  Button,
  Typography,
  TextField,
  Link,
  Dialog,
  IconButton,
} from "@material-ui/core";
import { Edit as EditIcon } from "@material-ui/icons";
import { BreedingForm } from "./breeding_form";
import { useDataContext } from "@app/data_context";
import { useMessageContext } from "@app/message_context";
import { useUserContext } from "@app/user_context";
import { get } from "@app/communication";

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
  const [herdOptions, setHerdOptions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedHerdBreedings, setSelectedHerdBreedings] = useState<any[]>([]);
  const { userMessage } = useMessageContext();
  const [selectedBreeding, setSelectedBreeding] = useState<any>(null);
  const [isBreedingDialogOpen, setIsBreedingDialogOpen] = useState(false);

  // Initialize herd options based on genebankName and user ownership
  useEffect(() => {
    if (genebankName) {
      const foundGenebank = genebanks.find((g: any) => g.name === genebankName);
      if (foundGenebank) {
        setHerdOptions(foundGenebank.herds);
      }
    } else if (user?.is_owner && user.is_owner.length > 0) {
      setHerdOptions(
        genebanks.flatMap((g: any) =>
          g.herds.filter((herd: any) => user.is_owner.includes(herd.herd))
        )
      );
    }
  }, [genebankName, genebanks, user]);

  // Automatically set herdId if user owns only one herd and specific conditions are met
  useEffect(() => {
    if (
      !genebankName &&
      user?.is_owner &&
      user.is_owner.length === 1 &&
      !user.is_admin &&
      (!user.is_manager || user.is_manager.length === 0)
    ) {
      handleHerdSelect(user.is_owner[0]);
    }
  }, [genebankName, user]);

  const handleHerdSelect = (id: string) => {
    setHerdId(id);
    onUpdateStatus?.("completed");
  };

  // Fetch breedings for the selected herdId
  useEffect(() => {
    if (herdId) {
      // Fetch breedings for the selected herd
      get(`/api/breeding/${herdId}`).then(
        (data: { breedings: any[] }) => {
          if (data && data.breedings) {
            // Sort breedings by birth_date ascending, then by id ascending
            const sortedBreedings = data.breedings.sort((a, b) => {
              // First compare by birth_date
              const dateA = new Date(a.birth_date || "9999-12-31");
              const dateB = new Date(b.birth_date || "9999-12-31");
              if (dateA < dateB) return -1;
              if (dateA > dateB) return 1;
              // If dates are equal, compare by id
              return a.id - b.id;
            });
            // Add numbering and ensure all properties are present
            const numberedBreedings = sortedBreedings.map(
              (breeding, index) => ({
                ...breeding,
                number: index + 1,
                mother_name: breeding.mother_name || breeding.mother || "",
                father_name: breeding.father_name || breeding.father || "",
                individuals: breeding.individuals || [],
              })
            );
            let filteredBreedings = numberedBreedings;
            if (reportYear) {
              filteredBreedings = numberedBreedings.filter((breeding) => {
                if (!breeding.birth_date) {
                  return false;
                }
                const birthYear = new Date(breeding.birth_date).getFullYear();
                return birthYear === reportYear;
              });
              // Renumber the filtered breedings starting from 1
              filteredBreedings = filteredBreedings.map((breeding, index) => ({
                ...breeding,
                number: index + 1,
              }));
            }
            setSelectedHerdBreedings(filteredBreedings);
          }
        },
        (error) => {
          console.error("Error fetching breedings:", error);
          userMessage("Kunde inte hämta kullar.", "error");
        }
      );
    } else {
      console.log("No herdId, clearing breedings");
      setSelectedHerdBreedings([]);
    }
  }, [herdId, reportYear, userMessage]);

  const handleBreedingClick = (breeding: any) => {
    setSelectedBreeding(breeding);
    setIsBreedingDialogOpen(true);
  };

  const handleNewBreedingClick = () => {
    setSelectedBreeding("new");
    setIsBreedingDialogOpen(true);
  };

  const handleBreedingDialogClose = () => {
    setSelectedBreeding(null);
    setIsBreedingDialogOpen(false);
  };

  const handleBreedingsChanged = () => {
    // Refresh the breedings data
    if (herdId) {
      get(`/api/breeding/${herdId}`).then((data: { breedings: any[] }) => {
        if (data && data.breedings) {
          // Reuse existing sorting and filtering logic
          const sortedBreedings = data.breedings.sort((a, b) => {
            const dateA = new Date(a.birth_date || "9999-12-31");
            const dateB = new Date(b.birth_date || "9999-12-31");
            if (dateA < dateB) return -1;
            if (dateA > dateB) return 1;
            return a.id - b.id;
          });
          const numberedBreedings = sortedBreedings.map((breeding, index) => ({
            ...breeding,
            number: index + 1,
            mother_name: breeding.mother_name || breeding.mother || "",
            father_name: breeding.father_name || breeding.father || "",
            individuals: breeding.individuals || [],
          }));
          let filteredBreedings = numberedBreedings;
          if (reportYear) {
            filteredBreedings = numberedBreedings.filter((breeding) => {
              if (!breeding.birth_date) return false;
              const birthYear = new Date(breeding.birth_date).getFullYear();
              return birthYear === reportYear;
            });
            filteredBreedings = filteredBreedings.map((breeding, index) => ({
              ...breeding,
              number: index + 1,
            }));
          }
          setSelectedHerdBreedings(filteredBreedings);
        }
      });
    }
  };

  // Helper function to determine if a row should be highlighted
  const getRowStyle = (breeding: any) => {
    if (!breeding.litter_size6w && breeding.birth_date) {
      return { backgroundColor: "#ffebee" }; // Light red background
    }
    return {};
  };

  if (!genebankName && (!user?.is_owner || user.is_owner.length === 0)) {
    return <Typography>Du äger ingen besättning.</Typography>;
  }

  // Define filteredHerds before return
  const filteredHerds = herdOptions.filter((herd: any) => {
    const herdName = herd.herd_name ? herd.herd_name.toLowerCase() : "";
    const herdIdLower = herd.herd ? herd.herd.toLowerCase() : "";
    const search = searchTerm.toLowerCase();
    return herdName.includes(search) || herdIdLower.includes(search);
  });

  // Helper function to render the info card
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
            Har du inte årsrapporterat dina kaniner med intyg så kan du göra det
            i bulk i ett steg längre fram.
          </li>
        </ul>
        Om du redan har skapat intyg för minst en kanin i varje kull behöver du
        inte göra något mer.
      </Typography>
    </div>
  );

  // Helper function to render the breeding list table
  const renderBreedingTable = () => {
    return (
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
              registrerade. Detta är viktigt för årsrapportens kvalitet. Om
              någon kull saknas eller är felaktig, vänligen korrigera detta
              innan du fortsätter med årsrapporten.
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

        {/* Breeding Edit Dialog */}
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
                handleBreedingsChanged={() => {
                  handleBreedingsChanged();
                  handleBreedingDialogClose();
                }}
                handleActive={() => {}}
              />
            )}
          </div>
        </Dialog>
      </div>
    );
  };

  return (
    <div
      className="yearly-report-container"
      style={{ width: "100%", maxWidth: "1200px", margin: "0 auto" }}
    >
      {/* Display info card if user has only one herd OR has selected a herd */}
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
        /* Multiple Herds or Genebank Users - Selection UI */
        (genebankName || (user?.is_owner && user.is_owner.length > 1)) && (
          <>
            <Typography variant="h6">
              Välj besättning för årsrapport:
            </Typography>
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
                  {herd.herd_name || herd.herd}
                </Button>
              ))}
            </div>
          </>
        )
      )}
    </div>
  );
};
