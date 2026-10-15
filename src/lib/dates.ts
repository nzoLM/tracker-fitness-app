// Fuseau fixe : le serveur peut tourner en UTC alors que les séances se font en France
const TIME_ZONE = "Europe/Paris";

const dayFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: TIME_ZONE,
});

const timeFormatter = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: TIME_ZONE,
});

const dayMonthFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: TIME_ZONE,
});

// Date et heure telles qu'affichées à Paris, pour les calculs de calendrier
const wallClockFormatter = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hourCycle: "h23",
  timeZone: TIME_ZONE,
});

const DAY_MS = 24 * 60 * 60 * 1000;

// « lundi 12 octobre »
export function formatDay(date: Date) {
  return dayFormatter.format(date);
}

// « 12 octobre »
export function formatDayMonth(date: Date) {
  return dayMonthFormatter.format(date);
}

// « 18:05 »
export function formatTime(date: Date) {
  return timeFormatter.format(date);
}

// Date civile à Paris, encodée en minuit UTC pour calculer sur les jours sans décalage horaire
function parisCalendarDay(date: Date) {
  const parts = Object.fromEntries(wallClockFormatter.formatToParts(date).map((part) => [part.type, part.value]));
  return Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day));
}

// Instant où commence à Paris le jour civil donné (minuit UTC du même jour)
function parisMidnight(calendarDay: number) {
  const parts = Object.fromEntries(
    wallClockFormatter.formatToParts(new Date(calendarDay)).map((part) => [part.type, Number(part.value)]),
  );
  // Décalage de Paris sur UTC (1 h ou 2 h) ; les changements d'heure ont lieu à 2 h ou 3 h, jamais à minuit
  const offset =
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - calendarDay;
  return new Date(calendarDay - offset);
}

// 0 pour lundi, 6 pour dimanche
export function dayOfWeek(date: Date) {
  return (new Date(parisCalendarDay(date)).getUTCDay() + 6) % 7;
}

// Lundi 0 h, heure de Paris, de la semaine contenant `date`
export function startOfWeek(date: Date) {
  return parisMidnight(parisCalendarDay(date) - dayOfWeek(date) * DAY_MS);
}

// Début de semaine décalé de `weeks` semaines ; passe par le calendrier pour ne pas
// dériver d'une heure quand l'intervalle traverse un changement d'heure
export function addWeeks(weekStart: Date, weeks: number) {
  return parisMidnight(parisCalendarDay(weekStart) + weeks * 7 * DAY_MS);
}
