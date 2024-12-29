// Shared filtering logic for rabbits in yearly reports

interface RabbitFilterResult {
  needUpdate: any[];
  canSkip: any[];
}

interface HerdTracking {
  date: string;
  [key: string]: any;
}

export interface Individual {
  number: string;
  death_date: string | null;
  birth_date: string | null;
  death_note?: string;
  certificate?: boolean;
  digital_certificate?: boolean;
  herd_tracking: HerdTracking[];
  weights?: { date: string }[];
  bodyfat?: { date: string }[];
  [key: string]: any;
}

export const isRabbitAliveAtYearEnd = (
  individual: Individual,
  reportYear: number
): boolean => {
  // Get death date if it exists
  const deathDate = individual.death_date
    ? new Date(individual.death_date)
    : null;
  const yearEndDate = new Date(`${reportYear}-12-31T23:59:59`);

  // Convert dates to start of day for comparison
  const yearEndStart = new Date(yearEndDate);
  yearEndStart.setHours(0, 0, 0, 0);
  const deathStart = deathDate
    ? new Date(deathDate.setHours(0, 0, 0, 0))
    : null;

  // If rabbit has a death note but no death date, consider it dead
  if (individual.death_note && !individual.death_date) {
    return false;
  }

  // A rabbit was alive at year end if:
  // 1. It has no death date AND no death note, or
  // 2. Its death date is after year end
  return (
    (!deathStart && !individual.death_note) ||
    (!!deathStart && deathStart > yearEndStart)
  );
};

export const hasValidTrackingInPeriod = (
  individual: Individual,
  reportYear: number
): boolean => {
  // Remove duplicate tracking entries and sort
  const uniqueTrackings = Array.from(
    new Map(
      individual.herd_tracking.map((track: HerdTracking) => [track.date, track])
    ).values()
  );
  const sortedTrackings = [...uniqueTrackings].sort(
    (a: HerdTracking, b: HerdTracking) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Get the most recent tracking that's not after the report year end
  const yearEnd = new Date(`${reportYear}-12-31T23:59:59`);
  const cutOffDate = new Date(yearEnd);
  cutOffDate.setMonth(cutOffDate.getMonth() - 13);

  // Set all dates to start of day for comparison
  yearEnd.setHours(0, 0, 0, 0);
  cutOffDate.setHours(0, 0, 0, 0);

  // Find the most recent tracking before or during the report year
  const relevantTracking = sortedTrackings.find((track) => {
    const trackDate = new Date(track.date);
    trackDate.setHours(0, 0, 0, 0);
    return trackDate <= yearEnd;
  });

  if (!relevantTracking) return false;

  const trackingDate = new Date(relevantTracking.date);
  trackingDate.setHours(0, 0, 0, 0);

  // Debug logging
  console.log(`Rabbit ${individual.number} tracking check:`, {
    trackingDate: trackingDate.toISOString(),
    cutOffDate: cutOffDate.toISOString(),
    yearEnd: yearEnd.toISOString(),
    isValid: trackingDate >= cutOffDate && trackingDate <= yearEnd,
    death_note: individual.death_note,
    death_date: individual.death_date,
    birth_date: individual.birth_date,
    herd: individual.herd,
    allTrackings: sortedTrackings.map((t) => ({ date: t.date })),
  });

  // If rabbit has a death note but no death date, it must have tracking after the death note
  if (individual.death_note && !individual.death_date) {
    return false; // Consider these rabbits inactive
  }

  // Tracking must be between cutoff and year end
  return trackingDate >= cutOffDate && trackingDate <= yearEnd;
};

export const hasValidMeasurementsInPeriod = (
  rabbit: Individual,
  startDate: Date,
  endDate: Date
): boolean => {
  // Set all dates to start of day for comparison
  const periodStart = new Date(startDate);
  const periodEnd = new Date(endDate);
  periodStart.setHours(0, 0, 0, 0);
  periodEnd.setHours(0, 0, 0, 0);

  const isValidMeasurementDate = (date: string) => {
    const measurementDate = new Date(date);
    measurementDate.setHours(0, 0, 0, 0);
    return measurementDate >= periodStart && measurementDate <= periodEnd;
  };

  // Check if rabbit has weight in valid range
  const hasValidWeight = (rabbit.weights || []).some((w) =>
    isValidMeasurementDate(w.date)
  );

  // Check if rabbit has bodyfat in valid range
  const hasValidBodyfat = (rabbit.bodyfat || []).some((bf) =>
    isValidMeasurementDate(bf.date)
  );

  // Debug logging
  console.log(`Measurement check for ${rabbit.number}:`, {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    weights: rabbit.weights?.map((w) => ({ date: w.date })),
    bodyfat: rabbit.bodyfat?.map((bf) => ({ date: bf.date })),
    hasValidWeight,
    hasValidBodyfat,
    isValid: hasValidWeight && hasValidBodyfat,
  });

  return hasValidWeight && hasValidBodyfat;
};

export const isRabbitBornBeforeYearEnd = (
  individual: Individual,
  reportYear: number
): boolean => {
  if (!individual.birth_date) return true; // If no birth date, assume it's valid
  const birthDate = new Date(individual.birth_date);
  const yearEndDate = new Date(`${reportYear}-12-31T23:59:59`);

  // Set both dates to start of day for comparison
  birthDate.setHours(0, 0, 0, 0);
  yearEndDate.setHours(0, 0, 0, 0);

  // Debug logging
  console.log(`Birth date check for ${individual.number}:`, {
    birthDate: birthDate.toISOString(),
    yearEndDate: yearEndDate.toISOString(),
    isValid: birthDate <= yearEndDate,
    birth_date: individual.birth_date,
    reportYear,
  });

  return birthDate <= yearEndDate;
};

export const filterRabbitsForYearlyReport = (
  individualsData: Individual[],
  reportYear: number,
  startDate: Date,
  endDate: Date
): RabbitFilterResult => {
  // First filter rabbits with certificates that were alive during report period
  const rabbitsWithStatus = individualsData.filter((individual) => {
    const hasCertificate =
      individual.certificate || individual.digital_certificate;

    const bornBeforeYearEnd = isRabbitBornBeforeYearEnd(individual, reportYear);
    const hasValidTracking = hasValidTrackingInPeriod(individual, reportYear);
    const wasAliveAtYearEnd = isRabbitAliveAtYearEnd(individual, reportYear);

    // Debug logging
    console.log(`Filtering ${individual.number}:`, {
      hasCertificate,
      bornBeforeYearEnd,
      hasValidTracking,
      wasAliveAtYearEnd,
      birth_date: individual.birth_date,
      reportYear,
    });

    // Must have certificate, valid tracking, be alive at year end, and born before year end
    return (
      hasCertificate &&
      hasValidTracking &&
      wasAliveAtYearEnd &&
      bornBeforeYearEnd
    );
  });

  // Then check measurements
  return rabbitsWithStatus.reduce(
    (acc: RabbitFilterResult, rabbit: Individual) => {
      // Check if rabbit has valid measurements during the report period
      const hasValidMeasurements = hasValidMeasurementsInPeriod(
        rabbit,
        startDate,
        endDate
      );

      // A rabbit can be skipped if it has valid measurements
      if (hasValidMeasurements) {
        acc.canSkip.push(rabbit);
      } else {
        acc.needUpdate.push(rabbit);
      }
      return acc;
    },
    { canSkip: [], needUpdate: [] }
  );
};
