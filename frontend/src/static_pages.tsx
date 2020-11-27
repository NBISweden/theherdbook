/**
 * @file This file contains the static pages of the site.
 */

import * as React from 'react'
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles({
  main: {
    minHeight: 'calc(100vh - 76px)',
    height: '100%',
    padding: '.25em 1em .5em 1em',
    display: 'flex',
    flexDirection: 'column',
  },
  euLogo: {
    marginTop: 'auto',
    textAlign: 'center',
    '& img': {
      width: '200px',
    }
  }
});

export function About() {
  const styles = useStyles();

  return <div className={styles.main}>
    <h1>Föreningen</h1>
    <p>
      Gotlandskaninen är en rest av den gamla svenska lantraskaninen.
      På 1970-talet uppmärksammades att det fanns några gårdar på
      Gotland som hade kvar kaniner av den gamla stammen. De gavs då
      namnet Gotlandskanin. Efter en inventering 1993 slöts
      rasregistret och dagens Gotlandskaniner är ättlingar till
      inventeringsdjuren.
    </p>
    <p>
      En annan rest av den gamla lantraskaninen är den så kallade
      Mellerudskaninen. Den fanns i en besättning hos Edith Johansson, som bodde
      nära Mellerud i Dalsland. Kaninerna liknar mycket Gotlandskaninen i
      kroppsbyggnaden, men finns bara som brokigt svartvita (holländarteckning)
      eller som helvita (albino).
    </p>
    <p>
      Föreningen Gotlandskaninens syfte är att bevara den svenska
      lantraskaninen för framtiden samt att sprida kunskap om rasen
      och dess roll i självhushållet. Bevarandearbetet organiseras
      i form av genbanksbesättningar, där avel på Gotlands- respektive
      Mellerudskanin bedrivs.
    </p>
    <div className={styles.euLogo}>
      <img src='EU-flagga-Europeiska-jordbruksfonden-färg.jpg'/>
    </div>
  </div>
}


export function Gotlandskaninen() {
  const styles = useStyles();

  return <div className={styles.main}>
    <h1>Gotlandskaninen</h1>
    <p>
      Gotlandskaninen är en rest av den gamla svenska lantraskaninen. På
      1970-talet uppmärksammades att det fanns några gårdar på Gotland som hade
      kvar kaniner av den gamla stammen. De gavs då namnet Gotlandskanin. Efter
      en inventering 1993 slöts rasregistret och dagens Gotlandskaniner är
      ättlingar till inventeringsdjuren.
    </p>
    <p>
      En fullvuxen Gotlandskanin väger 3-4 kg. Öronen är upprättstående och
      pälsen kort. Färg och teckning varierar mycket, och de flesta typer som
      förekommer bland raskaniner återfinns hos gotlänningen, men oftast i
      mindre utpräglad form.
    </p>
    <p>
      Till temperamentet är Gotlandskaninen livlig och nyfiken och visar ofta
      stort intresse för sin omgivning. Normalt får Gotlandskaninen 6-8 ungar
      per kull. Ungarna tillväxer relativt långsamt i jämförelse med utpräglade
      produktionsraser. Men å andra sidan är man normalt återhållsam med
      kraftfoder till Gotlandskaniner. Basfödan är hö, eller på sommarhalvåret,
      gräs och örter.
    </p>
    <p>
      Bevarandearbetet organiseras av Föreningen Gotlandskaninen i ett
      genbankssystem. Aveln sker i speciella besättningar som föreningen
      godkänt. Det finns ungefär 150 sådana besättningar spridda över hela
      Sverige för Gotlandskanin. De rapporterar till föreningen vad som sker i
      besättningen och utfärdar stamtavlor (genbanksintyg) för de djur som går
      vidare i avelsarbetet i gamla eller nya besättningar.
    </p>
    <p>
      Om du är intresserad av att veta mer, eller vill starta en
      genbanksbesättning för Gotlandskanin, kontakta genbanksansvarig,
      <a href="mailto:gotlandskanin@gotlandskaninen.se">
        gotlandskanin@gotlandskaninen.se
      </a>.
    </p>
  </div>
}


