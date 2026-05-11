import { UsersService } from './users.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

function createSupabaseMock() {
  const chain: any = {};
  chain.from = jest.fn(() => chain);
  chain.select = jest.fn(() => chain);
  chain.eq = jest.fn(() => chain);
  chain.neq = jest.fn(() => chain);
  chain.order = jest.fn(() => chain);
  chain.range = jest.fn(() => chain);
  chain.insert = jest.fn(() => chain);
  chain.update = jest.fn(() => chain);
  chain.delete = jest.fn(() => chain);
  chain.single = jest.fn();
  chain.auth = { signUp: jest.fn(), signInWithPassword: jest.fn() };
  return chain;
}

const mockJwtService = {
  sign: jest.fn().mockReturnValue('test-jwt-token'),
  verify: jest.fn(),
};

const mockAuditLogService = { log: jest.fn() };
const mockAuthCache = {
  getCachedUser: jest.fn().mockResolvedValue(null),
  cacheUser: jest.fn().mockResolvedValue(undefined),
  blacklistToken: jest.fn().mockResolvedValue(undefined),
  isTokenBlacklisted: jest.fn().mockResolvedValue(false),
  invalidateUser: jest.fn().mockResolvedValue(undefined),
};
const mockConfigService = {
  get: jest.fn((key: string) => {
    const values: Record<string, string> = {
      NODE_ENV: 'test',
      SUPABASE_URL: 'http://localhost:54321',
      SUPABASE_ANON_KEY: 'test-anon-key',
    };
    return values[key];
  }),
};

describe('UsersService', () => {
  let service: UsersService;
  let supabase: any;

  beforeEach(() => {
    supabase = createSupabaseMock();
    service = new UsersService(
      supabase,
      mockJwtService as any,
      mockAuditLogService as any,
      mockAuthCache as any,
      mockConfigService as any,
    );
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    it('should throw ConflictException if email already exists', async () => {
      supabase.single.mockResolvedValueOnce({
        data: { email: 'e@t.com' },
        error: null,
      });

      await expect(
        service.register({
          email: 'e@t.com',
          password: 'P@ss1234',
          full_name: 'T',
          role: 'client' as any,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne', () => {
    it('should return a user when found', async () => {
      const user = {
        id: '1',
        email: 't@t.com',
        full_name: 'Test',
        city: 'Tunis',
        role: 'client',
      };
      supabase.single.mockResolvedValueOnce({ data: user, error: null });

      const result = await service.findOne('1');
      expect(result).toEqual(user);
    });

    it('should throw NotFoundException when user not found', async () => {
      supabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'not found' },
      });

      await expect(service.findOne('x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findPublicProfile', () => {
    it('should only select public profile fields', async () => {
      const user = {
        id: '1',
        full_name: 'Test',
        avatar_url: null,
        bio: 'Bio',
        role: 'client',
      };
      supabase.single.mockResolvedValueOnce({ data: user, error: null });

      const result = await service.findPublicProfile('1');

      expect(supabase.select).toHaveBeenCalledWith(
        'id, full_name, avatar_url, role, city',
      );
      expect(result).toEqual(user);
    });
  });

  describe('updateRole', () => {
    it('should update role, invalidate auth cache and write audit log', async () => {
      const user = {
        id: '1',
        email: 't@t.com',
        full_name: 'Test',
        role: 'provider',
      };
      supabase.single.mockResolvedValueOnce({ data: user, error: null });

      const result = await service.updateRole('1', 'provider' as any, 'admin1');

      expect(supabase.update).toHaveBeenCalledWith({ role: 'provider' });
      expect(mockAuthCache.invalidateUser).toHaveBeenCalledWith('1');
      expect(mockAuditLogService.log).toHaveBeenCalledWith(
        'admin1',
        'user_role_update',
        'users',
        '1',
        { role: 'provider' },
      );
      expect(result).toEqual(user);
    });
  });
});
