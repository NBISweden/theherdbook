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
  console.log(`Checking tracking for ${individual.number}:`);
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
  console.log(
    "Tracking dates:",
    sortedTrackings.map((t) => t.date)
  );

  // Get the report year end date
  const yearEnd = new Date(`${reportYear}-12-31T23:59:59`);
  yearEnd.setHours(0, 0, 0, 0);

  // If rabbit has a death note but no death date, consider it inactive
  if (individual.death_note && !individual.death_date) {
    console.log("Has death note but no death date - invalid");
    return false;
  }

  // If rabbit died before year end, it's not valid
  if (individual.death_date) {
    const deathDate = new Date(individual.death_date);
    deathDate.setHours(0, 0, 0, 0);
    if (deathDate <= yearEnd) {
      console.log("Died before year end - invalid");
      return false;
    }
  }

  // For all rabbits, must have tracking on or after year end
  const hasValidTracking = sortedTrackings.some((track) => {
    const trackDate = new Date(track.date);
    trackDate.setHours(0, 0, 0, 0);
    return trackDate >= yearEnd;
  });

  console.log("Has valid tracking on/after year end:", hasValidTracking);
  return hasValidTracking;
};

export const hasValidMeasurementsInPeriod = (
  rabbit: Individual,
  startDate: Date,
  endDate: Date,
  reportYear: number
): boolean => {
  // Set all dates to start of day for comparison
  const periodStart = new Date(startDate);
  const periodEnd = new Date(endDate);
  periodStart.setHours(0, 0, 0, 0);
  periodEnd.setHours(0, 0, 0, 0);

  // If rabbit was born during the report year and has valid tracking, skip measurement check
  const birthYear = rabbit.birth_date
    ? new Date(rabbit.birth_date).getFullYear()
    : 0;
  if (birthYear === reportYear) {
    return hasValidTrackingInPeriod(rabbit, reportYear);
  }

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
    console.log(`\nChecking rabbit ${individual.number}:`);

    // Skip rabbits without certificates
    if (!individual.certificate && !individual.digital_certificate) {
      console.log("No certificate - skipping");
      continue;
    }

    // Skip rabbits that died before the report year end
    const deathDate = individual.death_date
      ? new Date(individual.death_date)
      : null;
    if (deathDate && deathDate <= yearEndDate) {
      console.log("Died before year end - skipping");
      continue;
    }

    // Skip rabbits with death note but no death date (considered dead)
    if (individual.death_note && !individual.death_date) {
      console.log("Has death note but no death date - skipping");
      continue;
    }

    // Skip rabbits that didn't belong to this herd at year end
    const belongsToHerd = belongedToHerdOnDate(
      individual,
      currentHerdId,
      yearEndDate
    );
    console.log("Belongs to herd at year end:", belongsToHerd);
    if (!belongsToHerd) {
      console.log("Not in herd at year end - skipping");
      continue;
    }

    // Skip rabbits born after the report year
    if (individual.birth_date) {
      const birthYear = new Date(individual.birth_date).getFullYear();
      console.log("Birth year:", birthYear, "Report year:", reportYear);
      if (birthYear > reportYear) {
        console.log("Born after report year - skipping");
        continue;
      }
    }

    // Check if rabbit has valid measurements in the period
    const hasValidMeasurements = hasValidMeasurementsInPeriod(
      individual,
      startDate,
      endDate,
      reportYear
    );
    console.log("Has valid measurements:", hasValidMeasurements);

    if (hasValidMeasurements) {
      console.log("Adding to canSkip");
      canSkip.push(individual);
    } else {
      console.log("Adding to needUpdate");
      needUpdate.push(individual);
    }
  }

  return { needUpdate, canSkip };
}
