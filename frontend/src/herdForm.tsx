/**
 * @file This file contains the HerdForm function. This function is used for
 * changing herd attributes in the database.
 */
import React from "react";
import { unstable_batchedUpdates } from "react-dom";
import { useHistory } from "react-router-dom";
import {
  InputAdornment,
  FormControlLabel,
  TextField,
  Button,
  Typography,
  Checkbox,
} from "@material-ui/core";
import { Autocomplete } from "@material-ui/lab";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";
import DateFnsUtils from "@date-io/date-fns";
import sv from "date-fns/locale/sv";

import { useDataContext } from "@app/data_context";
import { useUserContext } from "@app/user_context";
import { useMessageContext } from "@app/message_context";
import {
  Herd,
  herdLabel,
  Genebank,
  ServerMessage,
  dateFormat,
  inputVariant,
  OptionType,
} from "@app/data_context_global";
import { get, updateHerd, createHerd } from "@app/communication";
import {
  FieldWithPermission,
  LimitedInputType,
} from "@app/field_with_permission";

const defaultValues: Herd = {
  id: -1,
  genebank: 1,
  herd: "",
  herd_name: "",
  has_details: false,
  is_active: false,
  start_date: "",
  name: "",
  name_privacy: "private",
  physical_address: "",
  physical_address_privacy: "private",
  location: "",
  location_privacy: "private",
  email: "",
  email_privacy: "private",
  email_verified: false,
  www: "",
  www_privacy: "private",
  mobile_phone: "",
  mobile_phone_privacy: "private",
  wire_phone: "",
  wire_phone_privacy: "private",
  latitude: "",
  longitude: "",
  coordinates_privacy: "private",
  individuals: [],
};

type ContactField = {
  field: keyof Herd;
  label: string;
  type?: LimitedInputType;
};

/**
 * Provides herd management forms for setting herd metadata. The form will
 * load herd data for the id `id` if it's a number, or for a new herd if `id` is
 * `undefined` or `'new'`.
 */
