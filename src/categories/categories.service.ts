import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { sanitizeSearch } from '../common/sanitize';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { QueryCategoryDto } from './dto/query-category.dto';
import { Category } from './entities/category.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @Inject('SUPABASE_CLIENT')
    private readonly supabase: SupabaseClient,
  ) {}

  async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
    // Check if slug already exists
    const { data: existing } = await this.supabase
      .from('categories')
      .select('id')
      .eq('slug', createCategoryDto.slug)
      .single();

    if (existing) {
      throw new ConflictException('Category with this slug already exists');
    }

    const { data, error } = await this.supabase
      .from('categories')
      .insert({
        ...createCategoryDto,
        sort_order: createCategoryDto.sort_order || 0,
        is_active: createCategoryDto.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }

  async findAll(
    query: QueryCategoryDto = {},
  ): Promise<{ data: Category[]; total: number }> {
    let queryBuilder = this.supabase
      .from('categories')
      .select('*', { count: 'exact' });

    // Apply filters
    if (query.search) {
      queryBuilder = queryBuilder.or(
        `name.ilike.%${sanitizeSearch(query.search)}%,description.ilike.%${sanitizeSearch(query.search)}%`,
      );
    }

    if (query.parent_id !== undefined) {
      queryBuilder = queryBuilder.eq('parent_id', query.parent_id);
    }

    if (query.is_active !== undefined) {
      queryBuilder = queryBuilder.eq('is_active', query.is_active);
    }

    // Apply pagination
    if (query.limit) {
      queryBuilder = queryBuilder.limit(query.limit);
    }

    if (query.offset) {
      queryBuilder = queryBuilder.range(
        query.offset,
        query.offset + (query.limit || 10) - 1,
      );
    }

    // Order by sort_order, then by name
    queryBuilder = queryBuilder
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    const { data, error, count } = await queryBuilder;

    if (error) {
      throw new BadRequestException(error.message);
    }

    return {
      data: data || [],
      total: count || 0,
    };
  }

  async findOne(id: string): Promise<Category> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      throw new NotFoundException('Category not found');
    }

    return data;
  }

  async findBySlug(slug: string): Promise<Category> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (error) {
      throw new NotFoundException('Category not found');
    }

    return data;
  }

  async findChildren(parentId: string): Promise<Category[]> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .eq('parent_id', parentId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data || [];
  }

  async findRootCategories(): Promise<Category[]> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .is('parent_id', null)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data || [];
  }

  async update(
    id: string,
    updateCategoryDto: UpdateCategoryDto,
  ): Promise<Category> {
    const { data, error } = await this.supabase
      .from('categories')
      .update(updateCategoryDto)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new NotFoundException('Category not found');
    }

    return data;
  }

  async remove(id: string): Promise<void> {
    // Check if category has children
    const { data: children } = await this.supabase
      .from('categories')
      .select('id')
      .eq('parent_id', id);

    if (children && children.length > 0) {
      throw new ConflictException('Cannot delete category with subcategories');
    }

    const { error } = await this.supabase
      .from('categories')
      .delete()
      .eq('id', id);

    if (error) {
      throw new NotFoundException('Category not found');
    }
  }
}
