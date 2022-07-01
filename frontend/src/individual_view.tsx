/**
 * @file The IndividualView function provides information about a single
 * individual, including links to parents and progeny.
 */
import React from "react";
import { Link } from "react-router-dom";
import {
  Button,
  ButtonGroup,
  Menu,
  MenuItem,
  Tooltip,
} from "@material-ui/core";
import { ArrowForward } from "@material-ui/icons";
import { makeStyles } from "@material-ui/core/styles";
import { useMessageContext } from "@app/message_context";
import { get } from "@app/communication";
import {
  Individual,
  herdLabel,
  DateValue,
  individualLabel,
  asLocale,
} from "@app/data_context_global";
import { useDataContext } from "@app/data_context";
import { IndividualPedigree } from "@app/individual_pedigree";
import { useUserContext } from "@app/user_context";
import { IndividualEdit } from "@app/individual_edit";
import { IndividualCertificate } from "./individual_certificate";
import { CertificateVerification } from "./certificate_verification";
import { CertificateDownload } from "./certificate_download";
import { IndividualSell } from "./individual_sell";
import { HerdView } from "@app/herd_view";
import { IndividualReport } from "./individual_report";
import { IndividualWeigthull } from "./individual_weighthull";
import { IndividualDeath } from "./individual_death";

const useStyles = makeStyles({
  body: {
    display: "flex",
    flexDirection: "row",
  },
  herdList: {
    listStyle: "none",
    padding: "0 0 0 10px",
    margin: "0 0 0 5px",
    borderLeft: "1px solid lightgrey",
  },
  fillWidth: {
    width: "100%",
  },
  flexColumn: {
    minWidth: "300px",
    display: "flex",
    flexDirection: "column",
  },
  sameLine: {
    width: "100%",
    overflow: "hidden",
    padding: "0 0 0 10px",
    margin: "0 0 0 5px",
    borderLeft: "1px solid lightgrey",
    "& dt, dd": {
      display: "block",
      float: "left",
    },
    "& dt": {
      width: "70px",
      clear: "both",
    },
  },
  listIcon: {
    display: "inline-block",
    width: "20px",
    textAlign: "center",
  },
  editButton: {
    marginTop: "15px",
  },
  icon: {
    marginLeft: "0.5em",
  },
});

/**
 * Loads information for an individual from the backend and displays it.
 */
