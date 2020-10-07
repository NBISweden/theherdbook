/**
 * @file The IndividualView function provides information about a single
 * individual, including links to parents and progeny.
 */
import React from 'react'
import { Link } from 'react-router-dom'
import { makeStyles } from '@material-ui/core/styles'
import { useMessageContext } from '@app/message_context'
import { get } from '@app/communication'
import { Individual, herdLabel } from '@app/data_context_global'
import { PedigreeNetwork } from '@app/pedigree_plot'
import { useDataContext } from '@app/data_context'
import { calcPedigree } from '@app/pedigree'

const useStyles = makeStyles({
  header: {
    display: 'flex',
    flexDirection: 'row',
    height: '150px',
  },
  body: {
    display: 'flex',
    flexDirection: 'row',
  },
  basicInfo: {
    width: '100%',
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
  const pedigree = React.useMemo(() => calcPedigree(genebanks, id, 2), [genebanks, id])

  React.useEffect(() => {
    get(`/api/individual/${id}`).then(
      (data: Individual) => {console.debug(data); setIndividual(data)},
      error => {
        console.error(error);
        userMessage(error, 'error')
      }
    )
  }, [id])

  return <>
    <div className={style.header}>
      <div className={style.basicInfo}>
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
        </dl>
      </div>
    </div>
    <div className={style.body}>
      <div className={style.flexColumn}>
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
      <div className={style.fillWidth}>
        <h3>Släktträd</h3>
        {pedigree && <PedigreeNetwork pedigree={pedigree} onClick={() => {}}/>}
      </div>
    </div>
  </>
}
