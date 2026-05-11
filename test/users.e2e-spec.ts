import { INestApplication, ExecutionContext } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { UsersController } from '../src/users/users.controller';
import { UsersService } from '../src/users/users.service';

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  const usersService = {
    login: jest.fn(),
    findPrivateProfile: jest.fn(),
    findPublicProfile: jest.fn(),
    updateRole: jest.fn(),
  };

  const jwtGuard = {
    canActivate: (context: ExecutionContext) => {
      const req = context.switchToHttp().getRequest();
      req.user = {
        id: req.headers['x-test-user-id'] || 'client-1',
        role: req.headers['x-test-user-role'] || 'client',
        jti: 'test-jti',
      };
      return true;
    },
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: usersService },
        RolesGuard,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(jwtGuard)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('sets an HttpOnly auth cookie on login', async () => {
    usersService.login.mockResolvedValue({
      access_token: 'jwt-token',
      user: { id: 'client-1', role: 'client' },
    });

    const response = await request(app.getHttpServer())
      .post('/users/login')
      .send({ email: 'client@example.com', password: 'secret123' })
      .expect(200);

    const cookies = response.headers['set-cookie'] as unknown as string[];
    expect(cookies.join(';')).toContain('access_token=jwt-token');
    expect(cookies.join(';')).toContain('HttpOnly');
  });

  it('returns private profile data only for the current user', async () => {
    usersService.findPrivateProfile.mockResolvedValue({
      id: 'client-1',
      email: 'client@example.com',
      phone: '+212600000000',
      role: 'client',
    });

    const response = await request(app.getHttpServer())
      .get('/users/id/client-1')
      .set('x-test-user-id', 'client-1')
      .set('x-test-user-role', 'client')
      .expect(200);

    expect(response.body.email).toBe('client@example.com');
    expect(usersService.findPrivateProfile).toHaveBeenCalledWith('client-1');
    expect(usersService.findPublicProfile).not.toHaveBeenCalled();
  });

  it('returns public profile data for another user', async () => {
    usersService.findPublicProfile.mockResolvedValue({
      id: 'provider-1',
      full_name: 'Provider One',
      avatar_url: null,
      role: 'provider',
      city: 'Casablanca',
    });

    const response = await request(app.getHttpServer())
      .get('/users/id/provider-1')
      .set('x-test-user-id', 'client-1')
      .set('x-test-user-role', 'client')
      .expect(200);

    expect(response.body).not.toHaveProperty('email');
    expect(response.body).not.toHaveProperty('phone');
    expect(usersService.findPublicProfile).toHaveBeenCalledWith('provider-1');
  });

  it('blocks non-admin users from changing roles', async () => {
    await request(app.getHttpServer())
      .patch('/users/provider-1/role')
      .set('x-test-user-id', 'client-1')
      .set('x-test-user-role', 'client')
      .send({ role: 'admin' })
      .expect(403);

    expect(usersService.updateRole).not.toHaveBeenCalled();
  });

  it('allows admins to change roles through the production endpoint', async () => {
    usersService.updateRole.mockResolvedValue({
      id: 'provider-1',
      role: 'provider',
    });

    const response = await request(app.getHttpServer())
      .patch('/users/provider-1/role')
      .set('x-test-user-id', 'admin-1')
      .set('x-test-user-role', 'admin')
      .send({ role: 'provider' })
      .expect(200);

    expect(response.body.role).toBe('provider');
    expect(usersService.updateRole).toHaveBeenCalledWith(
      'provider-1',
      'provider',
      'admin-1',
    );
  });
});