export function Mellerudskaninen() {
  const styles = useStyles();

  return <div className={styles.main}>
    <h1>Mellerudskaninen</h1>
    <p>
      Mellerudskaninen är en rest av den gamla svenska lantraskaninen. Den
      fanns i en besättning hos Edith Johansson, som bodde nära Mellerud i
      Dalsland. Kaninerna gavs därför namnet Mellerudskanin.
    </p>
    <p>
      Kaninerna liknar mycket Gotlandskaninen i kroppsbyggnaden, men finns
      bara som brokigt svartvita (holländarteckning) eller som helvita
      (albino). Vuxna djur väger runt 3 kg, har kort päls och upprättstående
      öron. Normalt får Mellerudskaninerna 4-6 ungar. Mellerudskaninen
      uppfattas ofta som något lugnare än Gotlandskaninen.
    </p>
    <p>
      I oktober 2001 gjordes ett första besök hos ”Edith i Sjöskogen” sedan
      Föreningen Gotlandskaninen blivit uppmärksammad på att den dövstumma
      äldre damen höll en intressant grupp kaniner av äldre härstamning.
      Djuren har sedan 1937 funnits i Mellerud då Ediths familj flyttade dit
      från Stora Grimön i Vänern. Den enda kända inkorsningen av djur utifrån
      är från 1968. Då togs två svart-vit brokiga djur, en hona och en hane,
      in i besättningen. Djurantalet i har tidigare legat kring 15-20 men
      minskade under de sista åren drastiskt. De sista djuren köptes ut från
      ursprungsbesättningen under 2007.
    </p>
    <p>
      I slutet av oktober 2011 godkände Jordbruksverket Föreningen
      Gotlandskaninens avelsplan för Mellerudskanin och därmed är
      Mellerudskaninen officiellt en svensk husdjursras. Bevarandearbete
      organiseras av Föreningen Gotlandskaninen i ett genbankssystem. Aveln
      sker i speciella besättningar som föreningen godkänt. Det finns ungefär
      50 sådana besättningar för Mellerudskanin spridda över hela Sverige. De
      rapporterar till föreningen vad som sker i besättningen och utfärdar
      stamtavlor (genbanksintyg) för de djur som går vidare i avelsarbetet i
      gamla eller nya besättningar.
    </p>
    <p>
      Om du är intresserad av att veta mer, eller vill starta en
      genbanksbesättning för Mellerudskanin, kontakta genbanksansvarig,
      <a href="mailto:mellerudskanin@gotlandskaninen.se">
        mellerudskanin@gotlandskaninen.se
      </a>.
    </p>
  </div>
}

export function Medlem() {
  const styles = useStyles();

  return <div className={styles.main}>
    <h1>Bli Medlem</h1>
    <p>
        Vill du bli medlem i föreningen? Då kan du antingen kontakta föreningen
        eller sätta in 200 kr på Föreningen Gotlandskaninens plusgirokonto
        35 03 44-8. Glöm inte att uppge namn och adress.
    </p>
    <p>
        Som medlem får man tre gånger om året föreningens medlemstidning Koharen
        som innehåller information till medlemmarna, artiklar och reportage,
        annonser samt kontaktuppgifter.
    </p>
  </div>
}

export function Kontakt() {
  const styles = useStyles();

  return <div className={styles.main}>
    <h1>
        Kontakta oss
    </h1>
    <p>
        info@gotlandskaninen.se
        Kontakt med föreningen, annonser och material till hemsidan
    </p>
    <p>
        gotlandskanin@gotlandskaninen.se
        Genbanksansvarig för Gotlandskanin, kassör
    </p>
    <p>
        mellerudskanin@gotlandskaninen.se
        Genbanksansvarig för Mellerudskanin, vice ordförande
    </p>
    <p>
        ordforande@gotlandskaninen.se
        Ordförande
    </p>
  </div>
}
