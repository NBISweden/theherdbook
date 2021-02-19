/**
 * @file This file shows the calculated COI and resulting recommendations based on that COI
 */
import React from 'react'

export function InbreedingRecommendation({femlabel, malelabel, COI, sufficientGenerations = true} : {femlabel: string, malelabel: string, COI: number, sufficientGenerations: boolean}) {
    const beneficialCOI = 5
    const badCOI = 10
    let recommendation
    if (!sufficientGenerations) {
      recommendation = <p> Too few generations available to make accurate assessment of inbreed coefficient </p>
    } else if (COI == 0) {
      recommendation = <p> Inga gemensamma förfäder, ok att para {femlabel} och {malelabel} </p>
    } else if (COI <= beneficialCOI) {
      recommendation = <p> Gemensamma förfäder, men bör ej ha deleterious effects att para {femlabel} och {malelabel} </p>
    } else if (COI <= badCOI) {
      recommendation = <p> Gemensamma förfäder, modest detrimental effects att para {femlabel} och {malelabel} </p>
    } else {
      recommendation = <p> Gemensamma förfäder, significant effects on the offspring and detrimental effects on the breed att para {femlabel} och {malelabel} </p>
    }
    return <>
      <div>
       <h1> Resultat beräkning </h1>
       <p> Inavelskoefficient {COI} </p>
       {recommendation}
      </div>
    </>
  }