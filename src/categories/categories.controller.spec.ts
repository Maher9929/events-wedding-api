import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { NotFoundException, ConflictException } from '@nestjs/common';

describe('CategoriesController', () => {
  let controller: CategoriesController;
  let service: Partial<Record<keyof CategoriesService, jest.Mock>>;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      findBySlug: jest.fn(),
      findChildren: jest.fn(),
      findRootCategories: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    controller = new CategoriesController(service as any);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create a category', async () => {
      const dto = { name: 'Wedding', slug: 'wedding' };
      const result = { id: 'c1', ...dto };
      service.create!.mockResolvedValue(result);

      expect(await controller.create(dto as any)).toEqual(result);
      expect(service.create).toHaveBeenCalledWith(dto);
    });
  });

  describe('findAll', () => {
    it('should return paginated categories', async () => {
      const result = { data: [{ id: 'c1' }], total: 1 };
      service.findAll!.mockResolvedValue(result);

      expect(await controller.findAll({} as any)).toEqual(result);
    });
  });

  describe('findRootCategories', () => {
    it('should return root categories', async () => {
      const cats = [{ id: 'c1', parent_id: null }];
      service.findRootCategories!.mockResolvedValue(cats);

      expect(await controller.findRootCategories()).toEqual(cats);
    });
  });

  describe('findBySlug', () => {
    it('should return category by slug', async () => {
      const cat = { id: 'c1', slug: 'wedding' };
      service.findBySlug!.mockResolvedValue(cat);

      expect(await controller.findBySlug('wedding')).toEqual(cat);
    });

    it('should propagate NotFoundException', async () => {
      service.findBySlug!.mockRejectedValue(new NotFoundException());
      await expect(controller.findBySlug('unknown')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findOne', () => {
    it('should return category by id', async () => {
      const cat = { id: 'c1', name: 'Wedding' };
      service.findOne!.mockResolvedValue(cat);

      expect(await controller.findOne('c1')).toEqual(cat);
    });
  });

  describe('findChildren', () => {
    it('should return child categories', async () => {
      const children = [{ id: 'c2', parent_id: 'c1' }];
      service.findChildren!.mockResolvedValue(children);

      expect(await controller.findChildren('c1')).toEqual(children);
    });
  });

  describe('update', () => {
    it('should update a category', async () => {
      const updated = { id: 'c1', name: 'Updated' };
      service.update!.mockResolvedValue(updated);

      expect(await controller.update('c1', { name: 'Updated' } as any)).toEqual(updated);
      expect(service.update).toHaveBeenCalledWith('c1', { name: 'Updated' });
    });
  });

  describe('remove', () => {
    it('should delete a category', async () => {
      service.remove!.mockResolvedValue(undefined);
      await expect(controller.remove('c1')).resolves.not.toThrow();
    });

    it('should propagate ConflictException for categories with children', async () => {
      service.remove!.mockRejectedValue(new ConflictException());
      await expect(controller.remove('c1')).rejects.toThrow(ConflictException);
    });
  });
});
