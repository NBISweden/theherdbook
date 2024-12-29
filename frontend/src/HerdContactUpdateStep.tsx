import React, { useState, useEffect } from "react";
import {
  TextField,
  Button,
  Typography,
  Grid,
  Paper,
  makeStyles,
} from "@material-ui/core";
import { get, updateHerd } from "@app/communication";
import { useUserContext } from "@app/user_context";
import { useMessageContext } from "@app/message_context";
import { useDataContext } from "@app/data_context";
import { Herd, inputVariant } from "@app/data_context_global";
import { FieldWithPermission } from "@app/field_with_permission";

// Define missing types
type InputType = "text" | "tel" | "email" | "url";
type PrivacyLevel = "public" | "private" | null;

// Extended Herd type to include bank details
interface ExtendedHerd extends Herd {
  bank_account_number?: string;
  bank_name?: string;
  genebank_id: string;
  [key: string]: any;
}

interface HerdContactUpdateStepProps {
  herdData: any;
  herdId: string | null;
  loadData: (args: any) => void;
  onUpdateStatus?: (status: string) => void;
}

type ContactField = {
  field: keyof ExtendedHerd;
  label: string;
  type?: InputType;
};

const useStyles = makeStyles((theme) => ({
  formContainer: {
    maxWidth: "800px",
    margin: theme.spacing(4) + "px auto",
    padding: theme.spacing(3),
  },
}));

