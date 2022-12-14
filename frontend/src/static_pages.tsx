/**
 * @file This file contains the static pages of the site.
 */

import * as React from "react";
import { Paper, Typography } from "@material-ui/core";
import "./style.css";
import tags from "./tags.json";

// jscpd:ignore-start

export function About() {
  return (
    <div className="staticMain">
      <Typography variant="h3" className="heading">
        Välkommen till Stamboken Online
      </Typography>
      <Typography variant="body1" className="pSpace">
        <p>
          Detta är Föreningen Gotlandskaninens system för stambokföring online.
          Använd menyn för att logga in med hjälp av ditt Gottiskonto. Har du
          inget sådant kan du som är medlem i föreningen ansöka om ett via detta
          formulär.{" "}
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://docs.google.com/forms/d/e/1FAIpQLSe_Pe8Bl6BIHp-VW6x4iziiBs5AfxpMF3OaqLtIVyVXM-JrsQ/viewform?usp=share_link"
          >
            Kontoansökan
          </a>
        </p>
        <p>
          Behöver du hjälp kontakt admin@gotlandskanin.se, du kommer också åt
          hjälpsidorna under menyval "Hjälp" när du väl har loggat in.
        </p>
      </Typography>
    </div>
  );
}

export function HelpStamboken() {
  return (
    <div className="staticMain">
      <Typography variant="h3" className="heading">
        Stamboken Online
      </Typography>
      <Typography variant="body1" className="pSpace">
        <p>
          En anv&auml;ndarmanual &auml;r p&aring;b&ouml;rjad men den &auml;r
          inte komplett:
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://docs.google.com/document/d/1JvRkCF_shc7u9XtWH0uMXyhI0MTA2TOmaqPH4nHr_bU/"
          >
            Anv&auml;ndarmanual f&ouml;r Stamboken Online
          </a>
          Bidra g&auml;rna med &auml;ndringar till dokumentet eller l&auml;gg
          till kommentarer osv.{" "}
        </p>
        <p></p>
        <p>
          Som ett komplement till den oskrivna manualen finns f&ouml;ljande
          presentationsserie :
        </p>
        <p></p>
        <ul>
          <li>
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://docs.google.com/presentation/d/e/2PACX-1vRFpCPl_UG4TTHpuo342uR-AmjWSgLrZOAEBItIlH1NnSML0Xxh_8mXI94Xars4Hg/pub?start%3Dfalse%26loop%3Dfalse%26delayms%3D3000"
            >
              Del 1 &Ouml;verblick
            </a>
          </li>
          <li>
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://docs.google.com/presentation/d/e/2PACX-1vTPYymU-2TkiTl-2VvCeodXT-MIa4fFjXiY4SDlEkSJT0GA4pve0tRehC0Xw0xh7A/pub?start%3Dfalse%26loop%3Dfalse%26delayms%3D3000"
            >
              Del 2 Registrera ny kanin
            </a>
          </li>
          <li>
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://docs.google.com/presentation/d/e/2PACX-1vQgciSjLnDLn7cVutnE2dVOFIy0VUGjHqUSQtqU3sXTDFtVtgSjLkfc36fHDzEYeg/pub?start%3Dfalse%26loop%3Dfalse%26delayms%3D3000h"
            >
              Del 3 Utf&auml;rda digitalt Genbanksintyg
            </a>
          </li>
          <li>
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://docs.google.com/presentation/d/e/2PACX-1vTsJQdkHkKCw1Qr-V6Q0HY5xVg9pEKEEheu5wrlXSDo6jw6_XzQSQ0K6K3zXoqjmA/pub?start%3Dfalse%26loop%3Dfalse%26delayms%3D3000"
            >
              Del 4 Kullar och parningar
            </a>
          </li>
        </ul>
        <p></p>
        <p>
          Om n&aring;got fortfarande &auml;r oklart finns det flera s&auml;tt
          att f&aring; hj&auml;lp :
        </p>
        <p></p>
        <ol>
          <li>
            Posta en fr&aring;ga i forumet. Tex i &nbsp;
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://forum.gotlandskaninen.se/t/stamboken-online/228?u=jonas"
            >
              Tr&aring;den om Stamboken online
            </a>
            .
          </li>
          <li>
            Du kan ocks&aring; anv&auml;nda feedback funktionen direkt p&aring;
            sidan, den &auml;r v&auml;ldigt bra om du st&ouml;ter p&aring; en
            tex bugg. D&aring; klickar du p&aring; den r&ouml;da rutan till
            h&ouml;ger d&auml;r det st&aring;r &quot;Ge oss feedback&quot;.
          </li>
          <li>
            Anv&auml;nd v&aring;rt{" "}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://chat.google.com/room/AAAAGHaEuvo?cls%3D7"
            >
              chatrum
            </a>
            &nbsp;.
          </li>
          <li>
            S&auml;nd &nbsp;E-post till{" "}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="mailto:admin@gotlandskaninen.se"
            >
              admin@gotlandskaninen.se
            </a>
            .
          </li>
          <li>
            Beh&ouml;ver du hj&auml;lp med redigering &nbsp;av n&aring;gon kanin
            s&aring; kontaktar du Genbanksansvariga direkt.{" "}
          </li>

          <ul>
            <li>
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="mailto:gotlandskanin@gotlandskaninen.se"
              >
                gotlandskanin@gotlandskaninen.se
              </a>
            </li>
            <li>
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="mailto:mellerudskanin@gotlandskaninen.se"
              >
                mellerudskanin@gotlandskaninen.se
              </a>
            </li>
          </ul>

          <li>Kontakta valfri person i styrelsen,</li>
        </ol>
      </Typography>
    </div>
  );
}

