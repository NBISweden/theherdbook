/**
 * @file This file contains the IndividualEdit function. This function allows a
 * user (with the required permissions) to edit an individual given by `id`, or
 * add a new individual if `herdId` is given.
 */
import React from "react";

import {
  Button,
  CircularProgress,
  makeStyles,
  TextField,
} from "@material-ui/core";

import { IndividualView } from "@app/individual_view";
import { IndividualForm } from "@app/individual_form";
import { get, patch } from "@app/communication";
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
  confirmBox: {
    border: "1px solid black",
    borderRadius: "5px",
    padding: "1em",
  },
  confirmField: {
    marginRight: "1.5em",
  },
  flexbox: {
    display: "flex",
  },
});

export function IndividualEdit({ id }: { id: string | undefined }) {
  const [individual, setIndividual] = React.useState(
    undefined as Individual | undefined
  );
  const [oldIndividual, setOldIndividual] = React.useState(
    undefined as Individual | undefined
  );
  const [individualLoaded, setIndividualLoaded] = React.useState(
    false as boolean
  );
  const [certType, setCertType] = React.useState("unknown" as string);
  const [isSaveActive, setIsSaveActive] = React.useState(false);
  //States for conditional rendering
  const [showForm, setShowForm] = React.useState(false as boolean);
  const [showSummary, setShowSummary] = React.useState(false as boolean);
  const [showComplete, setShowComplete] = React.useState(false as boolean);
  //States for authentication
  const [confirmId, setConfirmId] = React.useState("");
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
  const [litterError6w, setLitterError6w] = React.useState(false as boolean);

  const { user } = useUserContext();
  const { popup } = useMessageContext();
  const { userMessage, handleCloseDialog } = useMessageContext();
  const { herdListener, herdChangeListener, setHerdChangeListener } =
    useDataContext();
  const style = useStyles();

  const certTypeOptions: OptionType[] = [
    { value: "digital", label: "Digital" },
    { value: "paper", label: "Papper" },
    { value: "none", label: "Inget certifikat" },
    { value: "unknown", label: "Okänt" },
  ];

  // Limited version of the individual to be used for the preview
  const certificateData = {
    claw_color: individual?.claw_color,
    belly_color: individual?.belly_color,
    color: individual?.color,
    eye_color: individual?.eye_color,
    birth_date: individual?.birth_date,
    hair_notes: individual?.hair_notes,
    name: individual?.name,
    litter_size: individual?.litter_size,
    litter_size6w: individual?.litter_size6w,
    notes: individual?.notes,
    sex: individual?.sex,
    genebank: individual?.genebank,
  };

  /**
   * Fetch individual data from the backend
   * and set certificate type according to individual data
   */
  React.useEffect(() => {
    id
      ? get(`/api/individual/${id}`).then(
          (data: Individual) => {
            setIndividual(data);
            setOldIndividual(data);
            setIndividualLoaded(true);
            if (!!data?.certificate) {
              setCertType("paper");
            } else if (!!data?.digital_certificate) {
              setCertType("digital");
            } else {
              setCertType("none");
            }
          },
          (error) => {
            userMessage(error, "error");
          }
        )
      : userMessage("Något gick fel.", "error");
  }, [id]);

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
   * This is to make sure there never is a value in the local state for
   * both digital and paper certificate, only for one (or none) of them.
   * Without this, redundant values could be remaining in the state if the user
   * changes the cert type after putting in a number.
   *
   */
  const onCertTypeChange = (type: string) => {
    setCertType(type);
    if (type == "digital") {
      updateField("certificate", null);
    }
    if (type == "paper") {
      updateField("digital_certificate", null);
    } else {
      if (individual?.digital_certificate !== null) {
        updateField("digital_certificate", null);
      }
      if (individual?.certificate !== null) {
        updateField("certificate", null);
      }
    }
  };

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
    individual &&
      (setIndividual({ ...individual, [field]: value }), setIsSaveActive(true));
  };

  /**
   * Compares the individual object that is supposed to be saved with the version of it
   * that's currently in the database.
   * @param newInd individual data with user input
   * @param oldInd individual in the database
   * @returns true if they are equal
   */
  const isEqual = (newInd: Individual, oldInd: Individual) => {
    let areEqual = true;
    const keys = Object.keys(newInd);
    keys.forEach((key: string) => {
      if (newInd[key] !== oldInd[key]) {
        areEqual = false;
      }
    });
    return areEqual;
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
    if (!individual?.litter_size) {
      setLitterError(true);
      error = true;
    }
    if (!individual?.litter_size6w) {
      setLitterError6w(true);
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
    if (individual?.litter_size) {
      setLitterError(false);
    }
    if (individual?.litter_size6w) {
      setLitterError6w(false);
    }
  }, [
    individual?.color,
    individual?.number,
    individual?.sex,
    individual?.birth_date,
    individual?.litter_size,
    individual?.litter_size6w,
  ]);

  /**
   * Sends a request to save the current data in the database. Returns a
   * ServerMessage.
   *
   * @param data The Individual data to save.
   */
  const save = (data: Individual) => {
    if (isEqual(data, oldIndividual)) {
      return;
    }
    const postData = { ...data };
    patch("/api/individual", data).then(
      (retval: ServerMessage) => {
        switch (retval.status) {
          case "success":
            if (postData.herd.herd == herdListener) {
              setHerdChangeListener(herdChangeListener + 1);
            }
            userMessage(retval.message ?? "Individual updated", "success");
            handleCloseDialog();
            break;
          default:
            userMessage(retval.message ?? "something went wrong", "error");
        }
      },
      (error) => {
        userMessage("" + error, "error");
        console.error(error);
      }
    );
  };

  return (
    <>
      {!individual ? (
        <div className={style.loading}>
          <h2>Loading data</h2>
          <CircularProgress />
        </div>
      ) : individual ? (
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
            litterError6w={litterError6w}
          />
          <div className={style.paneControls}>
            <Button
              className={style.button}
              variant="contained"
              color="primary"
              disabled={!isSaveActive}
              onClick={() => save(individual)}
            >
              {"Spara"}
            </Button>
            <Button
              variant="contained"
              color="secondary"
              onClick={() => handleCloseDialog()}
            >
              {"Avbryt"}
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
          <div className={style.confirmBox}>
            <h2>Bekräftelse</h2>
            <p>
              För att intyga att allt är korrekt, ange ditt besättningsnummer i
              format {individual.number ? individual.number[0] : "X"}XXX.{" "}
              <br></br>Vill du göra ändringar, kan du gå tillbaka.
            </p>
            <div className={style.flexbox}>
              <TextField
                id="confirm"
                className={style.confirmField}
                variant={inputVariant}
                autoFocus
                margin="dense"
                label="Besättningsnummer"
                value={confirmId}
                onChange={(e) => setConfirmId(e.target.value)}
              />
              <div
                className={style.paneControls}
                style={{ justifyContent: "flex-end" }}
              >
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => authenticate(confirmId)}
                >
                  {"Bekräfta"}
                </Button>
              </div>
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
                setConfirmId("");
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
