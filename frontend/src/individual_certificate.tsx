import React from "react";

import { Document, Page, pdfjs } from "react-pdf";
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;
import "react-pdf/dist/esm/Page/AnnotationLayer.css";

import {
  Button,
  CircularProgress,
  FormControlLabel,
  makeStyles,
  TextField,
  Typography,
} from "@material-ui/core";
import {
  MuiPickersUtilsProvider,
  KeyboardDatePicker,
} from "@material-ui/pickers";
import { Autocomplete } from "@material-ui/lab";
import DateFnsUtils from "@date-io/date-fns";

import { IndividualView } from "@app/individual_view";
import { CertificateForm } from "@app/certificate_form";
import { get, patch, post } from "@app/communication";
import { useUserContext } from "@app/user_context";
import { useDataContext } from "@app/data_context";
import { useMessageContext } from "@app/message_context";
import {
  dateFormat,
  Individual,
  inputVariant,
  OptionType,
  ServerMessage,
} from "@app/data_context_global";

//Styles for the form. A lot similar to the ones in individual_edit.
//Find a different solution to avoid repetetive code.
const useStyles = makeStyles({
  adminPane: {
    width: "100%",
    padding: "15px 0 5px 10px",
    border: "1px solid lightgrey",
    position: "relative",
    display: "flex",
    flexDirection: "row",
    background:
      "repeating-linear-gradient(135deg, white, white 25px, rgba(0,0,0,0.05) 25px, rgba(0,0,0,0.05) 50px )",
  },
  control: {
    margin: "5px",
    minWidth: "195px",
    paddingRight: "5px",
  },
  flexRow: {
    display: "flex",
    flexDirection: "row",
    alignItems: "end",
  },
  flexRowOrColumn: {
    display: "flex",
    flexDirection: "column",
    overflowX: "hidden",
    overflowY: "auto",
    ["@media (min-width:600px)"]: {
      flexDirection: "row",
    },
  },
  form: {
    display: "flex",
    height: "100%",
    overflow: "hidden",
    flexDirection: "column",
    width: "95%",
  },
  formPane: {
    borderRight: "none",
    minWidth: "410px",
    ["@media (min-width:660px)"]: {
      borderRight: "1px solid lightgrey",
    },
    paddingRight: "5px",
    "&:last-child": {
      paddingLeft: "5px",
      paddingRight: "0",
      borderRight: "none",
    },
  },
  loading: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  paneControls: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    padding: "20px 0",
  },
  paneTitle: {
    position: "absolute",
    top: "0px",
    left: "10px",
  },
  titleText: {
    width: "100%",
    borderBottom: "1px solid lightgrey",
    padding: "0 20px",
    fontSize: "2.3em",
  },
  wideControl: {
    margin: "5px",
    minWidth: "195px",
    width: "100%",
    paddingRight: "5px",
  },
});