export function IndividualView({ id }: { id: string }) {
  const style = useStyles();
  const { genebanks } = useDataContext();
  const { user } = useUserContext();
  const [individual, setIndividual] = React.useState(
    undefined as Individual | undefined
  );
  const [certificateUrl, setCertificateUrl] = React.useState(
    undefined as string | undefined
  );
  // state to control the certificate menu button
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const { userMessage, popup } = useMessageContext();

  // funtions to control the certificate menu button
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  // function to download an existing certificate
  const downloadCertificate = () => {
    fetch(`/api/certificates/issue/${id}`, {
      method: "GET",
      credentials: "same-origin",
      headers: {
        Accept: "application/pdf",
        "Content-Type": "application/json",
      },
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Intyget kunde inte laddas ner.");
        } else return res.blob();
      })
      .then((blob) => {
        if (blob) {
          console.log("blob");
          setCertificateUrl(window.URL.createObjectURL(blob));
        } else {
          throw new Error("Något gick fel.");
        }
      })
      .catch((error) => {
        userMessage(error.message, "error");
      });
  };

  React.useEffect(() => {
    if (individual && certificateUrl) {
      console.log("use effect", certificateUrl);
      popup(
        <CertificateDownload certUrl={certificateUrl} individual={individual} />
      );
    }
  }, [certificateUrl]);

  const children: Individual[] = React.useMemo(() => {
    if (
      !individual ||
      !genebanks ||
      genebanks.some((g) => g.individuals == null)
    ) {
      return [];
    }
    const genebank = genebanks.find((genebank) =>
      genebank.individuals.some((i) => i.number == individual.number)
    );
    if (
      !genebank ||
      genebank.individuals == null ||
      !genebank.individuals.length
    ) {
      return [];
    }
    return (
      genebank.individuals.filter(
        (i) =>
          (i.mother && i.mother.number == individual.number) ||
          (i.father && i.father.number == individual.number)
      ) ?? []
    );
  }, [individual, genebanks]);

  const activeIcon = "✅";
  const inactiveIcon = "❌";
  const deadIcon = "✞";

  /**
   * Fetch individual data from the backend
   */
  React.useEffect(() => {
    get(`/api/individual/${id}`).then(
      (data: Individual) => {
        setIndividual(data);
      },
      (error) => {
        console.error(error);
        userMessage(error, "error");
      }
    );
  }, [id]);

  return (
    <>
      <div className={style.body}>
        {individual ? (
          <>
            <div className={style.flexColumn}>
              <div>
                <h3>{individual?.name ?? individual.number}</h3>
                <dl className={style.sameLine}>
                  <dt>Namn:</dt>
                  <dd>{individual?.name}</dd>
                  <dt>Nummer:</dt>
                  <dd>{individual?.number}</dd>
                  <dt>Intyg:</dt>
                  <dd>
                    {individual?.certificate | individual?.digital_certificate}
                  </dd>
                  <dt>Kön:</dt>
                  <dd>
                    {individual?.sex == "male"
                      ? "Hane"
                      : individual?.sex == "female"
                      ? "Hona"
                      : ""}
                  </dd>
                  <dt>
                    <Tooltip title="Inavelskoefficient">
                      <span>F:</span>
                    </Tooltip>
                  </dt>
                  <dd>{individual?.inbreeding}%</dd>
                  <dt>
                    <Tooltip title="Genomsnittligt släktskap/ Mean Kinship">
                      <span>MK:</span>
                    </Tooltip>
                  </dt>
                  <dd>{individual?.MK}%</dd>
                  <dt>Färg:</dt>
                  <dd>{individual?.color}</dd>
                  <dt>Färganteckning:</dt>
                  <dd>
                    {individual?.color_note ? individual.color_note : "-"}
                  </dd>
                  <dt>Född:</dt>
                  <dd>
                    {individual?.birth_date
                      ? asLocale(individual.birth_date)
                      : "-"}
                    {individual?.death_date
                      ? ` - Död: ${asLocale(individual.death_date)}`
                      : ""}
                  </dd>
                  <dt>Kullstorlek:</dt>
                  <dd>{individual?.litter_size}</dd>
                  <dt>Vikt:</dt>
                  <dd>
                    {individual &&
                      individual.weights &&
                      individual.weights.length >= 1 && (
                        <ul className={style.herdList}>
                          {individual.weights
                            .sort(
                              (a: DateValue, b: DateValue) =>
                                new Date(a.date).getTime() -
                                new Date(b.date).getTime()
                            )
                            .map((w: any, i) => {
                              return (
                                <li key={i}>
                                  {`${asLocale(w.date)}: ${w.weight} kg`}
                                </li>
                              );
                            })}
                        </ul>
                      )}
                  </dd>
                  <dt>Anteckningar</dt>
                  <dd>{individual?.notes ?? "-"}</dd>
                </dl>
              </div>
              {user?.canEdit(individual.herd.herd) && (
                <Button
                  className={style.editButton}
                  variant="contained"
                  color="primary"
                  onClick={() =>
                    popup(<IndividualEdit id={id} />, undefined, true)
                  }
                >
                  Redigera individ
                </Button>
              )}
              {user?.canEdit(individual.origin_herd.herd) &&
                !individual.digital_certificate &&
                !individual.certificate && (
                  <Button
                    className={style.editButton}
                    variant="contained"
                    color="primary"
                    onClick={() =>
                      popup(<IndividualCertificate id={id} action={"issue"} />)
                    }
                  >
                    Skapa nytt intyg
                  </Button>
                )}
              {individual.origin_herd.herd !== individual.herd.herd &&
                user?.canEdit(individual.herd.herd) &&
                !individual.certificate &&
                !individual.digital_certificate && (
                  <>
                    <Button
                      className={style.editButton}
                      disabled
                      variant="contained"
                      color="primary"
                    >
                      Skapa nytt intyg
                    </Button>
                    <p>
                      Kontakta ägaren till kaninens ursprungsbesättning. Bara
                      hon/han kan skapa ett nytt intyg.
                    </p>
                  </>
                )}
              {user?.canEdit(individual.herd.herd) &&
                !!individual.digital_certificate && (
                  <>
                    <Button
                      aria-controls="simple-menu"
                      aria-haspopup="true"
                      variant="contained"
                      color="primary"
                      className={style.editButton}
                      onClick={handleClick}
                    >
                      Intygsnummer{" "}
                      <ArrowForward fontSize="small" className={style.icon} />
                    </Button>
                    <Menu
                      id="simple-menu"
                      anchorEl={anchorEl}
                      keepMounted
                      open={Boolean(anchorEl)}
                      onClose={handleClose}
                    >
                      <MenuItem
                        onClick={() => {
                          handleClose();
                          downloadCertificate();
                        }}
                      >
                        Ladda ner
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          handleClose();
                          popup(
                            <IndividualCertificate id={id} action={"update"} />
                          );
                        }}
                      >
                        Uppdatera
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          handleClose();
                          popup(
                            <CertificateVerification
                              id={id}
                              individual={individual}
                            />
                          );
                        }}
                      >
                        Verifiera
                      </MenuItem>
                    </Menu>
                  </>
                )}
              <div>
                <h3>Besättningshistoria</h3>
                <ul className={style.herdList}>
                  {individual &&
                    individual.herd_tracking &&
                    individual.herd_tracking.map((herdTrack: any, i) => {
                      if (herdTrack.herd) {
                        return (
                          <Link
                            onClick={() =>
                              popup(
                                <HerdView id={herdTrack.herd} />,
                                `/herd/${herdTrack.herd}`,
                                true
                              )
                            }
                            key={i}
                          >
                            <li>
                              {asLocale(herdTrack.date)}: {herdLabel(herdTrack)}
                            </li>
                          </Link>
                        );
                      } else {
                        return (
                          <li key={i}>{herdTrack.date}: Utanför genbanken</li>
                        );
                      }
                    })}
                </ul>
                {user?.canEdit(individual.herd.herd) && (
                  <>
                    {!individual.death_date && !individual.death_note && (
                      <div className={style.flexColumn}>
                        <Button
                          className={style.editButton}
                          variant="outlined"
                          color="primary"
                          onClick={() =>
                            popup(<IndividualSell individual={individual} />)
                          }
                        >
                          Sälj individ
                        </Button>
                        <Button
                          className={style.editButton}
                          variant="outlined"
                          color="primary"
                          onClick={() =>
                            popup(<IndividualReport individual={individual} />)
                          }
                        >
                          Årsrapportera
                        </Button>
                        <Button
                          className={style.editButton}
                          variant="outlined"
                          color="primary"
                          onClick={() =>
                            popup(
                              <IndividualWeigthull individual={individual} />
                            )
                          }
                        >
                          Rapportera vikt och hull
                        </Button>
                        <Button
                          className={style.editButton}
                          variant="outlined"
                          color="primary"
                          onClick={() =>
                            popup(<IndividualDeath individual={individual} />)
                          }
                        >
                          Rapportera som död
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div>
                <h3>Föräldrar</h3>
                {individual && (
                  <ul className={style.herdList}>
                    <li>
                      Mor:
                      {individual.mother ? (
                        <Link
                          onClick={() =>
                            popup(
                              <IndividualView id={individual.mother.number} />,
                              `/individual/${individual.mother.number}`
                            )
                          }
                        >
                          {individualLabel(individual.mother)}
                        </Link>
                      ) : (
                        "Okänd"
                      )}
                    </li>
                    <li>
                      Far:
                      {individual.father ? (
                        <Link
                          onClick={() =>
                            popup(
                              <IndividualView id={individual.father.number} />,
                              `/individual/${individual.father.number}`
                            )
                          }
                        >
                          {individualLabel(individual.father)}
                        </Link>
                      ) : (
                        "Okänd"
                      )}
                    </li>
                  </ul>
                )}
              </div>
              <div>
                <h3>Avkomma</h3>
                <h4>Avkomma i genbanken</h4>({activeIcon}: Aktiv, {inactiveIcon}
                : Inaktiv, {deadIcon}: Död)
                <ul className={style.herdList}>
                  {children.map((child) => (
                    <li key={child.number}>
                      <span className={style.listIcon}>
                        {child.alive
                          ? child.is_active
                            ? activeIcon
                            : inactiveIcon
                          : deadIcon}
                      </span>
                      <Link
                        onClick={() =>
                          popup(
                            <IndividualView id={child.number} />,
                            `/individual/${child.number}`
                          )
                        }
                      >
                        {individualLabel(child)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </>
        ) : (
          "Loading"
        )}
        <div className={style.fillWidth}>
          <h3>Släktträd</h3>
          <IndividualPedigree id={id} generations={3}></IndividualPedigree>
        </div>
      </div>
    </>
  );
}
