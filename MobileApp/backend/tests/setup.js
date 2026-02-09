// Jest test setup file
const path = require('path');
const fs = require('fs');

// Use a separate test database
const TEST_DB_PATH = path.join(__dirname, '..', 'src', 'database', 'test_premium_gift_box.db');

// Set environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.TEST_DB_PATH = TEST_DB_PATH;

// Clean up test database before all tests
beforeAll(() => {
  // Remove existing test database if it exists
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
  }
});

// Clean up after all tests
afterAll(() => {
  // Optionally remove test database after tests
  if (fs.existsSync(TEST_DB_PATH)) {
    try {
      fs.unlinkSync(TEST_DB_PATH);
    } catch (err) {
      // Ignore errors during cleanup
    }
  }
});

// Increase timeout for all tests
jest.setTimeout(30000);
