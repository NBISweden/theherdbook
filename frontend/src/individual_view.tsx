/**
 * @file The IndividualView function provides information about a single
 * individual, including links to parents and progeny.
 */
import React from 'react'
import { Link } from 'react-router-dom'
import { makeStyles } from '@material-ui/core/styles'
import { useMessageContext } from '@app/message_context'
import { get } from '@app/communication'
import { Individual, herdLabel, DateValue } from '@app/data_context_global'
import { useDataContext } from '@app/data_context'
import { IndividualPedigree } from '@app/individual_pedigree'

const useStyles = makeStyles({
  body: {
    display: 'flex',
    flexDirection: 'row',
  },
  herdList: {
    listStyle: 'none',
    padding: '0 0 0 10px',
    margin: '0 0 0 5px',
    borderLeft: '1px solid lightgrey',
  },
  fillWidth: {
    width: '100%',
  },
  flexColumn: {
    minWidth: '300px',
    display: 'flex',
    flexDirection: 'column',
  },
  sameLine: {
    width: '100%',
    overflow: 'hidden',
    padding: '0 0 0 10px',
    margin: '0 0 0 5px',
    borderLeft: '1px solid lightgrey',
    '& dt, dd': {
      display: 'block',
      float: 'left',
    },
    '& dt': {
      width: '50px',
      clear: 'both',
    }
  },
});

/**
 * Loads information for an individual from the backend and displays it.
 */
export function IndividualView({id} : {id: string}) {
  const style  = useStyles()
  const { genebanks } = useDataContext()
  const [individual, setIndividual] = React.useState(undefined as Individual | undefined)
  const {userMessage} = useMessageContext()

  React.useEffect(() => {
    get(`/api/individual/${id}`).then(
      (data: Individual) => setIndividual(data),
      error => {
        console.error(error);
        userMessage(error, 'error')
      }
    )
  }, [id])

  return <>
    <div className={style.body}>
      { individual ? <>
        <div className={style.flexColumn}>
          <div>
            <h3>{individual?.name ?? individual.number}</h3>
            <dl className={style.sameLine}>
              <dt>Namn:</dt><dd>{individual?.name}</dd>
              <dt>Nummer:</dt><dd>{individual?.number}</dd>
              <dt>Certifikat:</dt><dd>{individual?.certificate}</dd>
              <dt>Kön:</dt><dd>{individual?.sex}</dd>
              <dt>Färg:</dt><dd>
                {individual?.colour}<br />
                {individual?.colour_note}
              </dd>
              <dt>Född:</dt><dd>
                {individual?.birth_date}
                {individual && individual?.death_date && ` - Död: ${individual?.death_date}`}
              </dd>
              <dt>Vikt:</dt>
              <dd>
                {individual && individual.weights && individual.weights.length > 1
                  && <ul className={style.herdList}>
                    {individual.weights.sort((a: DateValue, b: DateValue) =>
                                              new Date(a.date).getTime() - new Date(b.date).getTime())
                                      .map((w: any, i) => {
                                        return <li key={i}>
                                          {`${new Date(w.date).toLocaleDateString()}: ${w.weight} kg`}
                                        </li>
                                      })
                    }
                  </ul>
                }
              </dd>
              <dt>Anteckningar</dt><dd>{individual?.notes ?? '-'}</dd>
            </dl>
          </div>
          <div>
            <h3>Besättningshistoria</h3>
            <ul className={style.herdList}>

              {individual && individual.herd_tracking && individual.herd_tracking.map((herdTrack: any, i) => {
                if (herdTrack.herd) {
                  return <Link to={`/herd/${herdTrack.herd}`} key={i}>
                            <li>{herdTrack.date}: {herdLabel(herdTrack)}</li>
                          </Link>
                } else {
                  return <li key={i}>{herdTrack.date}: Utanför genbanken</li>
                }

              })}
            </ul>
          </div>
          <div>
            <h3>Avkomma</h3>
            <ul className={style.herdList}>
              <li>Antal kullar: {individual?.litter}</li>
              <li></li>
            </ul>
          </div>
        </div>
      </>
      : 'Loading'
      }
      <div className={style.fillWidth}>
        <h3>Släktträd</h3>
        <IndividualPedigree id={id} generations={3}></IndividualPedigree>
      </div>
    </div>
  </>
}