export function HerdForm({
  id,
  genebank,
  view = "form",
  change = true,
  fromHerd,
}: {
  id: string | undefined;
  genebank: string | undefined;
  view: "form" | "info";
  change: boolean;
  fromHerd: Herd | undefined;
}) {
  const { genebanks, setGenebanks } = useDataContext();
  const { user } = useUserContext();
  const { userMessage } = useMessageContext();
  const [herd, setHerd] = React.useState({ ...defaultValues } as Herd);
  const [loading, setLoading] = React.useState(true);
  const [postalcode, setPostalcode] = React.useState("000 00");
  const [postalcity, setPostalcity] = React.useState("");
  const [currentView, setCurrentView] = React.useState(view);
  const [isNew, setNew] = React.useState(false);
  const history = useHistory();

  const contactFields: ContactField[] = [
    { field: "name", label: "Namn" },
    { field: "email", label: "E-mail" },
    { field: "mobile_phone", label: "Mobiltelefon", type: "tel" },
    { field: "wire_phone", label: "Fast telefon", type: "tel" },
    { field: "www", label: "Hemsida", type: "tel" },
    { field: "physical_address", label: "Gatuadress" },
  ];

  /**
   * Loads herd data for herd `id`. If data is returned, the form is set to use
   * that data for making updates to the herd information. if no data is
   * returned, or if `id` is set to `'new'` or `undefined`, the form will be
   * emptied for creating new herds.
   */
  React.useEffect(() => {
    setLoading(true);
    defaultValues.genebank = genebank;
    setHerd({ ...defaultValues });
    setPostalcode("");
    setPostalcity("");
    if (fromHerd) {
      setHerd(fromHerd);
    } else {
      if (id == "new" || !id) {
        setNew(true);
      } else {
        get(`/api/herd/${id}`).then(
          (data) => {
            if (data) {
              // verify the data doesn't have nulls
              Object.keys(data).forEach((k: string) => {
                data[k] = data[k] ?? "";
              });

              unstable_batchedUpdates(() => {
                // split physical address into address, postcode, postcity
                if (
                  data?.physical_address &&
                  data.physical_address.includes("|")
                ) {
                  const [address, postcode, postcity] =
                    data.physical_address.split("|");
                  data.physical_address = address;
                  setPostalcode(postcode);
                  setPostalcity(postcity);
                }
                setHerd(data);
                setNew(false);
              });
            }
          },
          (error) => console.error(error)
        );
      }
    }
    setLoading(false);
  }, [id, genebank]);

  /**
   * Sets a single key `label` in the `herd` form to `value` (if herd isn't
   * undefined).
   */
  const setFormField = <K extends keyof Herd>(label: K, value: Herd[K]) => {
    herd && setHerd({ ...herd, [label]: value });
  };

  /**
   * Returns a genebank, identified by `genebankId`, as OptionType.
   * @param genebankId
   */
  const genebankOption = (genebankId: number) => {
    if (!genebanks) {
      return null;
    }
    const genebank = genebanks.find((g: Genebank) => g.id == herd.genebank);
    if (genebank) {
      return { value: "" + genebank.id, label: genebank.name };
    }
    return null;
  };
  /**
   * sends a POST request to create a new herd in the database if the `isNew` is
   * `true`, otherwise sends am UPDATE request to update a current database
   * entry. This function will also update the `genebanks` context with the
   * new information. If a new entry is created, the page will reroute to edit
   * that entry.
   */
  const submitForm = () => {
    if (herd == undefined) {
      return;
    }
    const postData: Herd = { ...herd };
    delete postData["individuals"];
    postData[
      "physical_address"
    ] = `${postData["physical_address"]}|${postalcode}|${postalcity}`;

    if (isNew) {
      createHerd(postData).then((data: ServerMessage) => {
        switch (data.status) {
          case "success":
          case "created":
            const genebank = genebanks.find(
              (g: Genebank) => g.id == postData.genebank
            );
            if (genebank) {
              genebank.herds.push(postData);
              unstable_batchedUpdates(() => {
                setGenebanks(Object.assign([], genebanks));
                userMessage("Herd saved", "success");
              });

              // navigate to new herd to allow continued editing
              history.push(`/manage/${genebank?.name}/${postData.herd}`);
            }
            break;
          default:
            userMessage(
              "Error:" + (data.message ?? "something went wrong"),
              "error"
            );
        }
      });
    } else {
      updateHerd(postData).then((data: ServerMessage) => {
        switch (data.status) {
          case "success":
          case "updated":
            const genebank = genebanks.find(
              (g: Genebank) => g.id == postData.genebank
            );
            if (genebank) {
              let toUpdate = genebank.herds.find((h: Herd) => h.herd == id);
              if (toUpdate) {
                toUpdate.herd_name = postData.herd_name;
                unstable_batchedUpdates(() => {
                  setGenebanks(Object.assign([], genebanks));
                  userMessage("Changes saved", "success");
                });
              }
            }
            break;
          default:
            userMessage(
              "Error:" + (data.message ?? "something went wrong"),
              "error"
            );
        }
      });
    }
  };

  return (
    <>
      {(loading && <h2>Loading...</h2>) || (
        <>
          {change &&
            (user.canEdit(herd.herd) ||
              user.canEdit(herd.genebank) ||
              herd.genebank?.id < 0) && (
              <div className="editButton">
                [{" "}
                <a
                  className="editLink"
                  onClick={() =>
                    setCurrentView(currentView == "form" ? "info" : "form")
                  }
                >
                  {currentView == "info" ? "Edit" : "Stop Editing"}
                </a>
                ]
              </div>
            )}
          <h1 className="titleHerd">
            {herd.herd ? `Besättning ${herdLabel(herd)}` : `Ny Besättning`}
          </h1>
          {(currentView == "form" &&
            user &&
            (user.canEdit(genebank) ||
              user.canEdit(herd.herd) ||
              user.canEdit(herd.genebank) ||
              herd.genebank?.id < 0) && (
              <>
                <form className="herdForm">
                  <MuiPickersUtilsProvider utils={DateFnsUtils} locale={sv}>
                    <div className="formCard">
                      <Typography
                        className="titleHerd"
                        color="primary"
                        gutterBottom
                      >
                        Kontaktperson
                      </Typography>

                      {contactFields.map((field) => (
                        <FieldWithPermission
                          key={field.field}
                          field={field.field}
                          label={field.label}
                          value={herd[field.field]}
                          permission={
                            herd[`${field.field}_privacy` as keyof Herd] ?? null
                          }
                          setValue={setFormField}
                          fieldType={field.type ?? "text"}
                        />
                      ))}
                      <TextField
                        label="Postnummer"
                        value={postalcode}
                        variant={inputVariant}
                        onChange={(e: any) => {
                          setPostalcode(e.target.value);
                        }}
                      />
                      <TextField
                        label="Postort"
                        value={postalcity}
                        variant={inputVariant}
                        onChange={(e: any) => {
                          setPostalcity(e.target.value);
                        }}
                      />
                    </div>

                    <div className="formCard">
                      <Typography
                        className="titleHerd"
                        color="primary"
                        gutterBottom
                      >
                        Besättningsinformation
                      </Typography>

                      <TextField
                        label="Besättningsnamn"
                        className="simpleField"
                        value={herd.herd_name}
                        variant={inputVariant}
                        onChange={(e: any) => {
                          setFormField("herd_name", e.target.value);
                        }}
                      />
                      <FormControlLabel
                        label="Aktiv"
                        labelPlacement="end"
                        control={
                          <Checkbox
                            color="primary"
                            checked={
                              herd.is_active == null ? false : !!herd.is_active
                            }
                          />
                        }
                        value={herd.is_active}
                        onChange={(e: any) => {
                          setFormField("is_active", e.target.checked);
                        }}
                      />
                      <KeyboardDatePicker
                        autoOk
                        variant="inline"
                        inputVariant={inputVariant}
                        className="simpleField"
                        label="Startdatum"
                        format={dateFormat}
                        value={herd.start_date ?? ""}
                        InputLabelProps={{
                          shrink: true,
                        }}
                        onChange={(date, value) => {
                          value && setFormField("start_date", value);
                        }}
                      />
                      <TextField
                        label="Besättnings-ID"
                        className="simpleField"
                        disabled={!isNew}
                        value={
                          (herd.herd?.split(/[G-M]/)[1] ?? herd.herd) || ""
                        }
                        variant={inputVariant}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              {herd?.herd
                                ? `${herd?.herd?.match(/([G-M]|[G-M]X1)/)[0]}`
                                : `${
                                    herd.genebank
                                      ? genebankOption(herd.genebank).label[0]
                                      : "X"
                                  }`}
                            </InputAdornment>
                          ),
                        }}
                        onChange={(event) => {
                          setFormField(
                            "herd",
                            `${
                              herd.genebank
                                ? genebankOption(herd.genebank).label[0]
                                : "X"
                            }${event.currentTarget.value}`
                          );
                        }}
                      />
                      <Autocomplete
                        options={
                          genebanks
                            ? genebanks.map((g: Genebank) => {
                                return { value: "" + g.id, label: g.name };
                              })
                            : []
                        }
                        disabled={true}
                        value={genebankOption(herd.genebank)}
                        getOptionLabel={(option: OptionType) => option.label}
                        getOptionSelected={(
                          option: OptionType,
                          value: OptionType
                        ) => option.value == value.value}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Genbank"
                            variant={inputVariant}
                            className="permissionField"
                            margin="normal"
                          />
                        )}
                        onChange={(event: any, newValue: OptionType | null) => {
                          newValue &&
                            setFormField("genebank", +newValue?.value);
                        }}
                      />

                      <Typography className="subheading" color="textSecondary">
                        Besättningen har{" "}
                        {herd?.individuals ? herd.individuals.length : 0}{" "}
                        individer
                      </Typography>
                    </div>
                  </MuiPickersUtilsProvider>
                  <div className="formCard formInfoCard">
                    <Typography className="subheading">
                      Du bestämmer över dina uppgifter
                    </Typography>
                    <p>
                      Du som är genbanksinnehavare fyller själv i de
                      kontaktuppgifter du vill att andra genbanker ska se för
                      att underlätta kommunikation mellan genbankerna. Du kan
                      själv, när som helst, gå in och ändra i dina
                      kontaktuppgifter.
                    </p>
                    <Typography className="subheading">
                      OBS! Tänk på medlemsmatrikeln
                    </Typography>
                    <p>
                      En ändring här slår inte igenom till föreningens
                      medlemsmatrikel, så om du exempelvis flyttat eller bytt
                      e-post, måste du också meddela det till föreningens
                      kassör, för ändring i medlemsmatrikeln. Medlemsmatrikeln
                      används bara för föreningens interna administration, och
                      är inte offentlig.
                    </p>
                  </div>
                </form>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => submitForm()}
                >
                  {isNew ? "Skapa" : "Spara"}
                </Button>
              </>
            )) || (
            <div className="contactInfo">
              {herd.name && (
                <>
                  <span className="spanTitle">Kontaktperson: </span>
                  {herd.name}
                  {herd.email && (
                    <>
                      {" "}
                      - <a href={`mailto:${herd.email}`}>{herd.email}</a>{" "}
                    </>
                  )}
                  {herd.mobile_phone && <> - {herd.mobile_phone} </>}
                  {herd.wire_phone && <> - {herd.wire_phone} </>}
                  {herd.www && (
                    <>
                      {" "}
                      - <a href={herd.www}>{herd.www}</a>{" "}
                    </>
                  )}
                  {herd.physical_address && (
                    <>
                      {" "}
                      - {herd.physical_address}, {postalcode} {postalcity}{" "}
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
