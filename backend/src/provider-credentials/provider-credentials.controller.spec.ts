import { ProviderCredentialsController } from './provider-credentials.controller.js';

describe('ProviderCredentialsController', () => {
  let controller: ProviderCredentialsController;

  beforeEach(() => {
    controller = new ProviderCredentialsController({} as never);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
