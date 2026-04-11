import { ServicesService } from './services.service';
import { NotFoundException } from '@nestjs/common';

function createSupabaseMock() {
  const chain: any = {};
  chain.from = jest.fn(() => chain);
  chain.select = jest.fn(() => chain);
  chain.eq = jest.fn(() => chain);
  chain.neq = jest.fn(() => chain);
  chain.order = jest.fn(() => chain);
  chain.range = jest.fn(() => chain);
  chain.gte = jest.fn(() => chain);
  chain.lte = jest.fn(() => chain);
  chain.ilike = jest.fn(() => chain);
  chain.in = jest.fn(() => chain);
  chain.is = jest.fn(() => chain);
  chain.or = jest.fn(() => chain);
  chain.limit = jest.fn(() => chain);
  chain.insert = jest.fn(() => chain);
  chain.update = jest.fn(() => chain);
  chain.delete = jest.fn(() => chain);
  chain.single = jest.fn();
  return chain;
}

describe('ServicesService', () => {
  let service: ServicesService;
  let supabase: any;

  beforeEach(() => {
    supabase = createSupabaseMock();
    service = new ServicesService(supabase);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOne', () => {
    it('should return a service when found', async () => {
      const svc = {
        id: '1',
        title: 'Photographie Premium',
        base_price: 5000,
        is_active: true,
      };
      supabase.single.mockResolvedValueOnce({ data: svc, error: null });

      const result = await service.findOne('1');
      expect(result).toEqual(svc);
      expect(result.title).toBe('Photographie Premium');
    });

    it('should throw NotFoundException when service not found', async () => {
      supabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Row not found' },
      });

      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a service when provider is valid', async () => {
      // 1st single() → provider lookup
      supabase.single
        .mockResolvedValueOnce({
          data: { id: 'p1', user_id: 'u1' },
          error: null,
        })
        // 2nd single() → inserted service
        .mockResolvedValueOnce({
          data: {
            id: 's1',
            title: 'DJ Service',
            base_price: 3000,
            provider_id: 'p1',
          },
          error: null,
        });

      const dto = {
        title: 'DJ Service',
        base_price: 3000,
        price_type: 'fixed',
      };
      const result = await service.create('p1', dto as any);
      expect(result).toHaveProperty('id', 's1');
      expect(result.title).toBe('DJ Service');
    });
  });
});
