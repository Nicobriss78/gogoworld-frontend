export function suggestDateEnd(dateStartValue) {
  if (!dateStartValue) return "";

  const start = new Date(dateStartValue);

  if (Number.isNaN(start.getTime())) return "";

  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

  return toDateTimeLocalValue(end);
}

export function toDateTimeLocalValue(date) {
  const pad = (value) => String(value).padStart(2, "0");

  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}
