import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

const mockReq = { user: { id: 'u1', role: 'client', provider_id: null } } as any;

describe('EventsController', () => {
  let controller: EventsController;
  let service: Partial<Record<keyof EventsService, jest.Mock>>;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findByClient: jest.fn(),
      findUpcoming: jest.fn(),
      findTemplates: jest.fn(),
      findByEventType: jest.fn(),
      update: jest.fn(),
      updateStatus: jest.fn(),
      remove: jest.fn(),
      getStats: jest.fn(),
    };
    controller = new EventsController(service as any);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an event with authenticated user id', async () => {
      const dto = { title: 'Wedding', event_type: 'wedding' };
      const event = { id: 'e1', ...dto, client_id: 'u1' };
      service.create!.mockResolvedValue(event);

      const result = await controller.create(dto as any, mockReq);
      expect(result.id).toBe('e1');
      expect(service.create).toHaveBeenCalledWith('u1', dto);
    });
  });

  describe('findAll', () => {
    it('should return paginated events', async () => {
      const data = { data: [{ id: 'e1' }], total: 1 };
      service.findAll!.mockResolvedValue(data);

      const result = await controller.findAll({} as any);
      expect(result).toEqual(data);
    });
  });

  describe('findUpcoming', () => {
    it('should return upcoming events with default limit', async () => {
      service.findUpcoming!.mockResolvedValue([]);
      await controller.findUpcoming();
      expect(service.findUpcoming).toHaveBeenCalledWith(10);
    });

    it('should parse custom limit', async () => {
      service.findUpcoming!.mockResolvedValue([]);
      await controller.findUpcoming('5');
      expect(service.findUpcoming).toHaveBeenCalledWith(5);
    });
  });

  describe('findTemplates', () => {
    it('should return template events', async () => {
      service.findTemplates!.mockResolvedValue([]);
      await controller.findTemplates();
      expect(service.findTemplates).toHaveBeenCalledWith(10);
    });
  });

  describe('findByEventType', () => {
    it('should return events by type', async () => {
      service.findByEventType!.mockResolvedValue([]);
      await controller.findByEventType('wedding');
      expect(service.findByEventType).toHaveBeenCalledWith('wedding', 10);
    });
  });

  describe('findMyEvents', () => {
    it('should return events for the authenticated user', async () => {
      const data = { data: [{ id: 'e1' }], total: 1 };
      service.findByClient!.mockResolvedValue(data);

      const result = await controller.findMyEvents(mockReq);
      expect(result).toEqual(data);
      expect(service.findByClient).toHaveBeenCalledWith(
        'u1', undefined, undefined, undefined, undefined, undefined,
      );
    });
  });

  describe('findOne', () => {
    it('should return a single event', async () => {
      const event = { id: 'e1', title: 'Wedding' };
      service.findOne!.mockResolvedValue(event);

      const result = await controller.findOne('e1');
      expect(result).toEqual(event);
    });

    it('should propagate NotFoundException', async () => {
      service.findOne!.mockRejectedValue(new NotFoundException());
      await expect(controller.findOne('bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete an event', async () => {
      service.remove!.mockResolvedValue(undefined);
      await expect(controller.remove('e1', mockReq)).resolves.not.toThrow();
      expect(service.remove).toHaveBeenCalledWith('e1', 'u1');
    });

    it('should propagate ForbiddenException', async () => {
      service.remove!.mockRejectedValue(new ForbiddenException());
      await expect(controller.remove('e1', mockReq)).rejects.toThrow(ForbiddenException);
    });
  });
});
