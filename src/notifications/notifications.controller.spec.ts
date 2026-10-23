import { NotificationsController } from './notifications.controller.js';

describe('NotificationsController', () => {
  let controller: NotificationsController;

  beforeEach(() => {
    controller = new NotificationsController({} as never);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
