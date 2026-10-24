const request = require('supertest');
const bcrypt = require('bcryptjs');

// Set test environment variables to use in-memory SQLite (RAM)
process.env.NODE_ENV = 'test';
process.env.TEST_DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test_secret_for_automated_testing_key_12345';
process.env.JWT_EXPIRES_IN = '2h';

const app = require('../src/app');
const { initDatabase, closeDatabase, getOne } = require('../src/config/database');

describe('Authentication Endpoints - /api/auth', () => {
  beforeAll(async () => {
    await initDatabase();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  const validUser = {
    name: 'Syed Aqdas',
    email: 'aqdas.test@example.com',
    password: 'Password123'
  };

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully with HTTP 201 and return safe user data', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('User registered successfully');
      expect(res.body.data).toBeDefined();
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.id).toBeDefined();
      expect(res.body.data.user.name).toBe(validUser.name);
      expect(res.body.data.user.email).toBe(validUser.email.toLowerCase());

      // Crucial security check: Never return password or password_hash
      expect(res.body.data.user.password).toBeUndefined();
      expect(res.body.data.user.password_hash).toBeUndefined();
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it('should verify in the database that the password was hashed with bcrypt', async () => {
      const userInDb = await getOne('SELECT * FROM users WHERE email = ?', [validUser.email.toLowerCase()]);
      expect(userInDb).toBeDefined();
      expect(userInDb.password_hash).not.toBe(validUser.password);
      // Bcrypt hash verification
      expect(userInDb.password_hash).toMatch(/^\$2[aby]\$\d{2}\$/);
      const isMatch = await bcrypt.compare(validUser.password, userInDb.password_hash);
      expect(isMatch).toBe(true);
    });

    it('should reject registration with duplicate email address with HTTP 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(validUser);

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('already exists');
    });

    it('should reject duplicate email even with different casing (case-insensitivity test)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Syed Case Check',
          email: 'AQDAS.TEST@example.com',
          password: 'Password123'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
    });

    it('should return HTTP 400 when name is missing or empty', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: '',
          email: 'noname@example.com',
          password: 'Password123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'name' })
        ])
      );
    });

    it('should return HTTP 400 when email format is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Invalid Email User',
          email: 'not-an-email',
          password: 'Password123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'email' })
        ])
      );
    });

    it('should return HTTP 400 when password violates length or digit policy', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Weak Password User',
          email: 'weakpass@example.com',
          password: 'short' // less than 6 chars and no digit
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors.some(e => e.field === 'password')).toBe(true);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should successfully log in an existing user with HTTP 200 and return a valid JWT token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUser.email,
          password: validUser.password
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(typeof res.body.data.token).toBe('string');
      expect(res.body.data.user.email).toBe(validUser.email.toLowerCase());
    });

    it('should return HTTP 401 when password is incorrect', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: validUser.email,
          password: 'WrongPassword999'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('should return HTTP 401 when email does not exist in the database', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'doesnotexist@example.com',
          password: 'Password123'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid email or password');
    });

    it('should return HTTP 400 when login payload is missing required fields', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: ''
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
