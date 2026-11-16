export interface ParsedCsvResult {
  headers: string[];
  rawRows: string[][];
  rows: Record<string, string>[];
}

export function parseCsv(content: string): ParsedCsvResult {
  const sanitized = content.replace(/^\uFEFF/, '');
  const lines: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;
  let i = 0;

  while (i < sanitized.length) {
    const char = sanitized[i];

    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < sanitized.length && sanitized[i + 1] === '"') {
          currentField += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField);
        currentField = '';
      } else if (char === '\r') {
        if (i + 1 < sanitized.length && sanitized[i + 1] === '\n') {
          i++;
        }
        currentRow.push(currentField);
        lines.push(currentRow);
        currentRow = [];
        currentField = '';
      } else if (char === '\n') {
        currentRow.push(currentField);
        lines.push(currentRow);
        currentRow = [];
        currentField = '';
      } else {
        currentField += char;
      }
    }
    i++;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    lines.push(currentRow);
  }

  const nonEmptyLines = lines.filter((line) => line.some((field) => field.trim().length > 0));

  if (nonEmptyLines.length === 0) {
    return { headers: [], rawRows: [], rows: [] };
  }

  const rawHeaders = nonEmptyLines[0];
  const headers = rawHeaders.map((h) => h.trim());
  const dataLines = nonEmptyLines.slice(1);

  const rows: Record<string, string>[] = dataLines.map((row) => {
    const rowObj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      rowObj[h] = (row[idx] ?? '').trim();
    });
    return rowObj;
  });

  return { headers, rawRows: dataLines, rows };
}

function escapeCsvField(val: unknown): string {
  if (val === null || val === undefined) {
    return '';
  }
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function stringifyCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const headerLine = headers.map(escapeCsvField).join(',');
  const rowLines = rows.map((row) => headers.map((h) => escapeCsvField(row[h])).join(','));
  return [headerLine, ...rowLines].join('\r\n');
}
