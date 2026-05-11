import { BadRequestException } from '@nestjs/common';
import { ProviderStatsController } from './provider-stats.controller';

const providerStatsService = {
  getProviderStats: jest.fn(),
  getPerformanceMetrics: jest.fn(),
};

describe('ProviderStatsController', () => {
  let controller: ProviderStatsController;

  beforeEach(() => {
    controller = new ProviderStatsController(providerStatsService as any);
    jest.clearAllMocks();
  });

  it('uses the provider user id for provider analytics', async () => {
    providerStatsService.getProviderStats.mockResolvedValue({ ok: true });

    await controller.getStats({
      user: { id: 'provider-user-1', role: 'provider' },
      query: {},
    } as any);

    expect(providerStatsService.getProviderStats).toHaveBeenCalledWith(
      'provider-user-1',
      undefined,
    );
  });

  it('requires a target provider user id for admin analytics', async () => {
    await expect(
      controller.getStats({
        user: { id: 'admin-1', role: 'admin' },
        query: {},
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('uses the requested provider user id for admin analytics', async () => {
    providerStatsService.getPerformanceMetrics.mockResolvedValue({ ok: true });

    await controller.getPerformance({
      user: { id: 'admin-1', role: 'admin' },
      query: { providerUserId: 'provider-user-1' },
    } as any);

    expect(providerStatsService.getPerformanceMetrics).toHaveBeenCalledWith(
      'provider-user-1',
    );
  });
});
