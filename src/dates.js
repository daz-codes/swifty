import { execFile } from "child_process";
import path from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);
const gitDateCache = new Map();

const calendarDatePattern = /^(\d{4})-(\d{2})-(\d{2})$/;
const displayDateTimeFormatter = (timeZone) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });

const validCalendarParts = (year, month, day) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

const partsInTimeZone = (date, timeZone) =>
  Object.fromEntries(
    displayDateTimeFormatter(timeZone)
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

const calendarDateInTimeZone = (year, month, day, timeZone = "UTC") => {
  if (!validCalendarParts(year, month, day)) return null;
  const target = Date.UTC(year, month - 1, day);
  let instant = target;

  try {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const parts = partsInTimeZone(new Date(instant), timeZone);
      const represented = Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second,
      );
      const difference = represented - target;
      if (difference === 0) break;
      instant -= difference;
    }
    const result = new Date(instant);
    const finalParts = partsInTimeZone(result, timeZone);
    return finalParts.year === year &&
      finalParts.month === month &&
      finalParts.day === day
      ? result
      : null;
  } catch {
    return null;
  }
};

const parsePageDate = (dateValue, timeZone = "UTC") => {
  if (dateValue instanceof Date) {
    return Number.isNaN(dateValue.getTime())
      ? null
      : { date: new Date(dateValue.getTime()), dateOnly: false };
  }
  if (typeof dateValue !== "string") return null;

  const value = dateValue.trim();
  const isoCalendarDate = value.match(calendarDatePattern);
  if (isoCalendarDate) {
    const [, year, month, day] = isoCalendarDate.map(Number);
    const date = calendarDateInTimeZone(year, month, day, timeZone);
    return date ? { date, dateOnly: true } : null;
  }

  const ddmmyyyy = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy.map(Number);
    const date = calendarDateInTimeZone(year, month, day, timeZone);
    return date ? { date, dateOnly: true } : null;
  }

  const exactIsoTimestamp =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2})$/i;
  if (!exactIsoTimestamp.test(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : { date, dateOnly: false };
};

const parseDate = (dateValue, timeZone = "UTC") =>
  parsePageDate(dateValue, timeZone)?.date || null;

const formatDisplayDate = (date, config = {}) => {
  const parsed = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString(
    config.date_locale || "en-GB",
    {
      ...(config.dateFormat || {}),
      timeZone: config.timezone || "UTC",
    },
  );
};

const readGitDate = async (filePath) => {
  const absolutePath = path.resolve(filePath);
  const workingDirectory = path.dirname(absolutePath);
  const filename = path.basename(absolutePath);

  try {
    const { stdout } = await execFileAsync(
      "git",
      [
        "-C",
        workingDirectory,
        "log",
        "-1",
        "--follow",
        "--format=%cI",
        "--",
        filename,
      ],
      { encoding: "utf-8", timeout: 5000, windowsHide: true },
    );
    const value = stdout.trim();
    if (!value) return null;

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
};

const getGitFileDate = async (filePath) => {
  const cacheKey = path.resolve(filePath);
  if (!gitDateCache.has(cacheKey)) {
    gitDateCache.set(cacheKey, readGitDate(cacheKey));
  }

  const date = await gitDateCache.get(cacheKey);
  return date ? new Date(date.getTime()) : null;
};

const resolveFileDate = async (filePath, fallbackDate) => {
  const gitDate = await getGitFileDate(filePath);
  if (gitDate) return gitDate;

  const fallback =
    fallbackDate instanceof Date ? fallbackDate : new Date(fallbackDate);
  return Number.isNaN(fallback.getTime())
    ? null
    : new Date(fallback.getTime());
};

const clearGitDateCache = (filePath) => {
  if (filePath) {
    gitDateCache.delete(path.resolve(filePath));
  } else {
    gitDateCache.clear();
  }
};

export {
  calendarDateInTimeZone,
  clearGitDateCache,
  formatDisplayDate,
  getGitFileDate,
  parseDate,
  parsePageDate,
  resolveFileDate,
};
