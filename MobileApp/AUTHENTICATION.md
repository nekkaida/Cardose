# Authentication System Documentation

## Overview

The Cardose Mobile App now includes a complete authentication system with JWT-based authentication, user management, and role-based access control.

## Features

### Backend Features

1. **User Registration**
   - Create new user accounts
   - Password hashing with bcrypt (10 salt rounds)
   - Automatic JWT token generation on registration
   - Role assignment (owner, manager, employee)
   - Email and username uniqueness validation

2. **User Login**
   - Username/password authentication
   - JWT token generation
   - Account activation status check
   - Session management

3. **Password Management**
   - Change password (with current password verification)
   - Password reset request (generates time-limited token)
   - Password reset with token (1-hour expiration)
   - Minimum 6-character password requirement

4. **Profile Management**
   - View user profile
   - Update profile information (name, email, phone)
   - User deactivation/activation

5. **Role-Based Access Control (RBAC)**
   - Three user roles: owner, manager, employee
   - Authorization decorator for route protection
   - Role-based permission checks

### Mobile App Features

1. **Login/Registration Screen**
   - Toggle between login and registration modes
   - Form validation
   - Loading states
   - Error handling with user-friendly alerts

2. **Authentication Context (AuthContext)**
   - Global authentication state management
   - Automatic token storage with AsyncStorage
   - Token verification on app startup
   - Automatic logout on token expiration
   - Helper hook for authenticated API calls

3. **Profile Screen**
   - View and edit user information
   - Change password functionality
   - Logout button
   - User role display

4. **Protected Routes**
   - Automatic redirect to login when not authenticated
   - User information displayed in navigation
   - Persistent authentication across app restarts

## API Endpoints

### Authentication Endpoints

All endpoints are prefixed with `/api/auth`

#### POST /register
Register a new user account.

**Request Body:**
```json
{
  "username": "string (required)",
  "password": "string (required, min 6 chars)",
  "email": "string (required)",
  "fullName": "string (required)",
  "phone": "string (optional)",
  "role": "string (optional, default: employee)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "username": "string",
    "email": "string",
    "fullName": "string",
    "role": "string"
  }
}
```

#### POST /login
Authenticate user and get JWT token.

**Request Body:**
```json
{
  "username": "string (required)",
  "password": "string (required)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "uuid",
    "username": "string",
    "email": "string",
    "fullName": "string",
    "phone": "string",
    "role": "string"
  }
}
```

#### POST /logout
Logout user (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

#### GET /profile
Get current user profile (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "uuid",
    "username": "string",
    "email": "string",
    "fullName": "string",
    "phone": "string",
    "role": "string",
    "isActive": boolean,
    "createdAt": "datetime"
  }
}
```

#### PUT /profile
Update user profile (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "fullName": "string (optional)",
  "email": "string (optional)",
  "phone": "string (optional)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Profile updated successfully"
}
```

#### POST /change-password
Change user password (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "currentPassword": "string (required)",
  "newPassword": "string (required, min 6 chars)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

#### POST /request-reset
Request password reset token.

**Request Body:**
```json
{
  "email": "string (required)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Reset token generated",
  "resetToken": "jwt_token_here"
}
```

**Note:** In production, the token should be sent via email, not returned in the response.

#### POST /reset-password
Reset password using reset token.

**Request Body:**
```json
{
  "resetToken": "string (required)",
  "newPassword": "string (required, min 6 chars)"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

#### GET /verify
Verify JWT token validity (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "valid": true,
  "user": {
    "id": "uuid",
    "username": "string",
    "email": "string",
    "role": "string"
  }
}
```

## Database Schema

### Users Table

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'employee')),
  full_name TEXT NOT NULL,
  phone TEXT,
  is_active INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Default Admin User

Username: `admin`
Password: `admin123` (⚠️ CHANGE THIS IN PRODUCTION!)
Role: `owner`

## Security Features

1. **Password Hashing**
   - Bcrypt with 10 salt rounds
   - Never store plaintext passwords

2. **JWT Tokens**
   - Secure token generation
   - Token expiration support
   - Token verification on every protected route

3. **Input Validation**
   - Required field validation
   - Email format validation
   - Password strength requirements (min 6 characters)

4. **Account Security**
   - Current password verification for password changes
   - Time-limited password reset tokens (1 hour)
   - Account activation/deactivation support