export const HerdContactUpdateStep: React.FC<HerdContactUpdateStepProps> = ({
  herdData,
  herdId,
  loadData,
  onUpdateStatus,
}) => {
  const classes = useStyles();
  const { user } = useUserContext();
  const { userMessage } = useMessageContext();
  const { genebanks } = useDataContext();
  const [herd, setHerd] = useState<ExtendedHerd | null>(null);
  const [loading, setLoading] = useState(true);
  const [postalcode, setPostalcode] = useState("");
  const [postalcity, setPostalcity] = useState("");

  const contactFields: ContactField[] = [
    { field: "name", label: "Namn" },
    { field: "email", label: "E-mail", type: "email" },
    { field: "mobile_phone", label: "Mobiltelefon", type: "tel" },
    { field: "wire_phone", label: "Fast telefon", type: "tel" },
    { field: "www", label: "Hemsida", type: "url" },
    { field: "physical_address", label: "Gatuadress" },
  ];

  const bankFields: ContactField[] = [
    { field: "bank_account_number", label: "Bankkontonummer" },
    { field: "bank_name", label: "Banknamn" },
  ];

  useEffect(() => {
    // Fetch herd data if not provided
    if (!herdData && herdId) {
      get(`/api/herd/${herdId}`).then(
        (data) => {
          setInitialHerdData(data);
          setLoading(false);
        },
        (error) => {
          userMessage("Kunde inte hämta besättningsdata.", "error");
          setLoading(false);
        }
      );
    } else if (herdData) {
      setInitialHerdData(herdData);
      setLoading(false);
    }
  }, [herdData, herdId]);

  useEffect(() => {
    onUpdateStatus?.("pending");
  }, []);

  const setInitialHerdData = (data: ExtendedHerd) => {
    let postalcode = "";
    let postalcity = "";
    let physical_address = data.physical_address || "";
    if (physical_address.includes("|")) {
      const [address, postcode, postcity] = physical_address.split("|");
      physical_address = address;
      postalcode = postcode;
      postalcity = postcity;
    }
    // Force all privacy levels to "authenticated" (Endast inloggade)
    const updatedData: ExtendedHerd = {
      ...data,
      genebank_id: data.genebank_id,
      physical_address: physical_address,
      name_privacy: "authenticated" as PrivacyLevel,
      email_privacy: "authenticated" as PrivacyLevel,
      mobile_phone_privacy: "authenticated" as PrivacyLevel,
      wire_phone_privacy: "authenticated" as PrivacyLevel,
      www_privacy: "authenticated" as PrivacyLevel,
      physical_address_privacy: "authenticated" as PrivacyLevel,
    };
    setHerd(updatedData);
    setPostalcode(postalcode);
    setPostalcity(postalcity);
  };

  const setFormField = (field: keyof ExtendedHerd, value: string) => {
    herd && setHerd({ ...herd, [field]: value });
  };

  const hasPermissionForBankDetails = () => {
    if (!user || !herd) return false;
    if (user.is_admin) return true;

    // Find the genebank for this herd
    const genebank = genebanks?.find((gb) =>
      gb.herds.some((h) => h.herd === herd.herd)
    );

    // Check if user is a manager of this genebank
    if (
      genebank?.id &&
      Array.isArray(user.is_manager) &&
      user.is_manager.includes(genebank.id)
    ) {
      return true;
    }

    // Check if user is owner of this herd
    if (user.is_owner && user.is_owner.includes(herd.herd)) return true;

    return false;
  };

  const handleSubmit = async () => {
    if (!herd) return;
    setLoading(true);
    try {
      const updatedData: Partial<ExtendedHerd> = {
        id: herd.id,
        name: herd.name,
        email: herd.email,
        mobile_phone: herd.mobile_phone,
        wire_phone: herd.wire_phone,
        www: herd.www,
        physical_address: `${herd.physical_address}|${postalcode}|${postalcity}`,
        name_privacy: herd.name_privacy,
        email_privacy: herd.email_privacy,
        mobile_phone_privacy: herd.mobile_phone_privacy,
        wire_phone_privacy: herd.wire_phone_privacy,
        www_privacy: herd.www_privacy,
        physical_address_privacy: herd.physical_address_privacy,
        has_details: true, // Add this to satisfy the type checker
        ...(hasPermissionForBankDetails() && {
          bank_account_number: herd.bank_account_number,
          bank_name: herd.bank_name,
        }),
      };

      const response = await updateHerd(updatedData as Herd);

      if (response.status === "success" || response.status === "updated") {
        userMessage("Kontaktinformationen uppdaterad.", "success");
        loadData(["herds"]);
      } else {
        userMessage("Kunde inte uppdatera kontaktinformationen.", "error");
      }
    } catch (error) {
      userMessage(
        "Ett fel inträffade vid uppdatering av kontaktinformationen.",
        "error"
      );
    } finally {
      setLoading(false);
    }
    onUpdateStatus?.("completed");
  };

  if (loading || !herd) {
    return <Typography>Laddar...</Typography>;
  }

  return (
    <Paper className={classes.formContainer}>
      <Typography
        variant="subtitle1"
        style={{
          marginBottom: "2em",
          padding: "1em",
          backgroundColor: "#e3f2fd", // Light blue background
          border: "1px solid #90caf9", // Blue border
          borderRadius: "4px",
        }}
      >
        <strong>Viktigt!</strong> Vänligen kontrollera och uppdatera noggrant
        alla dina kontaktuppgifter. Glöm inte att fylla i korrekta bankuppgifter
        - dessa krävs för att stödet ska kunna betalas ut. Bankuppgifterna är
        endast synliga för behörig personal.
      </Typography>

      <Typography variant="h5" gutterBottom>
        {herd.herd}
        {herd.herd_name && ` - ${herd.herd_name}`}
      </Typography>
      <Typography variant="subtitle2" gutterBottom>
        Uppdatera Kontaktinformation
      </Typography>
      <form>
        <Grid container spacing={2}>
          {contactFields.map((field) => (
            <Grid item xs={12} key={field.field}>
              <FieldWithPermission
                field={field.field}
                label={field.label}
                value={String(herd[field.field] ?? "")}
                permission={
                  (herd[
                    `${field.field}_privacy` as keyof ExtendedHerd
                  ] as PrivacyLevel) ?? null
                }
                setValue={setFormField}
                fieldType={field.type ?? "text"}
              />
            </Grid>
          ))}
          <Grid item xs={12} sm={6}>
            <TextField
              label="Postnummer"
              value={postalcode}
              onChange={(e) => setPostalcode(e.target.value)}
              fullWidth
              margin="normal"
              variant={inputVariant}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Postort"
              value={postalcity}
              onChange={(e) => setPostalcity(e.target.value)}
              fullWidth
              margin="normal"
              variant={inputVariant}
            />
          </Grid>
          {hasPermissionForBankDetails() && (
            <>
              <Grid item xs={12}>
                <Typography variant="subtitle1" gutterBottom>
                  Bankuppgifter är alltid privata och kan bara läsas av de med
                  rätt behörighet.
                </Typography>
              </Grid>
              {bankFields.map((field) => (
                <Grid item xs={12} key={field.field}>
                  <TextField
                    label={field.label}
                    value={String(herd[field.field] ?? "")}
                    onChange={(e) => setFormField(field.field, e.target.value)}
                    fullWidth
                    margin="normal"
                    variant={inputVariant}
                    type={field.type ?? "text"}
                    style={{
                      backgroundColor: !herd[field.field]
                        ? "#fff3e0"
                        : "transparent",
                    }}
                    helperText={
                      !herd[field.field]
                        ? "Detta fält behöver fyllas i för att få stöd"
                        : ""
                    }
                  />
                </Grid>
              ))}
            </>
          )}
        </Grid>
        <Grid
          container
          spacing={2}
          justifyContent="flex-end"
          style={{ marginTop: "1em" }}
        >
          <Grid item>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={loading}
            >
              Uppdatera
            </Button>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
};
