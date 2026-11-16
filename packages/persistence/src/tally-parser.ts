export interface ParsedTallyStockItem {
  name: string;
  sku: string;
  quantity: number;
  rateRupees?: number;
  hsnCode?: string;
  unit?: string;
}

function extractName(attrs: string, body: string): string {
  const attrName = /NAME="([^"]+)"/i.exec(attrs);
  if (attrName?.[1]) return attrName[1].trim();
  const tagNode = /<NAME>([^<]+)<\/NAME>/i.exec(body);
  return (tagNode?.[1] || '').trim();
}

function extractQuantity(body: string): number {
  const match =
    /<CLOSINGBALANCE>([^<]+)<\/CLOSINGBALANCE>/i.exec(body) ||
    /<OPENINGBALANCE>([^<]+)<\/OPENINGBALANCE>/i.exec(body);
  if (!match?.[1]) return 0;
  const numMatch = /([+-]?\d+(?:\.\d+)?)/.exec(match[1]);
  return numMatch ? Math.round(parseFloat(numMatch[1])) : 0;
}

function extractRate(body: string): number | undefined {
  const match =
    /<CLOSINGRATE>([^<]+)<\/CLOSINGRATE>/i.exec(body) ||
    /<OPENINGRATE>([^<]+)<\/OPENINGRATE>/i.exec(body);
  if (!match?.[1]) return undefined;
  const numMatch = /([+-]?\d+(?:\.\d+)?)/.exec(match[1]);
  return numMatch ? parseFloat(numMatch[1]) : undefined;
}

function parseItem(attrs: string, body: string): ParsedTallyStockItem | null {
  const name = extractName(attrs, body);
  if (!name) return null;

  const partNoMatch = /<PARTNO>([^<]+)<\/PARTNO>/i.exec(body);
  const sku = (partNoMatch?.[1] || name).trim();
  const quantity = extractQuantity(body);
  const rateRupees = extractRate(body);
  const hsnMatch = /<HSNCODE>([^<]+)<\/HSNCODE>/i.exec(body);
  const unitMatch = /<BASEUNITS>([^<]+)<\/BASEUNITS>/i.exec(body);

  return {
    name,
    sku,
    quantity,
    rateRupees,
    hsnCode: hsnMatch?.[1]?.trim(),
    unit: unitMatch?.[1]?.trim(),
  };
}

export function parseTallyStockItemsXml(xml: string): ParsedTallyStockItem[] {
  const items: ParsedTallyStockItem[] = [];
  const stockItemRegex = /<STOCKITEM\b([^>]*)>([\s\S]*?)<\/STOCKITEM>/gi;

  let match: RegExpExecArray | null;
  while ((match = stockItemRegex.exec(xml)) !== null) {
    const item = parseItem(match[1] || '', match[2] || '');
    if (item) {
      items.push(item);
    }
  }

  return items;
}

export function buildTallyStockExportEnvelope(): string {
  return [
    '<ENVELOPE>',
    '  <HEADER>',
    '    <TALLYREQUEST>Export Data</TALLYREQUEST>',
    '  </HEADER>',
    '  <BODY>',
    '    <EXPORTDATA>',
    '      <REQUESTDESC>',
    '        <REPORTNAME>Stock Item</REPORTNAME>',
    '        <STATICVARIABLES>',
    '          <SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>',
    '        </STATICVARIABLES>',
    '      </REQUESTDESC>',
    '    </EXPORTDATA>',
    '  </BODY>',
    '</ENVELOPE>',
  ].join('\n');
}
