import React from 'react';

import { CircularProgress, makeStyles } from '@material-ui/core';

import { Individual } from '@app/data_context_global';
import { get, patch } from '@app/communication';
import { useMessageContext } from '@app/message_context';
import { useUserContext } from '@app/user_context';

const useStyles = makeStyles({
  loading: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
})

export function CertificateSummary({id}: {id: string | undefined}) {
  const [individual, setIndividual] = React.useState(undefined as Individual | undefined)
  const [father, setFather] = React.useState(undefined as Individual | undefined)
  const [mother, setMother] = React.useState(undefined as Individual | undefined)
  const [fathersFather, setFathersFather] = React.useState(undefined as Individual | undefined)
  const [fathersMother, setFathersMother] = React.useState(undefined as Individual | undefined)
  const [mothersFather, setMothersFather] = React.useState(undefined as Individual | undefined)
  const [mothersMother, setMothersMother] = React.useState(undefined as Individual | undefined)
  const { user } = useUserContext()
  const {userMessage} = useMessageContext()
  const style = useStyles()

  /**
   * Fetch individual data from the backend
   */
  React.useEffect(() => {
  user && user.canEdit(id) ?
    get(`/api/individual/${id}`).then(
      (data: Individual) => {
        console.log(data)
        setIndividual(data)
      },
      error => {
        console.error(error);
        userMessage(error, 'error')
      }
    )
    : userMessage('You do not have permission to edit this individual', 'error')
  }, [id, user])

  
  React.useEffect(() => {
    console.log(individual)
      get(`/api/individual/${individual?.father?.number}`).then(
        (data: Individual) => {
          setFather(data)
          console.log(father)
        },
        error => {
          console.error(error);
          userMessage(error, 'error')
        }
      )
      get(`/api/individual/${individual?.mother?.number}`).then(
        (data: Individual) => {
          setMother(data)
          console.log(mother)
        },
        error => {
          console.error(error);
          userMessage(error, 'error')
        }
      )
  }, [individual])

  return <>
    {individual 
    ? <>
      <h1>Är allt korrekt?</h1>
      <div>
        <h2>Identitet</h2>
        <p>Ras: </p>
        <p>Namn: {individual.name} </p>
        <p>Genbanksnummer: {individual.number} </p>
        <p>Kön: {individual.sex} </p>
        <p>Födelsedatum: {individual.birth_date} </p>
        <p>Foto finns:  </p>
        <p>Färg/kännetecken: {individual.color} </p>
        <p>Avvikande hårlag:  </p>
        <p>Namn: {individual.name} </p>
        <p>Namn: {individual.name} </p>
        <p>Namn: {individual.name} </p>
        <p>Namn: {individual.name} </p>
        <p>Namn: {individual.name} </p>
      </div>
      </>
    : <div className={style.loading}>
        <h2>Loading data</h2>
        <CircularProgress />
      </div>
  }
  </>
}