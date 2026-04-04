const DEFAULT_TIME_ZONE = "Asia/Kolkata"

export function parseDatabaseDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number)
  return new Date(year, month - 1, day)
}

export function formatDatabaseDate(
  dateString: string,
  options?: Intl.DateTimeFormatOptions,
  locale = "en-US",
) {
  return parseDatabaseDate(dateString).toLocaleDateString(locale, options)
}

export function getMonthKeyFromDatabaseDate(dateString: string) {
  return dateString.slice(0, 7)
}

export function getMonthLabel(monthKey: string, locale = "en-US") {
  const [year, month] = monthKey.split("-").map(Number)
  return new Date(year, month - 1, 1).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  })
}

export function getCurrentDateInTimeZone(timeZone = DEFAULT_TIME_ZONE) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })

  return formatter.format(new Date())
}