5. **Error Handling**
   - No user enumeration (same message for valid/invalid emails)
   - Detailed error logging (server-side only)
   - User-friendly error messages (client-side)

## Mobile App Usage

### Using AuthContext

```typescript
import { useAuth } from './src/contexts/AuthContext';

function MyComponent() {
  const { user, token, isAuthenticated, login, logout } = useAuth();

  // user contains: id, username, email, fullName, phone, role
  // token contains the JWT token
  // isAuthenticated is a boolean
}
```

### Making Authenticated API Calls

```typescript
import { useAuthenticatedFetch } from './src/contexts/AuthContext';

function MyComponent() {
  const authenticatedFetch = useAuthenticatedFetch();

  const fetchData = async () => {
    try {
      const response = await authenticatedFetch('/orders', {
        method: 'GET',
      });
      const data = await response.json();
      // Handle data
    } catch (error) {
      // Handle error (auto-logout on 401)
    }
  };
}
```

## Setup Instructions

### Backend Setup

1. **Install Dependencies**
   ```bash
   cd MobileApp/backend
   npm install
   ```

2. **Initialize Database**
   ```bash
   npm run init-db
   ```

3. **Configure JWT Secret**
   - Set `JWT_SECRET` environment variable
   - Default: `premium-gift-box-secret-key-change-in-production`
   - **⚠️ CHANGE THIS IN PRODUCTION!**

4. **Start Server**
   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```

### Mobile App Setup

1. **Install Dependencies**
   ```bash
   cd MobileApp/mobile
   npm install
   ```

2. **Configure API URL**
   - Edit `src/contexts/AuthContext.tsx`
   - Update `API_BASE_URL` to your backend URL
   - Default: `http://localhost:3000/api`

3. **Start Mobile App**
   ```bash
   npm start
   # Then press 'a' for Android or 'i' for iOS
   ```

## Testing

### Test Default Admin Login

1. Start the backend server
2. Start the mobile app
3. Login with:
   - Username: `admin`
   - Password: `admin123`

### Test Registration

1. Click "Don't have an account? Register"
2. Fill in all required fields
3. Submit registration
4. You'll be automatically logged in

### Test Password Change

1. Login to the app
2. Navigate to Profile tab
3. Click "Change Password"
4. Enter current and new passwords
5. Submit

## Future Enhancements

### Phase 2 (Planned)

1. **Email Integration**
   - Send password reset emails
   - Email verification on registration
   - Welcome emails

2. **Advanced RBAC**
   - Permission-level access control
   - Custom roles
   - Feature flags per role

3. **Security Improvements**
   - Two-factor authentication (2FA)
   - Login attempt limiting
   - IP-based restrictions
   - Session management (blacklist tokens)

4. **Audit Logging**
   - Log all authentication events
   - Track failed login attempts
   - User activity logging

5. **Social Authentication**
   - Google Sign-In
   - Apple Sign-In
   - OAuth2 support

## Troubleshooting

### Common Issues

1. **"Unable to connect to server"**
   - Check if backend is running
   - Verify API_BASE_URL in AuthContext.tsx
   - For Android emulator, use `10.0.2.2:3000` instead of `localhost:3000`
   - For real device, use your computer's IP address

2. **"Invalid credentials" on login**
   - Verify username and password
   - Check if user exists in database
   - Ensure database is initialized

3. **Token expired errors**
   - Tokens don't expire by default
   - Check if JWT_SECRET matches between requests
   - Clear AsyncStorage and login again

4. **AsyncStorage errors**
   - Make sure @react-native-async-storage/async-storage is installed
   - Run `npm install` in mobile directory

## Security Best Practices

1. **Change default admin password immediately**
2. **Use strong JWT_SECRET in production**
3. **Use HTTPS in production**
4. **Implement rate limiting for login attempts**
5. **Regular security audits**
6. **Keep dependencies updated**
7. **Implement proper session management**
8. **Add request logging and monitoring**

## Support

For issues or questions:
- Check GitHub Issues: https://github.com/nekkaida/Cardose/issues
- Review the codebase documentation
- Contact: admin@premiumgiftbox.com

---

**Last Updated:** November 14, 2024
**Version:** 1.0.0
**Status:** ✅ Production Ready
