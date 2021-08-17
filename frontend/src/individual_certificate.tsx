import React from "react";

import { Document, Page, pdfjs } from "react-pdf";
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;
import "react-pdf/dist/esm/Page/AnnotationLayer.css";

import {
  Button,
  CircularProgress,
  makeStyles,
  TextField,
} from "@material-ui/core";

import { IndividualView } from "@app/individual_view";
import { IndividualForm } from "@app/individual_form";
import { get, post } from "@app/communication";
import { useUserContext } from "@app/user_context";
import { useDataContext } from "@app/data_context";
import { useMessageContext } from "@app/message_context";
import { Individual, inputVariant, OptionType } from "@app/data_context_global";
import { CertificateDownload } from "./certificate_download";
import { FormAction } from "@app/individual_form";

//Styles for the form. A lot similar to the ones in individual_edit.
//Find a different solution to avoid repetetive code.
const useStyles = makeStyles({
  control: {
    margin: "5px",
    minWidth: "195px",
    paddingRight: "5px",
  },
  form: {
    display: "flex",
    height: "100%",
    overflow: "hidden",
    flexDirection: "column",
    width: "95%",
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
  formWrapper: {
    padding: "3em 3em 0 3em",
  },
});

export function IndividualCertificate({
  id,
  action,
}: {
  id: string;
  action: string;
}) {
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
  // Error states for mandatory form fields
  const [numberError, setNumberError] = React.useState(false as boolean);
  const [colorError, setColorError] = React.useState(false as boolean);
  const [sexError, setSexError] = React.useState(false as boolean);
  const [birthDateError, setBirthDateError] = React.useState(false as boolean);
  const [litterError, setLitterError] = React.useState(false as boolean);

  const { user } = useUserContext();
  const { popup } = useMessageContext();
  const { userMessage } = useMessageContext();
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
    id
      ? get(`/api/individual/${id}`).then(
          (data: Individual) => {
            setIndividual(data);
            setShowForm(true);
          },
          (error) => {
            userMessage(error, "error");
          }
        )
      : userMessage(
          "You do not have permission to edit this individual",
          "error"
        );
  }, [id, user]);

  /**
   * The API sends the birth date in a format like this:
   * "Thu, 08 Jul 2021 00:00:00 GMT".
   * This function turns it into a format like this: "YYYY-MM-DD"
   */
  React.useEffect(() => {
    const formatDate = (fullDate: string) => {
      const date = new Date(fullDate).toISOString();
      const dateString = date.split("T")[0];
      return dateString;
    };
    if (
      // check if the birth date is still in the wrong format,
      // i.e. has more than 10 characters
      individual?.birth_date &&
      individual.birth_date.length > 10
    ) {
      handleUpdateIndividual("birth_date", formatDate(individual?.birth_date));
    }
  }, [individual?.birth_date]);

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

  // check if all mandatory fields are filled before moving on to preview
  const handlePreview = () => {
    let error: boolean = false;
    if (!individual?.number) {
      setNumberError(true);
      error = true;
    }
    if (!individual?.color) {
      setColorError(true);
      error = true;
    }
    if (!individual?.sex) {
      setSexError(true);
      error = true;
    }
    if (!individual?.birth_date) {
      setBirthDateError(true);
      error = true;
    }
    if (!individual?.litter) {
      setLitterError(true);
      error = true;
    }
    if (error) {
      userMessage("Fyll i alla obligatoriska fält.", "warning");
      return;
    }
    setShowForm(false);
    setShowSummary(true);
    previewCertificate(id, certificateData);
  };

  // remove error layout from input fields when user has added an input
  React.useEffect(() => {
    if (individual?.color) {
      setColorError(false);
    }
    if (individual?.number) {
      setNumberError(false);
    }
    if (individual?.sex) {
      setSexError(false);
    }
    if (individual?.birth_date) {
      setBirthDateError(false);
    }
    if (individual?.litter) {
      setLitterError(false);
    }
  }, [
    individual?.color,
    individual?.number,
    individual?.sex,
    individual?.birth_date,
    individual?.litter,
  ]);

  // Returns a preview of the certificate that will be shown as an image
  // using the React-pdf library.
  const previewCertificate = (id: string, content: any) => {
    fetch(`/api/certificates/preview/${id}`, {
      body: JSON.stringify(content),
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/octet-stream",
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.arrayBuffer())
      .then((data) => {
        setPreviewUrl(data);
      })
      .catch((error) => {
        userMessage(error.message, "error");
      });
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

  // Returns the signed, new certificate.
  const issueCertificate = (id: string, content: any) => {
    fetch(`/api/certificates/issue/${id}`, {
      body: JSON.stringify(content),
      method: "POST",
      credentials: "same-origin",
      headers: {
        Accept: "application/pdf",
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (res.status === 400) {
          throw new Error(
            "Certifikatet kunde inte utfärdas. Anledningen kan vara att kaninen redan har ett certifikat."
          );
        } else if (res.status === 404) {
          throw new Error("Kaninen kunde inte hittas.");
        } else if (res.status === 200) {
          return res.blob();
        } else {
          throw new Error("Något gick fel.");
        }
      })
      .then((blob) => {
        if (blob) {
          setCertificateUrl(window.URL.createObjectURL(blob));
          setShowSummary(false);
          setShowComplete(true);
        } else {
          throw new Error("Något gick fel (det här borde inte hända).");
        }
      })
      .catch((error) => {
        {
          userMessage(error.message, "error");
        }
      });
  };

  // Returns the updated certificate.
  // jscpd:ignore-start
  const updateCertificate = (id: string, content: any) => {
    fetch(`/api/certificates/update/${id}`, {
      body: JSON.stringify(content),
      method: "PATCH",
      credentials: "same-origin",
      headers: {
        Accept: "application/pdf",
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (res.status === 404) {
          throw new Error(
            "Kaninen eller dess certifikat kunde inte hittas i databasen."
          );
        } else if (res.status === 200) {
          return res.blob();
        } else {
          throw new Error("Något gick fel.");
        }
      })
      .then((blob) => {
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
  // jscpd:ignore-end

  // This function is necessary to make the preview work.
  // Built into the library.
  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  return (
    <>
      {!individual ? (
        <div className={style.loading}>
          <h2>Loading data</h2>
          <CircularProgress />
        </div>
      ) : individual && showForm ? (
        <>
          <IndividualForm
            individual={individual}
            onUpdateIndividual={handleUpdateIndividual}
            formAction={FormAction.handleCertificate}
            colorError={colorError}
            numberError={numberError}
            sexError={sexError}
            birthDateError={birthDateError}
            litterError={litterError}
          />
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
            <Button variant="contained" color="primary" onClick={handlePreview}>
              {"Förhandsgranska"}
            </Button>
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
                switch (action) {
                  case "issue":
                    issueCertificate(id, certificateData);
                    break;
                  case "update":
                    updateCertificate(id, certificateData);
                }
              }}
            >
              {action == "issue"
                ? "Beställ certifikat"
                : "update"
                ? "Uppdatera certifikat"
                : "Fortsätt"}
            </Button>
          </div>
        </>
      ) : individual && showComplete ? (
        <>
          <CertificateDownload
            certUrl={certificateUrl}
            individual={individual}
          />
        </>
      ) : (
        <></>
      )}
    </>
  );
}
