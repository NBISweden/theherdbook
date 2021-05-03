/**
 * @file The IndividualView function provides information about a single
 * individual, including links to parents and progeny.
 */
import React from "react";
import { Link } from "react-router-dom";
import { Button, Tooltip } from "@material-ui/core";
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
      width: "50px",
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
  const { userMessage, popup } = useMessageContext();

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
      (data: Individual) => setIndividual(data),
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
                  <dt>Certifikat:</dt>
                  <dd>{individual?.certificate}</dd>
                  <dt>Kön:</dt>
                  <dd>{individual?.sex}</dd>
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
                  <dd>
                    {individual?.color}
                    <br />
                    {individual?.color_note}
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
                  <dd>{individual?.litter}</dd>
                  <dt>Vikt:</dt>
                  <dd>
                    {individual &&
                      individual.weights &&
                      individual.weights.length > 1 && (
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
              {user?.canEdit(id) && (
                <Button
                  className={style.editButton}
                  variant="contained"
                  color="primary"
                  onClick={() => popup(<IndividualEdit id={id} />)}
                >
                  Redigera individen
                </Button>
              )}
              {user?.canEdit(id) && (
                <Button
                  className={style.editButton}
                  variant="contained"
                  color="primary"
                  onClick={() => popup(<IndividualCertificate id={id} />)}
                >
                  Beställ certifikat
                </Button>
              )}
              <div>
                <h3>Besättningshistoria</h3>
                <ul className={style.herdList}>
                  {individual &&
                    individual.herd_tracking &&
                    individual.herd_tracking.map((herdTrack: any, i) => {
                      if (herdTrack.herd) {
                        return (
                          <Link to={`/herd/${herdTrack.herd}`} key={i}>
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
              </div>
              <div>
                <h3>Föräldrar</h3>
                {individual && (
                  <ul className={style.herdList}>
                    <li>
                      Mor:
                      {individual.mother ? (
                        <Link to={`/individual/${individual.mother.number}`}>
                          {individualLabel(individual.mother)}
                        </Link>
                      ) : (
                        "Okänd"
                      )}
                    </li>
                    <li>
                      Far:
                      {individual.father ? (
                        <Link to={`/individual/${individual.father.number}`}>
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
                          ? child.active
                            ? activeIcon
                            : inactiveIcon
                          : deadIcon}
                      </span>
                      <Link to={`/individual/${child.number}`}>
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
