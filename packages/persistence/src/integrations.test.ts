import { describe, expect, it } from 'vitest';
import { buildTallyStockExportEnvelope, parseTallyStockItemsXml } from './tally-parser.js';

describe('Tally Parser & Connector Framework', () => {
  it('parses TallyPrime XML stock items with quantities, rates, and units', () => {
    const sampleXml = `
      <ENVELOPE>
        <BODY>
          <IMPORTDATA>
            <REQUESTDATA>
              <TALLYMESSAGE xmlns:UDF="TallyUDF">
                <STOCKITEM NAME="PVC Conduit Pipe 25mm" RESERVEDNAME="">
                  <PARTNO>SKU-PVC-25</PARTNO>
                  <BASEUNITS>Meter</BASEUNITS>
                  <OPENINGBALANCE> 150.00 Meter</OPENINGBALANCE>
                  <CLOSINGBALANCE> 120.00 Meter</CLOSINGBALANCE>
                  <CLOSINGRATE> 48.00/Meter</CLOSINGRATE>
                  <HSNCODE>3917</HSNCODE>
                </STOCKITEM>
                <STOCKITEM NAME="Solar Inverter 5kW">
                  <PARTNO>SKU-INV-5KW</PARTNO>
                  <CLOSINGBALANCE> 15 Nos</CLOSINGBALANCE>
                  <CLOSINGRATE> 45000.00/Nos</CLOSINGRATE>
                </STOCKITEM>
              </TALLYMESSAGE>
            </REQUESTDATA>
          </IMPORTDATA>
        </BODY>
      </ENVELOPE>
    `;

    const items = parseTallyStockItemsXml(sampleXml);
    expect(items).toHaveLength(2);

    expect(items[0]).toEqual({
      name: 'PVC Conduit Pipe 25mm',
      sku: 'SKU-PVC-25',
      quantity: 120,
      rateRupees: 48,
      hsnCode: '3917',
      unit: 'Meter',
    });

    expect(items[1].name).toBe('Solar Inverter 5kW');
    expect(items[1].quantity).toBe(15);
    expect(items[1].rateRupees).toBe(45000);
  });

  it('generates standard Tally stock export request XML envelope', () => {
    const xml = buildTallyStockExportEnvelope();
    expect(xml).toContain('<TALLYREQUEST>Export Data</TALLYREQUEST>');
    expect(xml).toContain('<REPORTNAME>Stock Item</REPORTNAME>');
    expect(xml).toContain('<SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT>');
  });

  it('handles empty or malformed XML gracefully', () => {
    const items = parseTallyStockItemsXml('<INVALID>XML</INVALID>');
    expect(items).toEqual([]);
  });
});