export function Gotlandskaninen() {
  return (
    <div className="staticMain">
      <Typography variant="h3" className="heading">
        Gotlandskaninen
      </Typography>
      <Typography variant="body1" className="pSpace">
        <p>
          Gotlandskaninen är en rest av den gamla svenska lantraskaninen. På
          1970-talet uppmärksammades att det fanns några gårdar på Gotland som
          hade kvar kaniner av den gamla stammen. De gavs då namnet
          Gotlandskanin. Efter en inventering 1993 slöts rasregistret och dagens
          Gotlandskaniner är ättlingar till inventeringsdjuren.
        </p>
        <p>
          En fullvuxen Gotlandskanin väger 3-4 kg. Öronen är upprättstående och
          pälsen kort. Färg och teckning varierar mycket, och de flesta typer
          som förekommer bland raskaniner återfinns hos gotlänningen, men oftast
          i mindre utpräglad form.
        </p>
        <p>
          Till temperamentet är Gotlandskaninen livlig och nyfiken och visar
          ofta stort intresse för sin omgivning. Normalt får Gotlandskaninen 6-8
          ungar per kull. Ungarna tillväxer relativt långsamt i jämförelse med
          utpräglade produktionsraser. Men å andra sidan är man normalt
          återhållsam med kraftfoder till Gotlandskaniner. Basfödan är hö, eller
          på sommarhalvåret, gräs och örter.
        </p>
        <p>
          Bevarandearbetet organiseras av Föreningen Gotlandskaninen i ett
          genbankssystem. Aveln sker i speciella besättningar som föreningen
          godkänt. Det finns ungefär 150 sådana besättningar spridda över hela
          Sverige för Gotlandskanin. De rapporterar till föreningen vad som sker
          i besättningen och utfärdar stamtavlor (genbanksintyg) för de djur som
          går vidare i avelsarbetet i gamla eller nya besättningar.
        </p>
        <p>
          Om du är intresserad av att veta mer, eller vill starta en
          genbanksbesättning för Gotlandskanin, kontakta genbanksansvarig,
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="mailto:gotlandskanin@gotlandskaninen.se"
          >
            gotlandskanin@gotlandskaninen.se
          </a>
          .
        </p>
      </Typography>
    </div>
  );
}

