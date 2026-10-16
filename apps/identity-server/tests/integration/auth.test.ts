import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../../src/app.js';
import { prisma } from '../../src/config/database.js';

describe('Authentication & Session Integration Tests', () => {
  const testEmail = `testuser_${Date.now()}@example.com`;
  const testPassword = 'StrongPassword123!';
  let rawVerificationToken: string;
  let sessionCookie: string;

  afterAll(async () => {
    // Cleanup created test records
    await prisma.user.deleteMany({
      where: { email: { contains: 'testuser_' } },
    });
    await prisma.$disconnect();
  });

  describe('1. User Registration Flow', () => {
    it('should reject registration with invalid email', async () => {
      const res = await request(app).post('/auth/register').send({
        firstName: 'John',
        lastName: 'Doe',
        email: 'invalid-email',
        password: testPassword,
        confirmPassword: testPassword,
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject registration with weak password', async () => {
      const res = await request(app).post('/auth/register').send({
        firstName: 'John',
        lastName: 'Doe',
        email: testEmail,
        password: 'weak',
        confirmPassword: 'weak',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should successfully register a new user and generate a verification token', async () => {
      const res = await request(app).post('/auth/register').send({
        firstName: 'John',
        lastName: 'Doe',
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword,
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe(testEmail);
      expect(res.body.data.user.emailVerified).toBe(false);

      // Verify token was stored in DB
      const tokenRecord = await prisma.emailVerificationToken.findFirst({
        where: { userId: res.body.data.user.id },
      });
      expect(tokenRecord).toBeDefined();
    });

    it('should reject duplicate registration with the same email', async () => {
      const res = await request(app).post('/auth/register').send({
        firstName: 'Duplicate',
        lastName: 'User',
        email: testEmail,
        password: testPassword,
        confirmPassword: testPassword,
      });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('USER_ALREADY_EXISTS');
    });
  });

  describe('2. Email Verification Flow', () => {
    it('should reject verification with invalid token', async () => {
      const res = await request(app).post('/auth/verify-email').send({
        token: 'completely-invalid-token-12345',
      });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should successfully verify email when given a valid token hash in DB', async () => {
      // Find the user and create a known token
      const user = await prisma.user.findUnique({ where: { email: testEmail } });
      expect(user).toBeDefined();

      const { VerificationService } = await import('../../src/services/verification.service.js');
      const tokenResult = await VerificationService.createVerificationToken(user!.id);
      rawVerificationToken = tokenResult.rawToken;

      const res = await request(app).post('/auth/verify-email').send({
        token: rawVerificationToken,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const verifiedUser = await prisma.user.findUnique({ where: { id: user!.id } });
      expect(verifiedUser?.emailVerified).toBe(true);
      expect(verifiedUser?.emailVerifiedAt).not.toBeNull();
    });

    it('should handle repeated verification gracefully', async () => {
      const res = await request(app).post('/auth/verify-email').send({
        token: rawVerificationToken,
      });

      // Token already marked used, but user already verified
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('3. Login & Session Flow', () => {
    it('should reject login with wrong password', async () => {
      const res = await request(app).post('/auth/login').send({
        email: testEmail,
        password: 'WrongPassword123!',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('should successfully login and set HttpOnly identityhub_session cookie', async () => {
      const res = await request(app).post('/auth/login').send({
        email: testEmail,
        password: testPassword,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testEmail);

      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      const sessionCookieHeader = cookies.find((c: string) => c.startsWith('identityhub_sso_session=') || c.startsWith('identityhub_session='));
      expect(sessionCookieHeader).toBeDefined();
      expect(sessionCookieHeader).toContain('HttpOnly');

      sessionCookie = sessionCookieHeader.split(';')[0];
    });

    it('should access /auth/me with valid session cookie', async () => {
      const res = await request(app)
        .get('/auth/me')
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testEmail);
    });

    it('should reject /auth/me without session cookie', async () => {
      const res = await request(app).get('/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('4. User Profile & Password Change Flow', () => {
    it('should update user profile (firstName, lastName)', async () => {
      const res = await request(app)
        .patch('/users/me')
        .set('Cookie', sessionCookie)
        .set('X-IdentityHub-Client', 'true')
        .send({
          firstName: 'Jonathan',
          lastName: 'Updated',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.firstName).toBe('Jonathan');
      expect(res.body.data.user.lastName).toBe('Updated');
    });

    it('should fetch user security activity', async () => {
      const res = await request(app)
        .get('/users/me/activity')
        .set('Cookie', sessionCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.activity)).toBe(true);
      expect(res.body.data.activity.length).toBeGreaterThan(0);
    });

    it('should change user password successfully', async () => {
      const newPassword = 'NewStrongPassword123!';
      const res = await request(app)
        .patch('/users/me/password')
        .set('Cookie', sessionCookie)
        .set('X-IdentityHub-Client', 'true')
        .send({
          currentPassword: testPassword,
          newPassword,
          confirmPassword: newPassword,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify login with new password works
      const loginRes = await request(app).post('/auth/login').send({
        email: testEmail,
        password: newPassword,
      });
      expect(loginRes.status).toBe(200);
    });
  });

  describe('5. Logout & Session Invalidation', () => {
    it('should logout and clear session cookie', async () => {
      const res = await request(app)
        .post('/auth/logout')
        .set('Cookie', sessionCookie)
        .set('X-IdentityHub-Client', 'true');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Attempting to access /auth/me with the revoked session should now fail
      const checkRes = await request(app)
        .get('/auth/me')
        .set('Cookie', sessionCookie);

      expect(checkRes.status).toBe(401);
    });
  });

  describe('6. OTP Login Flow', () => {
    it('should send login OTP for registered user', async () => {
      const res = await request(app).post('/auth/otp/send').send({
        email: testEmail,
      });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBeDefined();

      // Check OTP in DB
      const otpRecord = await prisma.loginOtp.findFirst({
        where: { email: testEmail },
        orderBy: { createdAt: 'desc' },
      });
      expect(otpRecord).toBeDefined();
      expect(otpRecord?.usedAt).toBeNull();
    });

    it('should reject invalid OTP code during verification', async () => {
      const res = await request(app).post('/auth/otp/verify').send({
        email: testEmail,
        code: '000000',
      });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_OTP');
    });
  });
});

