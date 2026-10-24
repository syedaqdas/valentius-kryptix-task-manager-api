const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/user.model');

const AuthController = {
  /**
   * Register a new user account.
   * Hashes password, ensures unique email, returns 201 without sensitive credentials.
   */
  async register(req, res, next) {
    try {
      const { name, email, password } = req.body;

      // Check if user with this email already exists
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          success: false,
          message: 'An account with this email address already exists.'
        });
      }

      // Hash password securely with bcrypt
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(password, saltRounds);

      // Save user to database
      const newUser = await UserModel.create({
        name,
        email,
        passwordHash
      });

      return res.status(201).json({
        success: true,
        message: 'User registered successfully.',
        data: {
          user: newUser
        }
      });
    } catch (error) {
      next(error);
    }
  },

  /**
   * Authenticate an existing user and return a signed JWT token.
   * Returns 401 for invalid credentials without revealing whether email exists.
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // Look up user including password hash
      const user = await UserModel.findByEmailWithPassword(email);
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.'
        });
      }

      // Securely compare provided password with stored bcrypt hash
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);
      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid email or password.'
        });
      }

      // Sign JWT access token
      const secret = process.env.JWT_SECRET;
      const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
      const token = jwt.sign(
        { id: user.id, email: user.email },
        secret,
        { expiresIn }
      );

      return res.status(200).json({
        success: true,
        message: 'Login successful.',
        data: {
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            created_at: user.created_at
          }
        }
      });
    } catch (error) {
      next(error);
    }
  }
};

module.exports = AuthController;
