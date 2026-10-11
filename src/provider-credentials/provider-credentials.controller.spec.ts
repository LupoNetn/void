import { Test, TestingModule } from '@nestjs/testing';
import { ProviderCredentialsController } from './provider-credentials.controller.js';

describe('ProviderCredentialsController', () => {
  let controller: ProviderCredentialsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProviderCredentialsController],
    }).compile();

    controller = module.get<ProviderCredentialsController>(ProviderCredentialsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
