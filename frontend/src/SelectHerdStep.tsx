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

  const filterBreedingsForYear = (breedings: any[], year: number) => {
    const filtered = breedings.filter((breeding) => {
      // If we have a birth_date in the report year, include it
      if (breeding.birth_date) {
        const birthYear = new Date(breeding.birth_date).getFullYear();
        if (birthYear === year) {
          return true;
        }
      }

      // Check breed_date regardless of whether we have a birth_date
      if (breeding.breed_date) {
        const breedDate = new Date(breeding.breed_date);
        const breedYear = breedDate.getFullYear();

        if (breedYear === year) {
          // Exclude if it's in the last 30 days of the year
          const yearEnd = new Date(year, 11, 31); // December 31st
          const daysBefore = Math.floor(
            (yearEnd.getTime() - breedDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          return daysBefore >= 30;
        }
      }

      return false;
    });

    return filtered;
  };

  useEffect(() => {
    if (herdId) {
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
              filteredBreedings = filterBreedingsForYear(
                numberedBreedings,
                reportYear
              );
              // Renumber the filtered breedings
              filteredBreedings = filteredBreedings.map((breeding, index) => ({
                ...breeding,
                number: index + 1,
              }));
            }
            setSelectedHerdBreedings(filteredBreedings);
          }
        },
        (error) => {
          userMessage("Kunde inte hämta kullar.", "error");
        }
      );
    } else {
      setSelectedHerdBreedings([]);
    }
  }, [herdId, reportYear, userMessage]);

  const handleBreedingsChanged = () => {
    // Refresh the breedings data
    if (herdId) {
      get(`/api/breeding/${herdId}`).then((data: { breedings: any[] }) => {
        if (data && data.breedings) {
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
            filteredBreedings = filterBreedingsForYear(
              numberedBreedings,
              reportYear
            );
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

  // Helper function to determine if a row should be highlighted
  const getRowStyle = (breeding: any) => {
    // Red background for missing birth date or missing litter size at 6 weeks
    if (!breeding.birth_date || breeding.litter_size6w === undefined) {
      return { backgroundColor: "#ffebee" }; // Light red background
    }
    // Yellow background when litter size at 6 weeks is 0 (for verification)
    if (breeding.litter_size6w === 0) {
      return { backgroundColor: "#fff3e0" }; // Light yellow background
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
