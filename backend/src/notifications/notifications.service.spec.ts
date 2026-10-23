import { NotificationsService } from './notifications.service.js';

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(() => {
    service = new NotificationsService({} as never, {} as never);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
