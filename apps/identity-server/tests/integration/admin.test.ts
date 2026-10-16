import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { prisma } from '../../src/config/database.js';
import { PasswordService } from '../../src/services/password.service.js';

describe('Admin Management Integration Tests', () => {
  const adminEmail = `admin_test_${Date.now()}@example.com`;
  const normalEmail = `normal_test_${Date.now()}@example.com`;
  const password = 'AdminPassword123!';

  let adminCookie: string;
  let normalCookie: string;
  let normalUserId: string;

  beforeAll(async () => {
    const passwordHash = await PasswordService.hashPassword(password);

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        firstName: 'Super',
        lastName: 'Admin',
        role: 'ADMIN',
        status: 'ACTIVE',
        emailVerified: true,
      },
    });

    // Create normal user
    const normal = await prisma.user.create({
      data: {
        email: normalEmail,
        passwordHash,
        firstName: 'Regular',
        lastName: 'User',
        role: 'USER',
        status: 'ACTIVE',
        emailVerified: true,
      },
    });
    normalUserId = normal.id;

    // Login as admin
    const adminLogin = await request(app).post('/auth/login').send({
      email: adminEmail,
      password,
    });
    adminCookie = adminLogin.headers['set-cookie']
      .find((c: string) => c.startsWith('identityhub_sso_session=') || c.startsWith('identityhub_session='))
      .split(';')[0];

    // Login as normal user
    const normalLogin = await request(app).post('/auth/login').send({
      email: normalEmail,
      password,
    });
    normalCookie = normalLogin.headers['set-cookie']
      .find((c: string) => c.startsWith('identityhub_sso_session=') || c.startsWith('identityhub_session='))
      .split(';')[0];
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: { in: [adminEmail, normalEmail] },
      },
    });
    await prisma.$disconnect();
  });

  it('should deny non-admin users access to /admin/users', async () => {
    const res = await request(app)
      .get('/admin/users')
      .set('Cookie', normalCookie);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN_INSUFFICIENT_PERMISSIONS');
  });

  it('should allow admin users access to /admin/users and list users', async () => {
    const res = await request(app)
      .get('/admin/users')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.users)).toBe(true);
    expect(res.body.data.total).toBeGreaterThan(0);
  });

  it('should allow admin to retrieve user details with sessions and activity', async () => {
    const res = await request(app)
      .get(`/admin/users/${normalUserId}`)
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.id).toBe(normalUserId);
    expect(res.body.data.sessions).toBeDefined();
    expect(res.body.data.activity).toBeDefined();
  });

  it('should allow admin to suspend a user and invalidate sessions', async () => {
    const res = await request(app)
      .patch(`/admin/users/${normalUserId}/status`)
      .set('Cookie', adminCookie)
      .set('X-IdentityHub-Client', 'true')
      .send({ status: 'SUSPENDED' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.status).toBe('SUSPENDED');

    // Suspended user attempting to authenticate should now fail
    const loginRes = await request(app).post('/auth/login').send({
      email: normalEmail,
      password,
    });
    expect(loginRes.status).toBe(403);
    expect(loginRes.body.error.code).toBe('ACCOUNT_SUSPENDED');
  });

  it('should allow admin to reactivate a suspended user', async () => {
    const res = await request(app)
      .patch(`/admin/users/${normalUserId}/status`)
      .set('Cookie', adminCookie)
      .set('X-IdentityHub-Client', 'true')
      .send({ status: 'ACTIVE' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.status).toBe('ACTIVE');

    // Reactivated user can login again
    const loginRes = await request(app).post('/auth/login').send({
      email: normalEmail,
      password,
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.success).toBe(true);
  });

  it('should allow admin to fetch system audit logs', async () => {
    const res = await request(app)
      .get('/admin/audit-logs')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.logs)).toBe(true);
  });

  it('should allow admin to fetch overview stats', async () => {
    const res = await request(app)
      .get('/admin/stats')
      .set('Cookie', adminCookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.totalUsers).toBeGreaterThan(0);
    expect(res.body.data.activeUsers).toBeGreaterThan(0);
  });
});
