import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserRole } from './dto/create-user.dto';

const mockUsersService = {
  register: jest.fn(),
  login: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  findByEmail: jest.fn(),
  updateProfile: jest.fn(),
  remove: jest.fn(),
  updateRole: jest.fn(),
  refreshToken: jest.fn(),
};

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call usersService.register', async () => {
      const dto = {
        email: 't@t.com',
        password: 'P@ss1234',
        full_name: 'Test',
        role: UserRole.CLIENT,
      };
      const expected = {
        access_token: 'jwt',
        user: { id: '1', email: 't@t.com' },
      };
      mockUsersService.register.mockResolvedValue(expected);

      const result = await controller.register(dto);
      expect(mockUsersService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('login', () => {
    it('should call usersService.login', async () => {
      const dto = { email: 't@t.com', password: 'P@ss1234' };
      const expected = { access_token: 'jwt', user: { id: '1' } };
      mockUsersService.login.mockResolvedValue(expected);

      const result = await controller.login(dto);
      expect(mockUsersService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });
});
