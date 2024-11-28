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
import { Herd, inputVariant, LimitedInputType } from "@app/data_context_global";
import { FieldWithPermission } from "@app/field_with_permission";

interface HerdContactUpdateStepProps {
  herdData: Herd | null;
  herdId: string | null;
  loadData: (args: any) => void;
}

type ContactField = {
  field: keyof Herd;
  label: string;
  type?: LimitedInputType;
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
}) => {
  const classes = useStyles();
  const { user } = useUserContext();
  const { userMessage } = useMessageContext();
  const { genebanks } = useDataContext();
  const [herd, setHerd] = useState<Herd | null>(null);
  const [loading, setLoading] = useState(true);
  const [postalcode, setPostalcode] = useState("");
  const [postalcity, setPostalcity] = useState("");

  const contactFields: ContactField[] = [
    { field: "name", label: "Namn" },
    { field: "email", label: "E-mail" },
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
          console.error(error);
          userMessage("Kunde inte hämta besättningsdata.", "error");
          setLoading(false);
        }
      );
    } else if (herdData) {
      setInitialHerdData(herdData);
      setLoading(false);
    }
  }, [herdData, herdId]);

  const setInitialHerdData = (data: Herd) => {
    let postalcode = "";
    let postalcity = "";
    let physical_address = data.physical_address || "";
    if (physical_address.includes("|")) {
      const [address, postcode, postcity] = physical_address.split("|");
      physical_address = address;
      postalcode = postcode;
      postalcity = postcity;
    }
    setHerd({
      ...data,
      physical_address: physical_address,
    });
    setPostalcode(postalcode);
    setPostalcity(postalcity);
  };

  const setFormField = <K extends keyof Herd>(label: K, value: Herd[K]) => {
    herd && setHerd({ ...herd, [label]: value });
  };

  const hasPermissionForBankDetails = () => {
    if (!user || !herd) return false;
    if (user.is_admin) return true;
    if (user.is_manager && user.is_manager.includes(herd.genebank_id))
      return true;
    if (user.is_owner && user.is_owner.includes(herd.herd)) return true;
    return false;
  };

  const handleSubmit = async () => {
    if (!herd) return;
    setLoading(true);
    try {
      // Prepare data to send, excluding non-updatable attributes
      const updatedData: Partial<Herd> = {
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
        // Include bank account fields if user has permission
        ...(hasPermissionForBankDetails() && {
          bank_account_number: herd.bank_account_number,
          bank_name: herd.bank_name,
        }),
      };

      // Send the update to the server using updateHerd
      const response = await updateHerd(updatedData);

      if (response.status === "success" || response.status === "updated") {
        userMessage("Kontaktinformationen uppdaterad.", "success");
        loadData(["herds"]); // Reload herds data
      } else {
        userMessage("Kunde inte uppdatera kontaktinformationen.", "error");
      }
    } catch (error) {
      console.error(error);
      userMessage(
        "Ett fel inträffade vid uppdatering av kontaktinformationen.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading || !herd) {
    return <Typography>Laddar...</Typography>;
  }

  return (
    <Paper className={classes.formContainer}>
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
                value={herd[field.field]}
                permission={
                  herd[`${field.field}_privacy` as keyof Herd] ?? null
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
                  <FieldWithPermission
                    field={field.field}
                    label={field.label}
                    value={herd[field.field]}
                    setValue={setFormField}
                    fieldType={field.type ?? "text"}
                    disablePrivacy // Custom prop to disable privacy options
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
