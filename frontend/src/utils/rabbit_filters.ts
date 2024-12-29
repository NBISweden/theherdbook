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

  return birthDate <= yearEndDate;
};

export const belongedToHerdOnDate = (
  individual: Individual,
  herdId: string,
  date: Date
): boolean => {
  const herdTrackingEntries = individual.herd_tracking || [];
  if (herdTrackingEntries.length === 0) return false;

  // Sort entries by date in descending order
  const sortedEntries = [...herdTrackingEntries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Get the latest entry before or on the check date
  const relevantEntry = sortedEntries.find(
    (entry) => new Date(entry.date) <= date
  );

  // If no relevant entry found, or the latest entry shows a different herd
  if (!relevantEntry || relevantEntry.herd !== herdId) {
    return false;
  }

  return true;
};

export function filterRabbitsForYearlyReport(
  individuals: Individual[],
  reportYear: number,
  startDate: Date,
  endDate: Date,
  currentHerdId: string
): { needUpdate: Individual[]; canSkip: Individual[] } {
  const needUpdate: Individual[] = [];
  const canSkip: Individual[] = [];
  const yearEndDate = new Date(`${reportYear}-12-31`);

  for (const individual of individuals) {
    // Skip rabbits without certificates
    if (!individual.certificate) {
      continue;
    }

    // Skip rabbits that died before the report year end
    const deathDate = individual.death_date
      ? new Date(individual.death_date)
      : null;
    if (deathDate && deathDate <= yearEndDate) {
      continue;
    }

    // Skip rabbits with death note but no death date (considered dead)
    if (individual.death_note && !individual.death_date) {
      continue;
    }

    // Skip rabbits that didn't belong to this herd at year end
    if (!belongedToHerdOnDate(individual, currentHerdId, yearEndDate)) {
      continue;
    }

    // Check if rabbit has valid measurements in the period
    const hasValidMeasurements = hasValidMeasurementsInPeriod(
      individual,
      startDate,
      endDate
    );

    // If the rabbit has valid measurements, add to canSkip
    if (hasValidMeasurements) {
      canSkip.push(individual);
    } else {
      needUpdate.push(individual);
    }
  }

  return { needUpdate, canSkip };
}