export function IndividualCertificate({ id }: { id: string }) {
  const [individual, setIndividual] = React.useState(
    undefined as Individual | undefined
  );
  //States for conditional rendering
  const [showForm, setShowForm] = React.useState(false as boolean);
  const [showSummary, setShowSummary] = React.useState(false as boolean);
  const [showComplete, setShowComplete] = React.useState(false as boolean);
  //States for authentication
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [isUserGood, setIsUserGood] = React.useState(false);
  //States for API-requests
  const [previewUrl, setPreviewUrl] = React.useState(undefined as unknown);
  const [certificateUrl, setCertificateUrl] = React.useState("");
  //States to make pdf-preview-library work
  const [numPages, setNumPages] = React.useState(null);
  const [pageNumber, setPageNumber] = React.useState(1);

  const { user } = useUserContext();
  const { genebanks, colors } = useDataContext();
  const { popup } = useMessageContext();
  const { userMessage } = useMessageContext();
  const canManage: boolean = React.useMemo(() => {
    return user?.canEdit(individual?.genebank); // does this mean that only a genebank manager can manage? In that case it's used wrong here.
  }, [user, individual]);
  const style = useStyles();

  // Limited version of the individual to be used for the preview
  const certificateData = {
    claw_color: individual?.claw_color,
    belly_color: individual?.belly_color,
    color: individual?.color,
    eye_color: individual?.eye_color,
    birth_date: individual?.birth_date,
    hair_notes: individual?.hair_notes,
    name: individual?.name,
    litter: individual?.litter,
    notes: individual?.notes,
    sex: individual?.sex,
    genebank: individual?.genebank,
  };

  /**
   * Fetch individual data from the backend
   */
  React.useEffect(() => {
    user && user.canEdit(id)
      ? get(`/api/individual/${id}`).then(
          (data: Individual) => {
            console.log(data);
            setIndividual(data);
            setShowForm(true);
          },
          (error) => {
            console.error(error);
            userMessage(error, "error");
          }
        )
      : userMessage(
          "You do not have permission to edit this individual",
          "error"
        );
  }, [id, user]);
  /**
   * Updates a single field in `individual`.
   *
   * @param field field name to update
   * @param value the new value of the field
   */
  const handleUpdateIndividual = <T extends keyof Individual>(
    field: T,
    value: Individual[T]
  ) => {
    individual && setIndividual({ ...individual, [field]: value });
  };

  // Used to activate the button for ordering the certificate
  async function authenticate(username: string, password: string) {
    return await post("/api/login", { username, password }).then(
      (data) => {
        data ? setIsUserGood(true) : setIsUserGood(false);
        return data;
      },
      (error) => {
        userMessage("Något gick fel.", "error");
        return "error";
      }
    );
  }

  // Returns a preview of the certificate that will be shown as an image
  // using the React-pdf library.
  const previewCertificate = (id: string, content: any) => {
    fetch(`/api/certificates/preview/${id}`, {
      body: JSON.stringify(content),
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/octet-stream",
      },
    })
      .then((res) => res.arrayBuffer())
      .then((data) => {
        console.log("cert", data);
        setPreviewUrl(data);
      })
      .catch((error) => {
        userMessage(error.message, "error");
      });
  };

  // Returns the signed certificate.
  const issueCertificate = (id: string, content: any) => {
    fetch(`/api/certificates/issue/${id}`, {
      body: JSON.stringify(content),
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/pdf",
      },
    })
      .then((res) => {
        if (res.status === 400) {
          throw new Error(
            "Certifikatet kunde inte utfärdas. Anledningen kan vara att kaninen redan har ett certifikat."
          );
        } else if (res.status === 404) {
          throw new Error("Kaninen kunde inte hittas.");
        } else res.blob();
      })
      .then((blob: unknown) => {
        console.log(blob);
        if (blob) {
          setCertificateUrl(window.URL.createObjectURL(blob));
          setShowSummary(false);
          setShowComplete(true);
        } else {
          throw new Error("Något gick fel.");
        }
      })
      .catch((error) => {
        {
          userMessage(error.message, "error");
        }
      });
  };

  // This function is necessary to make the previw work.
  // Built into the library.
  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  const colorOptions: OptionType[] = React.useMemo(() => {
    if (
      individual &&
      colors &&
      Object.keys(colors).includes(individual.genebank)
    ) {
      return colors[individual.genebank].map((c) => {
        return { value: c.name, label: `${c.id} - ${c.name}` };
      });
    }
    return [];
  }, [colors, individual]);

  const sexOptions = [
    { value: "female", label: "Hona" },
    { value: "male", label: "Hane" },
    { value: "unknown", label: "Okänd" },
  ];

  const photoOptions = [
    { value: "no", label: "Nej" },
    { value: "yes", label: "Ja" },
  ]; //should be boolean but doesn't work together with the OptionType
  // also decide how this should be stored in the backend

  return (
    <>
      {!individual ? (
        <div className={style.loading}>
          <h2>Loading data</h2>
          <CircularProgress />
        </div>
      ) : individual && showForm ? (
        <>
          <CertificateForm
            style={style}
            individual={individual}
            onUpdateIndividual={handleUpdateIndividual}
          />
          <div className={style.form}>
            <MuiPickersUtilsProvider utils={DateFnsUtils}>
              <div className={style.flexRowOrColumn}>
                <div className={style.formPane}>
                  <h1>Fyll i uppgifterna för certifikatet</h1>
                  <div className={style.adminPane}>
                    <div className={style.paneTitle}>
                      Kan endast ändras av genbanksansvarig
                    </div>
                    <TextField
                      disabled
                      label="Nummer"
                      className={style.control}
                      variant={inputVariant}
                      value={individual.number ?? ""}
                      onChange={(event) => {
                        updateIndividual("number", event.currentTarget.value);
                      }}
                    />
                  </div>
                  <div className={style.flexRow}>
                    <TextField
                      disabled={!canManage}
                      label="Namn"
                      className={style.control}
                      variant={inputVariant}
                      value={individual.name ?? ""}
                      onChange={(event) => {
                        updateIndividual("name", event.currentTarget.value);
                      }}
                    />
                    <KeyboardDatePicker
                      disabled={!canManage}
                      autoOk
                      variant="inline"
                      className={style.control}
                      inputVariant={inputVariant}
                      label="Födelsedatum"
                      format={dateFormat}
                      value={individual.birth_date ?? ""}
                      InputLabelProps={{
                        shrink: true,
                      }}
                      onChange={(date, value) => {
                        value && updateIndividual("birth_date", value);
                      }}
                    />
                  </div>
                  <div className={style.flexRow}>
                    <Autocomplete
                      disabled={!canManage}
                      options={sexOptions ?? []}
                      value={
                        sexOptions.find(
                          (option) => option.value == individual.sex
                        ) ?? sexOptions[sexOptions.length - 1]
                      }
                      getOptionLabel={(option: OptionType) => option.label}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Kön"
                          className={style.control}
                          variant={inputVariant}
                          margin="normal"
                        />
                      )}
                      onChange={(event: any, newValue: OptionType | null) => {
                        updateIndividual("sex", newValue?.value ?? "");
                      }}
                    />
                    <TextField
                      disabled={!canManage}
                      label="Antal födda i kullen"
                      className={style.control}
                      variant={inputVariant}
                      value={individual.litter ?? null}
                      type="number"
                      onChange={(event) => {
                        updateIndividual("litter", +event.currentTarget.value);
                      }}
                    />
                  </div>
                  <div className={style.flexRow}>
                    <Autocomplete
                      disabled={!canManage}
                      options={colorOptions ?? []}
                      value={
                        colorOptions.find(
                          (option) => option.value == individual.color
                        ) ?? colorOptions[0]
                      }
                      getOptionLabel={(option: OptionType) => option.label}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Färg"
                          className={style.control}
                          variant={inputVariant}
                          margin="normal"
                        />
                      )}
                      onChange={(event: any, newValue: OptionType | null) => {
                        updateIndividual("color", newValue?.value ?? "");
                      }}
                    />
                    <TextField
                      disabled={!canManage}
                      label="Avvikande hårlag"
                      variant={inputVariant}
                      className={style.control}
                      multiline
                      rows={1}
                      value={individual.hair_notes ?? ""}
                      onChange={(event) => {
                        updateIndividual(
                          "hair_notes",
                          event.currentTarget.value
                        );
                      }}
                    />
                  </div>
                  <div className={style.flexRow}>
                    <TextField
                      disabled={!canManage}
                      label="Färg på buken"
                      className={style.control}
                      variant={inputVariant}
                      value={individual.belly_color ?? ""}
                      onChange={(event) => {
                        updateIndividual(
                          "belly_color",
                          event.currentTarget.value
                        );
                      }}
                    />
                    <TextField
                      disabled={!canManage}
                      label="Ögonfärg"
                      className={style.control}
                      variant={inputVariant}
                      value={individual.eye_color ?? ""}
                      onChange={(event) => {
                        updateIndividual(
                          "eye_color",
                          event.currentTarget.value
                        );
                      }}
                    />
                  </div>
                  <div className={style.flexRow}>
                    <TextField
                      disabled={!canManage}
                      label="Klofärg(er)"
                      className={style.control}
                      variant={inputVariant}
                      value={individual.claw_color ?? ""}
                      onChange={(event) => {
                        updateIndividual(
                          "claw_color",
                          event.currentTarget.value
                        );
                      }}
                    />
                    <Autocomplete
                      disabled={!canManage}
                      options={photoOptions ?? []}
                      getOptionLabel={(option: OptionType) => option.label}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Foto finns"
                          className={style.control}
                          variant={inputVariant}
                          margin="normal"
                        />
                      )}
                    />
                  </div>
                  <div></div>
                  <TextField
                    label="Anteckningar"
                    variant={inputVariant}
                    className={style.wideControl}
                    multiline
                    rows={4}
                    value={individual.notes ?? ""}
                    onChange={(event) => {
                      updateIndividual("notes", event.currentTarget.value);
                    }}
                  />
                </div>
              </div>
              <div className={style.paneControls}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() =>
                    popup(<IndividualView id={id} />, `/individual/${id}`)
                  }
                >
                  {"Tillbaka"}
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => {
                    setShowForm(false);
                    setShowSummary(true);
                    previewCertificate(id, certificateData);
                  }}
                >
                  {"Förhandsgranska"}
                </Button>
              </div>
            </MuiPickersUtilsProvider>
          </div>
        </>
      ) : individual && showSummary ? (
        <>
          <h1>Är alla uppgifter korrekta?</h1>
          <Document
            file={previewUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            style={{ border: "2px solid black" }}
            renderAnnotationLayer={true}
            loading={<CircularProgress />}
          >
            <Page pageNumber={pageNumber} />
          </Document>
          <p>
            Page {pageNumber} of {numPages}
          </p>
          <div>
            <h2>Bekräftelse</h2>
            <p>
              För att intyga att allt är korrekt, ange ditt användernamn eller
              e-postadress och ditt lösenord igen. Vill du göra ändringar, kan
              du gå tillbaka.
            </p>
            <TextField
              id="username"
              variant={inputVariant}
              autoFocus
              margin="dense"
              label="Användarnamn eller E-postadress"
              type="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              fullWidth
            />
            <TextField
              id="password"
              variant={inputVariant}
              margin="dense"
              label="Lösenord"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
            />
            <div
              className={style.paneControls}
              style={{ justifyContent: "flex-end" }}
            >
              <Button
                variant="contained"
                color="primary"
                onClick={() => authenticate(username, password)}
              >
                {"Bekräfta"}
              </Button>
            </div>
          </div>
          <div className={style.paneControls}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                setShowForm(true);
                setShowSummary(false);
                setIsUserGood(false);
                setUsername("");
                setPassword("");
              }}
            >
              {"Tillbaka"}
            </Button>
            <Button
              variant="contained"
              color="primary"
              disabled={isUserGood ? false : true}
              onClick={() => {
                issueCertificate(id, certificateData);
              }}
            >
              {"Beställ certifikat"}
            </Button>
          </div>
        </>
      ) : individual && showComplete ? (
        <>
          <h1>Certifikatet är klart!</h1>
          <a target="_blank" href={certificateUrl} download={individual.number}>
            <Button variant="contained" color="primary">
              {"Ladda ner"}
            </Button>
          </a>
          <a target="_blank" href={certificateUrl}>
            <Button variant="contained" color="primary">
              {"Öppna i ny flik"}
            </Button>
          </a>
        </>
      ) : (
        <></>
      )}
    </>
  );
}
