import { eq } from 'drizzle-orm';
import type { CompanyProfile, UpdateCompanyProfile } from '@palnadu/contracts';
import { companySettings } from './company.schema.js';
import type { DbExecutor } from './client.js';

const DEFAULT_PROFILE: CompanyProfile = {
  companyName: 'Palnadu Solar & Electricals',
  tradingName: 'Palnadu Smart Systems',
  registeredAddress: 'Commercial Complex, Narasaraopet, Palnadu District, AP 522601',
  contactEmail: 'sales@palnadusmart.in',
  contactPhone: '+91 8647 222333',
  websiteUrl: 'https://palnadusmart.in',
  gstin: '37AAAAA0000A1Z5',
  logoUrl: null,
  quotationTerms:
    '1. Quotation valid for 15 days from issue date.\n2. Standard warranty applies per manufacturer specification.\n3. Goods once sold will not be accepted without prior RMA approval.',
  bankDetails: 'State Bank of India\nA/C No: 123456789012\nIFSC: SBIN0001234\nBranch: Narasaraopet',
};

export async function getCompanyProfile(db: DbExecutor): Promise<CompanyProfile> {
  const rows = await db
    .select()
    .from(companySettings)
    .where(eq(companySettings.id, 'default'))
    .limit(1);

  if (rows.length > 0 && rows[0]) {
    const row = rows[0];
    return {
      companyName: row.companyName,
      tradingName: row.tradingName,
      registeredAddress: row.registeredAddress,
      contactEmail: row.contactEmail,
      contactPhone: row.contactPhone,
      websiteUrl: row.websiteUrl,
      gstin: row.gstin,
      logoUrl: row.logoUrl,
      quotationTerms: row.quotationTerms,
      bankDetails: row.bankDetails,
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  // Auto-initialize default settings row
  const { updatedAt: _, ...fields } = DEFAULT_PROFILE;
  await db.insert(companySettings).values({
    id: 'default',
    ...fields,
  });

  return DEFAULT_PROFILE;
}

export async function updateCompanyProfile(
  db: DbExecutor,
  data: UpdateCompanyProfile,
): Promise<CompanyProfile> {
  // Ensure default row exists
  await getCompanyProfile(db);

  await db
    .update(companySettings)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(companySettings.id, 'default'));

  return getCompanyProfile(db);
}