export function Mellerudskaninen() {
  return (
    <div className="staticMain">
      <Typography variant="h3" className="heading">
        Mellerudskaninen
      </Typography>
      <Typography variant="body1" className="pSpace">
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
          från Stora Grimön i Vänern. Den enda kända inkorsningen av djur
          utifrån är från 1968. Då togs två svart-vit brokiga djur, en hona och
          en hane, in i besättningen. Djurantalet i har tidigare legat kring
          15-20 men minskade under de sista åren drastiskt. De sista djuren
          köptes ut från ursprungsbesättningen under 2007.
        </p>
        <p>
          I slutet av oktober 2011 godkände Jordbruksverket Föreningen
          Gotlandskaninens avelsplan för Mellerudskanin och därmed är
          Mellerudskaninen officiellt en svensk husdjursras. Bevarandearbete
          organiseras av Föreningen Gotlandskaninen i ett genbankssystem. Aveln
          sker i speciella besättningar som föreningen godkänt. Det finns
          ungefär 50 sådana besättningar för Mellerudskanin spridda över hela
          Sverige. De rapporterar till föreningen vad som sker i besättningen
          och utfärdar stamtavlor (genbanksintyg) för de djur som går vidare i
          avelsarbetet i gamla eller nya besättningar.
        </p>
        <p>
          Om du är intresserad av att veta mer, eller vill starta en
          genbanksbesättning för Mellerudskanin, kontakta genbanksansvarig,
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="mailto:mellerudskanin@gotlandskaninen.se"
          >
            mellerudskanin@gotlandskaninen.se
          </a>
          .
        </p>
      </Typography>
    </div>
  );
}

export function Medlem() {
  return (
    <div className="staticMain">
      <Typography variant="h3" className="heading">
        Bli Medlem
      </Typography>
      <Typography variant="body1" className="pSpace">
        <p>
          Vill du bli medlem i föreningen? Då kan du antingen kontakta
          föreningen eller sätta in 200 kr på Föreningen Gotlandskaninens
          plusgirokonto 35 03 44-8. Glöm inte att uppge namn och adress.
        </p>
        <p>
          Som medlem får man tre gånger om året föreningens medlemstidning
          Koharen som innehåller information till medlemmarna, artiklar och
          reportage, annonser samt kontaktuppgifter.
        </p>
      </Typography>
    </div>
  );
}

export function Kontakt() {
  return (
    <div className="staticMain">
      <Typography variant="h3" className="heading">
        Kontakta oss
      </Typography>
      <Typography variant="body1" className="pSpace">
        <p>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="mailto:info@gotlandskaninen.se"
          >
            info@gotlandskaninen.se
          </a>
          Kontakt med föreningen, annonser och material till hemsidan
        </p>
        <p>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="mailto:gotlandskanin@gotlandskaninen.se"
          >
            gotlandskanin@gotlandskaninen.se
          </a>
          Genbanksansvarig för Gotlandskanin, kassör
        </p>
        <p>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="mailto:mellerudskanin@gotlandskaninen.se"
          >
            mellerudskanin@gotlandskaninen.se
          </a>
          Genbanksansvarig för Mellerudskanin
        </p>
        <p>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="mailto:ordforande@gotlandskaninen.se"
          >
            ordforande@gotlandskaninen.se
          </a>
          Ordförande
        </p>
        <p>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://forum.gotlandskaninen.se/t/stamboken-online/228?u=jonas"
          >
            Tråd om Stamboken online i vårt forum
          </a>
        </p>
      </Typography>
    </div>
  );
}

export function Footer() {
  return (
    <div className="footer">
      <div className="euLogo">
        <img src="/images/EU-flagga-Europeiska-jordbruksfonden-färg.jpg" />
      </div>
      <div>
        <Typography className="euText">
          Föreningen Gotlandskaninen får stöd från EU för att bevara Gotlands-
          och Mellerudskanin. Stödet går till genbanksbesättningarna,
          medlemstidningen, trycksaker, genbanksintyg, marknadsföring, kurser
          och utbildningar, transport av värdefulla djur samt obduktioner.
        </Typography>

        <Typography className="euText">
          <p>
            Stamboken Online version :{" "}
            <a
              target={"_blank"}
              rel={"noopener noreferrer"}
              href={
                "https://github.com/NBISweden/theherdbook/tree/" +
                tags.gitBranch
              }
            >
              {tags.gitBranch}
            </a>
          </p>
        </Typography>
      </div>
      <div>
        <img src="/images/logo.png" alt="logo" className="logoImage" />
      </div>
    </div>
  );
}
// jscpd:ignore-end
