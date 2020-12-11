/**
 * @file This file contains the Settings function. This page is used for managing
 * settings by users.
 */
import React, { useState, useEffect } from 'react'
import { get, post, update } from '@app/communication';

import { Button, TextField, Grid, Paper, makeStyles } from '@material-ui/core';
import {useUserContext, WithUserContext} from '@app/user_context'
import { useMessageContext } from '@app/message_context';

const styles = makeStyles({
  main: {
    width: '100%',
    height: '100%',
    margin: '0',
    padding: '10px',
  },
  controls: {
    padding: '15px',
  },
  leftControls: {
    maxWidth: '40%',
    minHeight: '50px',
  },
  rightControls: {
    float: 'right',
    width: '40%',
  },
  hidden: {
    display: 'none',
  },
  inputForm: {
    width: '100%',
    padding: '10px',
    margin: '10px 0',
    minHeight: '200px',
  }
});


export function Settings() {
const {user} = useUserContext()
const {userMessage} = useMessageContext()
const {inputVariant} = 'standard'
const [availableAuthenticators, setAvailableAuthenticators] = useState([])
const [linkedAuthenticators, setLinkedAuthenticators] = useState([])

const classes = styles;

/**
 * Provides settings for user.
 */
 
  async function updateLinkedAuthenticators() {
    await post('/api/linked').then(
      data => { 
        if (!data) {
          data = []
        }
        setLinkedAuthenticators(data)
       },
      error => {
      })
  }

  async function waitForExternalLogin(w) {
    // Wait for an external login window
      try {
        if (w.document.readyState == "complete") { 
      
          var returnedUser = w.document.body.innerText.trim()
          if (returnedUser == "null") {
            userMessage("Could not link identity", "error") 
          } else {
            userMessage("Identity linked", "success")
          }
  
          w.close()
          updateLinkedAuthenticators()

          return
        }
      }
      catch (err) {
      } 
      setTimeout( () => waitForExternalLogin(w), 50)
    }
    
    async function linkExternal(service) {
     // Authenticate with external service service
      const resp =fetch("/api/link/"+service, {
        body: "",
        method: 'POST',
        credentials: 'same-origin',
        redirect: 'manual',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
      }
      );
    
      resp.then(
        response => {
          if (response.ok) {
            response.json().then(
              data => { if (data == null) { 
                userMessage("Could not link identity", "error") 
              }          else {
                userMessage("Identity linked", "success")
                updateLinkedAuthenticators()
              }}
              ) }
            else {
              var w = window.open('/api/link/'+service, "_blank")
              setTimeout( () => waitForExternalLogin(w), 100)
            }}
        ,
        err => {
          userMessage("Unexpected error", "error")
        }
      )
    }

    async function unlinkExternal(service) {
      await post('/api/unlink/'+service).then(
        data => { 
          updateLinkedAuthenticators()
        },
        error => {
          userMessage("Unexpected error", "error")
        })
    }
  

  async function updateAvailableAuthenticators() {
    await post('/api/login/available').then(
      data => { 
        if (!data) {
          data = []
        }
        setAvailableAuthenticators(data)
       },
      error => {
      })
  }

  useEffect( () => {
    updateAvailableAuthenticators()
    updateLinkedAuthenticators()
    }, [])


  return <>
    <Paper className={styles.main}>
      <Paper className={styles.inputForm}>
      {user && <>
      <h2>{user.username} ({user.email} {user.validated ? "" : "- EJ BEKRÄFTAD"})</h2>
      <form className={classes.form} noValidate autoComplete="off">
          <TextField label='E-mail'
                     type='email'
                     variant={inputVariant}
                     className={classes.simpleField}
                     value={user.email ?? ''}
                     onChange={e => setUser({...user, email: e.target.value})}
            />
        </form> 

        <Grid container direction="column">
        <TextField label='Nuvarande lösenord'
                      type='password'
                      variant={inputVariant}
                      hidden={false}
                      className={classes.simpleField}
                      value=""
          />
          <TextField label='Nytt lösenord'
            type='password'
            variant={inputVariant}
            hidden={false}
            className={classes.simpleField}
            value=""
          />

          <Button>
            Byt lösenord
          </Button> 
        </Grid>
        <Grid container direction="row">
        {                
            linkedAuthenticators ? <> Länkade autentiseringstjänster: {
              linkedAuthenticators.map((item) => (
                <Button onClick={ () => unlinkExternal(item) } key={item} name={item}>
                {item}
              </Button> )) } 
                  </> : '' 
            
          }
        </Grid>
        <Grid container direction="row">
        {  !(availableAuthenticators.filter( i => !linkedAuthenticators.includes(i))) ? '' :
             <> Tillgängliga autentiseringstjänster: {
              availableAuthenticators.filter( i => !linkedAuthenticators.includes(i)).map((item) => (
                <Button onClick={ () => linkExternal(item) } key={item} name={item}>
                {item}
              </Button> )) } 
                  </> 
          }
        </Grid>

         </> }         
      </Paper>
    </Paper>
  </>}

