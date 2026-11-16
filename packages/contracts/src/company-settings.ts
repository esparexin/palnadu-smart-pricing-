import { z } from 'zod';

export const CompanyProfileSchema = z
  .object({
    companyName: z.string().trim().min(1).max(150),
    tradingName: z.string().trim().max(150).nullable().optional(),
    registeredAddress: z.string().trim().max(500).nullable().optional(),
    contactEmail: z.string().trim().email().nullable().optional(),
    contactPhone: z.string().trim().max(30).nullable().optional(),
    websiteUrl: z.string().trim().max(255).nullable().optional(),
    gstin: z.string().trim().max(30).nullable().optional(),
    logoUrl: z.string().trim().max(500).nullable().optional(),
    quotationTerms: z.string().trim().max(2000).nullable().optional(),
    bankDetails: z.string().trim().max(1000).nullable().optional(),
    updatedAt: z.string().datetime().optional(),
  })
  .strict();

export const UpdateCompanyProfileSchema = z
  .object({
    companyName: z.string().trim().min(1).max(150).optional(),
    tradingName: z.string().trim().max(150).nullable().optional(),
    registeredAddress: z.string().trim().max(500).nullable().optional(),
    contactEmail: z.string().trim().email().nullable().optional(),
    contactPhone: z.string().trim().max(30).nullable().optional(),
    websiteUrl: z.string().trim().max(255).nullable().optional(),
    gstin: z.string().trim().max(30).nullable().optional(),
    logoUrl: z.string().trim().max(500).nullable().optional(),
    quotationTerms: z.string().trim().max(2000).nullable().optional(),
    bankDetails: z.string().trim().max(1000).nullable().optional(),
  })
  .strict();

export type CompanyProfile = z.infer<typeof CompanyProfileSchema>;
export type UpdateCompanyProfile = z.infer<typeof UpdateCompanyProfileSchema>;
