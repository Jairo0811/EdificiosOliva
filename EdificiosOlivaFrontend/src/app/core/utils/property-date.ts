/** IANA time zone of the properties (Punta Cana / Santo Domingo, UTC-4, no DST). */
export const PROPERTY_TIME_ZONE = 'America/Santo_Domingo';

/**
 * Returns "today" as YYYY-MM-DD in the property's time zone, so past-date
 * blocking does not depend on the visitor's browser time zone.
 */
export function todayInPropertyZone(now: Date = new Date()): string {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: PROPERTY_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
