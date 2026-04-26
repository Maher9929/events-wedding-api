import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { ForbiddenException } from '@nestjs/common';

const mockReq = { user: { id: 'u1', role: 'client', provider_id: null } } as any;

describe('ReviewsController', () => {
  let controller: ReviewsController;
  let service: Partial<Record<keyof ReviewsService, jest.Mock>>;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findByService: jest.fn(),
      findByProvider: jest.fn(),
      getAverageRating: jest.fn(),
      reportReview: jest.fn(),
      remove: jest.fn(),
    };
    controller = new ReviewsController(service as any);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a review with user id', async () => {
      const dto = { service_id: 'svc1', rating: 5, comment: 'Great' };
      const review = { id: 'r1', ...dto, client_id: 'u1' };
      service.create!.mockResolvedValue(review);

      const result = await controller.create(dto as any, mockReq);
      expect(result.id).toBe('r1');
      expect(service.create).toHaveBeenCalledWith('u1', dto);
    });
  });

  describe('findAll', () => {
    it('should return reviews with parsed params', async () => {
      const data = { data: [{ id: 'r1' }], total: 1 };
      service.findAll!.mockResolvedValue(data);

      const result = await controller.findAll('5', '10', '0', 'good', 'rating', 'desc');
      expect(service.findAll).toHaveBeenCalledWith(5, 10, 0, 'good', 'rating', 'desc');
      expect(result).toEqual(data);
    });

    it('should handle undefined params', async () => {
      service.findAll!.mockResolvedValue({ data: [], total: 0 });

      await controller.findAll();
      expect(service.findAll).toHaveBeenCalledWith(
        undefined, undefined, undefined, undefined, undefined, undefined,
      );
    });
  });

  describe('findByService', () => {
    it('should return reviews for a service', async () => {
      const reviews = [{ id: 'r1', rating: 5 }];
      service.findByService!.mockResolvedValue(reviews);

      const result = await controller.findByService('svc1');
      expect(result).toEqual(reviews);
    });
  });

  describe('findByProvider', () => {
    it('should return reviews for a provider', async () => {
      service.findByProvider!.mockResolvedValue({ data: [], total: 0 });

      await controller.findByProvider('prov1');
      expect(service.findByProvider).toHaveBeenCalledWith(
        'prov1', undefined, undefined, undefined, undefined, undefined,
      );
    });
  });

  describe('getAverageRating', () => {
    it('should return average rating for a service', async () => {
      const avg = { average: 4.5, count: 10 };
      service.getAverageRating!.mockResolvedValue(avg);

      const result = await controller.getAverageRating('svc1');
      expect(result).toEqual(avg);
    });
  });

  describe('reportReview', () => {
    it('should report a review', async () => {
      service.reportReview!.mockResolvedValue({ success: true });

      const result = await controller.reportReview('r1', 'spam', mockReq);
      expect(result).toEqual({ success: true });
      expect(service.reportReview).toHaveBeenCalledWith('r1', 'u1', 'spam');
    });
  });

  describe('remove', () => {
    it('should delete a review', async () => {
      service.remove!.mockResolvedValue(undefined);
      await controller.remove('r1', mockReq);
      expect(service.remove).toHaveBeenCalledWith('r1', 'u1');
    });

    it('should propagate ForbiddenException', async () => {
      service.remove!.mockRejectedValue(new ForbiddenException());
      await expect(controller.remove('r1', mockReq)).rejects.toThrow(ForbiddenException);
    });
  });
});
