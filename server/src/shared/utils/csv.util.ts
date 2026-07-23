/**
 * A minimal RFC 4180 reader/writer.
 *
 * Pulling in a CSV library for this would be heavier than the format itself:
 * fields separated by commas, optionally wrapped in double quotes, with a
 * doubled `""` standing for a literal quote inside a quoted field. That is the
 * entire specification we need.
 */

export type CsvCell = string | number | boolean | null | undefined;

/**
 * Spreadsheets treat a leading `=`, `+`, `-` or `@` as the start of a formula,
 * so a cell like `=HYPERLINK(...)` typed into an expense description would
 * *execute* when the export is opened. Prefixing with an apostrophe forces the
 * value back to text — the standard CSV-injection defence.
 */
const neutraliseFormula = (value: string): string =>
  /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;

const escapeCell = (value: CsvCell): string => {
  if (value === null || value === undefined) return '';

  const text = neutraliseFormula(String(value));
  // Only quote when we must — cleaner diffs and smaller files.
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** Serialises a header row plus body rows. CRLF is what Excel expects. */
export const toCsv = (headers: readonly string[], rows: readonly CsvCell[][]): string =>
  [headers, ...rows].map((row) => row.map(escapeCell).join(',')).join('\r\n');

/**
 * Parses CSV text into a grid of raw strings. Handles quoted fields, escaped
 * quotes, a UTF-8 BOM and either line ending. Entirely blank lines are dropped —
 * a trailing newline is the norm, not a row of empty values.
 */
export const parseCsv = (input: string): string[][] => {
  // A UTF-8 BOM survives the buffer→string decode and would corrupt the first header.
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];

  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char !== '"') {
        cell += char;
      } else if (text[index + 1] === '"') {
        cell += '"';
        index += 1; // Consume the second quote of the escaped pair.
      } else {
        inQuotes = false;
      }
      continue;
    }

    switch (char) {
      case '"':
        inQuotes = true;
        break;
      case ',':
        row.push(cell);
        cell = '';
        break;
      case '\r':
        break; // Normalise CRLF to LF by ignoring the carriage return.
      case '\n':
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
        break;
      default:
        cell += char;
    }
  }

  // A file that does not end in a newline still has one row pending.
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  return rows.filter((cells) => cells.some((value) => value.trim() !== ''));
};

/**
 * Matches a header cell to a known column, ignoring case, spaces and
 * punctuation — real-world exports write "Payment Method", "payment_method"
 * and "paymentmethod" interchangeably.
 */
export const normaliseHeader = (value: string): string =>
  value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
