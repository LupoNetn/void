import { ProviderCredentialsService } from './provider-credentials.service.js';

describe('ProviderCredentialsService', () => {
  let service: ProviderCredentialsService;

  beforeEach(() => {
    service = new ProviderCredentialsService({} as never);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
