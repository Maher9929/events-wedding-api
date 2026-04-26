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

describe('UsersService', () => {
  let service: UsersService;
  let supabase: any;

  beforeEach(() => {
    supabase = createSupabaseMock();
    service = new UsersService(supabase, mockJwtService as any, mockAuditLogService as any, mockAuthCache as any);
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
});
