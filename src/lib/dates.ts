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

// « lundi 12 octobre »
export function formatDay(date: Date) {
  return dayFormatter.format(date);
}

// « 18:05 »
export function formatTime(date: Date) {
  return timeFormatter.format(date);
}
