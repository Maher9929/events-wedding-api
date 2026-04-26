import { CategoriesService } from './categories.service';
import {
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

function createSupabaseMock() {
  let terminalResult: any = { data: null, error: null, count: 0 };
  const chain: any = {};
  chain.from = jest.fn(() => chain);
  chain.select = jest.fn(() => chain);
  chain.eq = jest.fn(() => chain);
  chain.is = jest.fn(() => chain);
  chain.or = jest.fn(() => chain);
  chain.insert = jest.fn(() => chain);
  chain.update = jest.fn(() => chain);
  chain.delete = jest.fn(() => chain);
  chain.order = jest.fn(() => chain);
  chain.limit = jest.fn(() => chain);
  chain.range = jest.fn(() => chain);
  chain.single = jest.fn();
  // Make the chain awaitable so double .order() works as terminal
  chain.then = jest.fn((resolve: any) => resolve(terminalResult));
  chain._setResult = (result: any) => { terminalResult = result; };
  return chain;
}

describe('CategoriesService', () => {
  let service: CategoriesService;
  let supabase: any;

  beforeEach(() => {
    supabase = createSupabaseMock();
    service = new CategoriesService(supabase);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── create ──────────────────────────────────────────────────────────────

  describe('create', () => {
    it('should throw ConflictException when slug already exists', async () => {
      supabase.single.mockResolvedValueOnce({
        data: { id: 'existing' },
        error: null,
      });

      await expect(
        service.create({ name: 'Wedding', slug: 'wedding' } as any),
      ).rejects.toThrow(ConflictException);
    });

    it('should create category successfully', async () => {
      const category = { id: 'c1', name: 'Wedding', slug: 'wedding', is_active: true };

      // slug check — not found
      supabase.single
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
        // insert
        .mockResolvedValueOnce({ data: category, error: null });

      const result = await service.create({
        name: 'Wedding',
        slug: 'wedding',
      } as any);

      expect(result.id).toBe('c1');
      expect(result.slug).toBe('wedding');
    });

    it('should throw BadRequestException on insert error', async () => {
      // slug check — not found
      supabase.single
        .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
        // insert error
        .mockResolvedValueOnce({ data: null, error: { message: 'insert failed' } });

      await expect(
        service.create({ name: 'Test', slug: 'test' } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ─── findOne ─────────────────────────────────────────────────────────────

  describe('findOne', () => {
    it('should return category when found', async () => {
      const cat = { id: 'c1', name: 'Wedding', slug: 'wedding' };
      supabase.single.mockResolvedValueOnce({ data: cat, error: null });

      const result = await service.findOne('c1');
      expect(result).toEqual(cat);
    });

    it('should throw NotFoundException when not found', async () => {
      supabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'not found' },
      });

      await expect(service.findOne('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── findBySlug ──────────────────────────────────────────────────────────

  describe('findBySlug', () => {
    it('should return category by slug', async () => {
      const cat = { id: 'c1', name: 'Wedding', slug: 'wedding' };
      supabase.single.mockResolvedValueOnce({ data: cat, error: null });

      const result = await service.findBySlug('wedding');
      expect(result.slug).toBe('wedding');
    });

    it('should throw NotFoundException for unknown slug', async () => {
      supabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'not found' },
      });

      await expect(service.findBySlug('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── findRootCategories ──────────────────────────────────────────────────

  describe('findRootCategories', () => {
    it('should return root categories', async () => {
      const cats = [
        { id: 'c1', name: 'Wedding', parent_id: null },
        { id: 'c2', name: 'Corporate', parent_id: null },
      ];
      supabase._setResult({ data: cats, error: null });

      const result = await service.findRootCategories();
      expect(result).toHaveLength(2);
    });

    it('should return empty array when none exist', async () => {
      supabase._setResult({ data: null, error: null });

      const result = await service.findRootCategories();
      expect(result).toEqual([]);
    });

    it('should throw on DB error', async () => {
      supabase._setResult({
        data: null,
        error: { message: 'db error' },
      });

      await expect(service.findRootCategories()).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  // ─── findChildren ────────────────────────────────────────────────────────

  describe('findChildren', () => {
    it('should return child categories', async () => {
      const children = [{ id: 'c3', name: 'DJ', parent_id: 'c1' }];
      supabase._setResult({ data: children, error: null });

      const result = await service.findChildren('c1');
      expect(result).toHaveLength(1);
    });
  });

  // ─── update ──────────────────────────────────────────────────────────────

  describe('update', () => {
    it('should update category', async () => {
      const updated = { id: 'c1', name: 'Updated', slug: 'updated' };
      supabase.single.mockResolvedValueOnce({ data: updated, error: null });

      const result = await service.update('c1', { name: 'Updated' } as any);
      expect(result.name).toBe('Updated');
    });

    it('should throw NotFoundException on update failure', async () => {
      supabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'not found' },
      });

      await expect(
        service.update('nonexistent', { name: 'Test' } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── remove ──────────────────────────────────────────────────────────────

  describe('remove', () => {
    it('should throw ConflictException when category has children', async () => {
      supabase.eq.mockResolvedValueOnce({
        data: [{ id: 'child1' }],
        error: null,
      });

      await expect(service.remove('c1')).rejects.toThrow(ConflictException);
    });

    it('should delete category successfully', async () => {
      // children check — none
      supabase.eq
        .mockResolvedValueOnce({ data: [], error: null })
        // delete
        .mockResolvedValueOnce({ data: null, error: null });

      await expect(service.remove('c1')).resolves.not.toThrow();
    });

    it('should throw NotFoundException when delete fails', async () => {
      supabase.eq
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'not found' } });

      await expect(service.remove('c1')).rejects.toThrow(NotFoundException);
    });
  });
});
