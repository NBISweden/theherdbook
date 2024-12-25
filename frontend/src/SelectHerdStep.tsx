// File: SelectHerdStep.tsx

import React, { useState, useEffect } from "react";
import { Button, Typography, TextField, Link } from "@material-ui/core";
import { useDataContext } from "@app/data_context";
import { useMessageContext } from "@app/message_context";
import { useUserContext } from "@app/user_context";
import { get } from "@app/communication";

interface SelectHerdStepProps {
  user: any;
  genebankName: string | null;
  herdId: string | null;
  setHerdId: (id: string) => void;
  genebank?: string; // Made optional
  change?: boolean; // Made optional
  reportYear?: number;
}

export const SelectHerdStep: React.FC<SelectHerdStepProps> = ({
  user,
  genebankName,
  herdId,
  setHerdId,
  genebank,
  change = false, // Default value
  reportYear,
}) => {
  const { genebanks } = useDataContext();
  const [herdOptions, setHerdOptions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedHerdBreedings, setSelectedHerdBreedings] = useState<any[]>([]);
  const { userMessage } = useMessageContext();

  // Initialize herd options based on genebankName and user ownership
  useEffect(() => {
    if (genebankName) {
      const foundGenebank = genebanks.find((g: any) => g.name === genebankName);
      if (foundGenebank) {
        // Assuming foundGenebank.herds contains the list of herds
        setHerdOptions(foundGenebank.herds);
      }
    } else if (user?.is_owner && user.is_owner.length > 0) {
      // For regular users with herds
      setHerdOptions(
        genebanks.flatMap((g: any) =>
          g.herds.filter((herd: any) => user.is_owner.includes(herd.herd))
        )
      );
    }
  }, [genebankName, genebanks, user]);

  // Fetch breedings for the selected herdId
  useEffect(() => {
    if (herdId) {
      // Fetch breedings for the selected herd
      get(`/api/breeding/${herdId}`).then(
        (data: { breedings: any[] }) => {
          if (data && data.breedings) {
            // Sort breedings by birth_date ascending, then by id ascending
            const sortedBreedings = data.breedings.sort((a, b) => {
              if (a.birth_date < b.birth_date) return -1;
              if (a.birth_date > b.birth_date) return 1;
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
            }
            setSelectedHerdBreedings(filteredBreedings);
          }
        },
        (error) => {
          console.error("Error fetching breedings:", error);
          // Assuming userMessage is available, otherwise remove
          userMessage("Kunde inte hämta kullar.", "error");
        }
      );
    } else {
      console.log("No herdId, clearing breedings");
      setSelectedHerdBreedings([]);
    }
  }, [herdId, reportYear, userMessage]);

  // Automatically set herdId if user owns only one herd and specific conditions are met
  useEffect(() => {
    if (
      !genebankName &&
      user?.is_owner &&
      user.is_owner.length === 1 &&
      !user.is_admin &&
      (!user.is_manager || user.is_manager.length === 0)
    ) {
      setHerdId(user.is_owner[0]);
    }
  }, [genebankName, user, setHerdId]);

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
      className="formCard formInfoCard"
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
            Rapportera alla kullar i fliken{" "}
            <strong>"Kullar och parningar"</strong>
            under din besättning (<Link href="/owner">Här</Link>).
          </li>
          <li>
            Ange minst födelsedatum, kullstorlek och antal ungar som lever efter
            sex veckor.
          </li>
          <li>Du behöver inte skapa oregistrerade kaniner om du inte vill.</li>
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
            className="formCard"
            style={{
              marginTop: "2em",
              padding: "1em",
              border: "1px solid #ccc",
              borderRadius: "8px",
              backgroundColor: "#fff3e0",
            }}
          >
            <Typography variant="body1" color="textSecondary">
              Inga kullar registrerade för år: {reportYear}. Vänlig lägg till
              rapportårets alla kullar, det är dock OK att gå vidare om du inte
              har tagit några kullar iår.
            </Typography>
          </div>
        )}
        {selectedHerdBreedings.length > 0 && (
          <div
            className="formCard"
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
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>
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
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>
                    Antal Ungar
                  </th>
                  <th style={{ border: "1px solid #ddd", padding: "8px" }}>
                    Levande efter 6 Veckor
                  </th>
                </tr>
              </thead>
              <tbody>
                {selectedHerdBreedings.map((breeding) => (
                  <tr key={breeding.id}>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>
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
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                      {breeding.litter_size}
                    </td>
                    <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                      {breeding.litter_size6w}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      {/* Display info card if user has only one herd OR has selected a herd */}
      {(!genebankName &&
        user?.is_owner &&
        user.is_owner.length === 1 &&
        !user.is_admin &&
        (!user.is_manager || user.is_manager.length === 0)) ||
      herdId ? (
        <>
          {herdId
            ? renderInfoCard(herdId)
            : user?.is_owner && renderInfoCard(user.is_owner[0])}
          {renderBreedingTable()}
        </>
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
                  onClick={() => setHerdId(herd.herd)}
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
