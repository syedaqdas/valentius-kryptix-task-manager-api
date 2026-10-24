const express = require('express');
const router = express.Router();

const AuthController = require('../controllers/auth.controller');
const { registerValidator, loginValidator } = require('../validators/auth.validator');
const validate = require('../middleware/validate');

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', registerValidator, validate, AuthController.register);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and get JWT access token
 * @access  Public
 */
router.post('/login', loginValidator, validate, AuthController.login);

module.exports = router;
