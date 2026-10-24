const request = require('supertest');
const jwt = require('jsonwebtoken');

// Use in-memory SQLite database (RAM) to isolate test data and prevent disk space issues
process.env.NODE_ENV = 'test';
process.env.TEST_DB_PATH = ':memory:';
process.env.JWT_SECRET = 'test_secret_for_automated_testing_key_12345';
process.env.JWT_EXPIRES_IN = '2h';

const app = require('../src/app');
const { initDatabase, closeDatabase } = require('../src/config/database');

describe('Task CRUD and Ownership Endpoints - /api/tasks', () => {
  let userAToken = '';
  let userBToken = '';
  let userAId = null;
  let userBId = null;
  let userATaskId = null;

  beforeAll(async () => {
    await initDatabase();

    // Register and login User A
    const regResA = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'User A',
        email: 'userA@example.com',
        password: 'Password123'
      });
    userAId = regResA.body.data.user.id;

    const loginResA = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'userA@example.com',
        password: 'Password123'
      });
    userAToken = loginResA.body.data.token;

    // Register and login User B
    const regResB = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'User B',
        email: 'userB@example.com',
        password: 'Password123'
      });
    userBId = regResB.body.data.user.id;

    const loginResB = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'userB@example.com',
        password: 'Password123'
      });
    userBToken = loginResB.body.data.token;
  });

  afterAll(async () => {
    await closeDatabase();
  });

  describe('Authentication and Authorization Safeguards', () => {
    it('should return HTTP 401 when accessing GET /api/tasks without a token', async () => {
      const res = await request(app).get('/api/tasks');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Access denied');
    });

    it('should return HTTP 401 when Bearer token header is malformed', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', 'Basic 123456');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return HTTP 401 when token signature is invalid', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', 'Bearer invalid.jwt.token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Invalid access token');
    });

    it('should return HTTP 401 when token has expired', async () => {
      // Create an expired token
      const expiredToken = jwt.sign(
        { id: userAId, email: 'userA@example.com' },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' }
      );

      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('expired');
    });
  });

  describe('POST /api/tasks', () => {
    it('should successfully create a task with valid input and return HTTP 201', async () => {
      const newTask = {
        title: 'Complete WA-2 Internship Project',
        description: 'Build robust REST API with Node, Express, SQLite and JWT',
        status: 'in_progress',
        dueDate: '2026-10-30T18:00:00.000Z'
      };

      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${userAToken}`)
        .send(newTask);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('Task created successfully');
      expect(res.body.data.task).toBeDefined();
      expect(res.body.data.task.id).toBeDefined();
      expect(res.body.data.task.user_id).toBe(userAId);
      expect(res.body.data.task.title).toBe(newTask.title);
      expect(res.body.data.task.status).toBe('in_progress');
      expect(res.body.data.task.due_date).toBe(newTask.dueDate);

      userATaskId = res.body.data.task.id;
    });

    it('should default status to "pending" when not provided', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          title: 'Draft documentation'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.task.status).toBe('pending');
      expect(res.body.data.task.description).toBeNull();
    });

    it('should return HTTP 400 when title is missing or empty', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          title: '   ',
          description: 'Empty title test'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors.some(e => e.field === 'title')).toBe(true);
    });

    it('should return HTTP 400 when status is not in allowed enum', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          title: 'Invalid status task',
          status: 'archived' // not pending, in_progress, or completed
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors.some(e => e.field === 'status')).toBe(true);
    });

    it('should return HTTP 400 when dueDate is an invalid date string', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          title: 'Invalid date task',
          dueDate: 'tomorrow-afternoon'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.errors.some(e => e.field === 'dueDate')).toBe(true);
    });
  });

  describe('GET /api/tasks', () => {
    it('should list only the authenticated user tasks with HTTP 200', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.tasks)).toBe(true);
      expect(res.body.count).toBe(res.body.data.tasks.length);
      // All returned tasks must belong to User A
      res.body.data.tasks.forEach(task => {
        expect(task.user_id).toBe(userAId);
      });
    });

    it('should return an empty list for a user who has no tasks', async () => {
      const res = await request(app)
        .get('/api/tasks')
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(0);
      expect(res.body.data.tasks).toEqual([]);
    });

    it('should support optional status query filtering', async () => {
      const res = await request(app)
        .get('/api/tasks?status=in_progress')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      res.body.data.tasks.forEach(task => {
        expect(task.status).toBe('in_progress');
      });
    });

    it('should return HTTP 400 when status query parameter is invalid', async () => {
      const res = await request(app)
        .get('/api/tasks?status=wrong_status')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('GET /api/tasks/:id', () => {
    it('should return the specific task for the owner with HTTP 200', async () => {
      const res = await request(app)
        .get(`/api/tasks/${userATaskId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.task.id).toBe(userATaskId);
      expect(res.body.data.task.user_id).toBe(userAId);
    });

    it('CRITICAL: should return HTTP 404 when User B attempts to access User A task', async () => {
      const res = await request(app)
        .get(`/api/tasks/${userATaskId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Task not found');
    });

    it('should return HTTP 404 when task ID does not exist', async () => {
      const res = await request(app)
        .get('/api/tasks/999999')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });

    it('should return HTTP 400 when task ID is not a positive integer', async () => {
      const res = await request(app)
        .get('/api/tasks/invalid-id')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('PUT /api/tasks/:id', () => {
    it('should update task successfully with HTTP 200', async () => {
      const updateData = {
        title: 'Complete WA-2 Internship Project - Revised',
        status: 'completed'
      };

      const res = await request(app)
        .put(`/api/tasks/${userATaskId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.task.title).toBe(updateData.title);
      expect(res.body.data.task.status).toBe('completed');
    });

    it('CRITICAL: should return HTTP 404 when User B attempts to update User A task', async () => {
      const res = await request(app)
        .put(`/api/tasks/${userATaskId}`)
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          title: 'Hacked by User B'
        });

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);

      // Verify User A task remained unchanged
      const verifyRes = await request(app)
        .get(`/api/tasks/${userATaskId}`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(verifyRes.body.data.task.title).not.toBe('Hacked by User B');
    });

    it('should reject empty updates with HTTP 400', async () => {
      const res = await request(app)
        .put(`/api/tasks/${userATaskId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Validation failed');
    });

    it('should reject updates containing invalid/unknown fields with HTTP 400', async () => {
      const res = await request(app)
        .put(`/api/tasks/${userATaskId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          title: 'Valid Title',
          adminOverride: true // Disallowed field
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject invalid status value in update with HTTP 400', async () => {
      const res = await request(app)
        .put(`/api/tasks/${userATaskId}`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          status: 'invalid_status'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe('DELETE /api/tasks/:id', () => {
    it('CRITICAL: should return HTTP 404 when User B attempts to delete User A task', async () => {
      const res = await request(app)
        .delete(`/api/tasks/${userATaskId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);

      // Verify task still exists for User A
      const verifyRes = await request(app)
        .get(`/api/tasks/${userATaskId}`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(verifyRes.status).toBe(200);
    });

    it('should successfully delete task by owner with HTTP 200', async () => {
      const res = await request(app)
        .delete(`/api/tasks/${userATaskId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('deleted successfully');

      // Verify it is now 404
      const verifyRes = await request(app)
        .get(`/api/tasks/${userATaskId}`)
        .set('Authorization', `Bearer ${userAToken}`);
      expect(verifyRes.status).toBe(404);
    });

    it('should return HTTP 404 when deleting a non-existent task', async () => {
      const res = await request(app)
        .delete(`/api/tasks/${userATaskId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });
});
