import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { NotificationsService } from './notifications.service.js';

describe('NotificationsService', () => {
  it('should be defined', () => {
    expect(new NotificationsService({} as never, {} as never)).toBeDefined();
  });

  it('accepts a batch and preserves input order when items finish out of order', async () => {
    const service = new NotificationsService({} as never, {} as never);
    vi.spyOn(service, 'send').mockImplementation(async (_organizationId, dto) => {
      if (dto.externalId === 'first') await new Promise(resolve => setTimeout(resolve, 10));
      return { message: 'accepted', data: { id: dto.externalId } } as never;
    });
    const result = await service.sendBatch('org-id', [
      { channel: 'IN_APP', recipient: { externalUserId: 'one' }, content: 'First', externalId: 'first' },
      { channel: 'IN_APP', recipient: { externalUserId: 'two' }, content: 'Second', externalId: 'second' },
    ] as never);
    expect(result.data.accepted).toBe(2);
    expect(result.data.rejected).toBe(0);
    expect(result.data.results.map(item => item.index)).toEqual([0, 1]);
  });

  it('reports a rejected item without discarding accepted items', async () => {
    const service = new NotificationsService({} as never, {} as never);
    vi.spyOn(service, 'send')
      .mockResolvedValueOnce({ data: { id: 'ok' } } as never)
      .mockRejectedValueOnce(new BadRequestException('Invalid recipient'));
    const result = await service.sendBatch('org-id', [
      { channel: 'IN_APP', recipient: { externalUserId: 'one' }, content: 'First' },
      { channel: 'IN_APP', recipient: { externalUserId: 'two' }, content: 'Second' },
    ] as never);
    expect(result.data.accepted).toBe(1);
    expect(result.data.rejected).toBe(1);
    expect(result.data.results[1]).toMatchObject({ accepted: false, statusCode: 400 });
  });
});
