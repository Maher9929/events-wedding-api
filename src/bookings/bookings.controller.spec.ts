import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';

const mockUser = {
  id: 'u1',
  role: 'client',
  provider_id: null,
};

const mockReq = { user: mockUser } as any;

describe('BookingsController', () => {
  let controller: BookingsController;
  let service: Partial<Record<keyof BookingsService, jest.Mock>>;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findByClient: jest.fn(),
      findByProvider: jest.fn(),
      findOne: jest.fn(),
      updateStatus: jest.fn(),
      getStats: jest.fn(),
      getAdminStats: jest.fn(),
      getUnavailableDates: jest.fn(),
    };
    controller = new BookingsController(service as any);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a booking with authenticated user id', async () => {
      const dto = { service_id: 'svc1', event_date: '2026-06-01' };
      const booking = { id: 'b1', ...dto, client_id: 'u1' };
      service.create!.mockResolvedValue(booking);

      const result = await controller.create(dto as any, mockReq);
      expect(result.id).toBe('b1');
      expect(service.create).toHaveBeenCalledWith('u1', dto);
    });
  });

  describe('findAll', () => {
    it('should return all bookings for admin', async () => {
      const data = { data: [{ id: 'b1' }], total: 1 };
      service.findAll!.mockResolvedValue(data);

      const result = await controller.findAll('confirmed');
      expect(result).toEqual(data);
      expect(service.findAll).toHaveBeenCalledWith(
        'confirmed', undefined, undefined, undefined, undefined, undefined, undefined,
      );
    });

    it('should parse numeric limit and offset', async () => {
      service.findAll!.mockResolvedValue({ data: [], total: 0 });

      await controller.findAll(undefined, undefined, '10', '0');
      expect(service.findAll).toHaveBeenCalledWith(
        undefined, undefined, 10, 0, undefined, undefined, undefined,
      );
    });
  });

  describe('findMyBookings', () => {
    it('should return bookings for the authenticated user', async () => {
      const data = { data: [{ id: 'b1' }], total: 1 };
      service.findByClient!.mockResolvedValue(data);

      const result = await controller.findMyBookings(mockReq);
      expect(result).toEqual(data);
      expect(service.findByClient).toHaveBeenCalledWith(
        'u1', undefined, undefined, undefined, undefined, undefined,
      );
    });
  });

  describe('findByProvider', () => {
    it('should resolve "me" to the user provider_id', async () => {
      const providerReq = {
        user: { id: 'u2', role: 'provider', provider_id: 'prov-1' },
      } as any;
      service.findByProvider!.mockResolvedValue({ data: [], total: 0 });

      await controller.findByProvider('me', providerReq);
      expect(service.findByProvider).toHaveBeenCalledWith(
        'prov-1', 'u2', undefined, undefined, undefined, undefined, undefined, undefined,
      );
    });

    it('should use explicit provider id', async () => {
      service.findByProvider!.mockResolvedValue({ data: [], total: 0 });

      await controller.findByProvider('prov-5', mockReq);
      expect(service.findByProvider).toHaveBeenCalledWith(
        'prov-5', 'u1', undefined, undefined, undefined, undefined, undefined, undefined,
      );
    });
  });

  describe('getAdminStats', () => {
    it('should return admin stats', async () => {
      const stats = { total: 100, pending: 10 };
      service.getAdminStats!.mockResolvedValue(stats);

      expect(await controller.getAdminStats()).toEqual(stats);
    });
  });
});
