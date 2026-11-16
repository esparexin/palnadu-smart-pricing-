import type { CompanyProfile, UpdateCompanyProfile } from '@palnadu/contracts';
import type { RequestExecutor } from './catalogue-client.js';

export class SettingsClient {
  constructor(private readonly executor: RequestExecutor) {}

  public getCompanyProfile(): Promise<CompanyProfile> {
    return this.executor.request<CompanyProfile>('/api/v1/admin/settings/company');
  }

  public updateCompanyProfile(data: UpdateCompanyProfile): Promise<CompanyProfile> {
    return this.executor.request<CompanyProfile>('/api/v1/admin/settings/company', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}
