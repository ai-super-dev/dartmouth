/**
 * Authentication Service
 * 
 * JWT-based authentication and Role-Based Access Control (RBAC)
 * for staff dashboard access.
 * 
 * Created: Nov 28, 2025
 * Part of: Dartmouth OS Extensions for Customer Service System
 */

/**
 * User roles
 */
export type UserRole = 
  | 'admin'           // Full access
  | 'manager'         // Team management + all agent features
  | 'team-lead'       // Team oversight + agent features
  | 'agent'           // Customer service agent
  | 'viewer';         // Read-only access

/**
 * User permissions
 */
export type Permission =
  | 'tickets:read'
  | 'tickets:write'
  | 'tickets:assign'
  | 'tickets:escalate'
  | 'tickets:close'
  | 'customers:read'
  | 'customers:write'
  | 'channels:read'
  | 'channels:write'
  | 'channels:create'
  | 'channels:delete'
  | 'staff:read'
  | 'staff:write'
  | 'staff:invite'
  | 'staff:remove'
  | 'analytics:read'
  | 'settings:read'
  | 'settings:write';

/**
 * User account
 */
export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  permissions: Permission[];
  avatar?: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  lastLogin?: string;
  metadata?: Record<string, any>;
}

/**
 * JWT payload
 */
export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  iat: number;  // Issued at
  exp: number;  // Expiration
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Login result
 */
export interface LoginResult {
  success: boolean;
  token?: string;
  user?: User;
  error?: string;
  expiresAt?: string;
}

/**
 * Token validation result
 */
export interface TokenValidationResult {
  valid: boolean;
  payload?: JWTPayload;
  user?: User;
  error?: string;
}

/**
 * Role-based permissions map
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    'tickets:read', 'tickets:write', 'tickets:assign', 'tickets:escalate', 'tickets:close',
    'customers:read', 'customers:write',
    'channels:read', 'channels:write', 'channels:create', 'channels:delete',
    'staff:read', 'staff:write', 'staff:invite', 'staff:remove',
    'analytics:read',
    'settings:read', 'settings:write'
  ],
  manager: [
    'tickets:read', 'tickets:write', 'tickets:assign', 'tickets:escalate', 'tickets:close',
    'customers:read', 'customers:write',
    'channels:read', 'channels:write', 'channels:create',
    'staff:read', 'staff:write',
    'analytics:read',
    'settings:read'
  ],
  'team-lead': [
    'tickets:read', 'tickets:write', 'tickets:assign', 'tickets:escalate', 'tickets:close',
    'customers:read', 'customers:write',
    'channels:read', 'channels:write',
    'staff:read',
    'analytics:read'
  ],
  agent: [
    'tickets:read', 'tickets:write', 'tickets:escalate',
    'customers:read',
    'channels:read', 'channels:write'
  ],
  viewer: [
    'tickets:read',
    'customers:read',
    'channels:read',
    'analytics:read'
  ]
};

/**
 * Authentication Service
 * 
 * Handles user authentication, JWT token generation/validation, and RBAC.
 */
export class AuthenticationService {
  private jwtSecret: string;
  private tokenExpiry: number = 24 * 60 * 60 * 1000; // 24 hours
  private userStore: Map<string, User> = new Map(); // In-memory for now, will use DB later

  constructor(jwtSecret: string) {
    this.jwtSecret = jwtSecret;
    this.initializeDemoUsers();
  }

  /**
   * Login with email and password
   */
  async login(credentials: LoginCredentials): Promise<LoginResult> {
    console.log(`[AuthenticationService] Login attempt: ${credentials.email}`);

    try {
      // STEP 1: Find user by email
      const user = this.findUserByEmail(credentials.email);
      
      if (!user) {
        console.log(`[AuthenticationService] ❌ User not found: ${credentials.email}`);
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      // STEP 2: Verify password
      const passwordValid = await this.verifyPassword(credentials.password, user.id);
      
      if (!passwordValid) {
        console.log(`[AuthenticationService] ❌ Invalid password for: ${credentials.email}`);
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      // STEP 3: Check if user is active
      if (user.status !== 'active') {
        console.log(`[AuthenticationService] ❌ User not active: ${credentials.email} (${user.status})`);
        return {
          success: false,
          error: 'Account is not active'
        };
      }

      // STEP 4: Generate JWT token
      const token = await this.generateToken(user);

      // STEP 5: Update last login
      user.lastLogin = new Date().toISOString();
      this.userStore.set(user.id, user);

      // STEP 6: Return success
      const expiresAt = new Date(Date.now() + this.tokenExpiry).toISOString();

      console.log(`[AuthenticationService] ✅ Login successful: ${credentials.email}`);
      return {
        success: true,
        token,
        user: this.sanitizeUser(user),
        expiresAt
      };

    } catch (error) {
      console.error('[AuthenticationService] Login error:', error);
      return {
        success: false,
        error: 'An error occurred during login'
      };
    }
  }

  /**
   * Validate JWT token
   */
  async validateToken(token: string): Promise<TokenValidationResult> {
    try {
      // STEP 1: Decode and verify token
      const payload = await this.verifyToken(token);

      if (!payload) {
        return {
          valid: false,
          error: 'Invalid token'
        };
      }

      // STEP 2: Check expiration
      if (payload.exp < Date.now() / 1000) {
        return {
          valid: false,
          error: 'Token expired'
        };
      }

      // STEP 3: Get user
      const user = this.userStore.get(payload.userId);

      if (!user) {
        return {
          valid: false,
          error: 'User not found'
        };
      }

      // STEP 4: Check if user is still active
      if (user.status !== 'active') {
        return {
          valid: false,
          error: 'User account is not active'
        };
      }

      return {
        valid: true,
        payload,
        user: this.sanitizeUser(user)
      };

    } catch (error) {
      console.error('[AuthenticationService] Token validation error:', error);
      return {
        valid: false,
        error: 'Token validation failed'
      };
    }
  }

  /**
   * Check if user has permission
   */
  hasPermission(user: User, permission: Permission): boolean {
    return user.permissions.includes(permission);
  }

  /**
   * Check if user has any of the permissions
   */
  hasAnyPermission(user: User, permissions: Permission[]): boolean {
    return permissions.some(permission => user.permissions.includes(permission));
  }

  /**
   * Check if user has all permissions
   */
  hasAllPermissions(user: User, permissions: Permission[]): boolean {
    return permissions.every(permission => user.permissions.includes(permission));
  }

  /**
   * Get permissions for a role
   */
  getRolePermissions(role: UserRole): Permission[] {
    return [...ROLE_PERMISSIONS[role]];
  }

  /**
   * Create a new user
   */
  async createUser(
    email: string,
    password: string,
    name: string,
    role: UserRole
  ): Promise<User> {
    const userId = this.generateUserId();

    const user: User = {
      id: userId,
      email,
      name,
      role,
      permissions: this.getRolePermissions(role),
      status: 'active',
      createdAt: new Date().toISOString()
    };

    // Store user
    this.userStore.set(userId, user);

    // Store password (in production, use proper password hashing)
    await this.storePassword(userId, password);

    console.log(`[AuthenticationService] ✅ User created: ${email} (${role})`);
    return this.sanitizeUser(user);
  }

  /**
   * Update user role
   */
  async updateUserRole(userId: string, newRole: UserRole): Promise<User | null> {
    const user = this.userStore.get(userId);

    if (!user) {
      return null;
    }

    user.role = newRole;
    user.permissions = this.getRolePermissions(newRole);
    this.userStore.set(userId, user);

    console.log(`[AuthenticationService] ✅ User role updated: ${user.email} → ${newRole}`);
    return this.sanitizeUser(user);
  }

  /**
   * Deactivate user
   */
  async deactivateUser(userId: string): Promise<boolean> {
    const user = this.userStore.get(userId);

    if (!user) {
      return false;
    }

    user.status = 'inactive';
    this.userStore.set(userId, user);

    console.log(`[AuthenticationService] ✅ User deactivated: ${user.email}`);
    return true;
  }

  /**
   * Get user by ID
   */
  getUserById(userId: string): User | null {
    const user = this.userStore.get(userId);
    return user ? this.sanitizeUser(user) : null;
  }

  /**
   * Get all users
   */
  getAllUsers(): User[] {
    return Array.from(this.userStore.values()).map(user => this.sanitizeUser(user));
  }

  /**
   * Generate JWT token
   */
  private async generateToken(user: User): Promise<string> {
    const payload: JWTPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      permissions: user.permissions,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor((Date.now() + this.tokenExpiry) / 1000)
    };

    // In production, use a proper JWT library (e.g., jose, jsonwebtoken)
    // For now, we'll create a simple token
    const header = this.base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payloadEncoded = this.base64UrlEncode(JSON.stringify(payload));
    const signature = await this.sign(`${header}.${payloadEncoded}`, this.jwtSecret);

    return `${header}.${payloadEncoded}.${signature}`;
  }

  /**
   * Verify JWT token
   */
  private async verifyToken(token: string): Promise<JWTPayload | null> {
    try {
      const parts = token.split('.');
      
      if (parts.length !== 3) {
        return null;
      }

      const [header, payload, signature] = parts;

      // Verify signature
      const expectedSignature = await this.sign(`${header}.${payload}`, this.jwtSecret);
      
      if (signature !== expectedSignature) {
        return null;
      }

      // Decode payload
      const payloadDecoded = JSON.parse(this.base64UrlDecode(payload));

      return payloadDecoded;

    } catch (error) {
      console.error('[AuthenticationService] Token verification error:', error);
      return null;
    }
  }

  /**
   * Sign data with secret
   */
  private async sign(data: string, secret: string): Promise<string> {
    // In production, use proper HMAC-SHA256
    // For now, simple hash
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data + secret);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return this.base64UrlEncode(hashHex);
  }

  /**
   * Base64 URL encode
   */
  private base64UrlEncode(str: string): string {
    return btoa(str)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Base64 URL decode
   */
  private base64UrlDecode(str: string): string {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) {
      str += '=';
    }
    return atob(str);
  }

  /**
   * Find user by email
   */
  private findUserByEmail(email: string): User | null {
    for (const user of this.userStore.values()) {
      if (user.email.toLowerCase() === email.toLowerCase()) {
        return user;
      }
    }
    return null;
  }

  /**
   * Verify password
   */
  private async verifyPassword(password: string, userId: string): Promise<boolean> {
    // In production, use proper password hashing (bcrypt, argon2)
    // For now, simple comparison
    const storedPassword = await this.getStoredPassword(userId);
    return password === storedPassword;
  }

  /**
   * Store password (placeholder)
   */
  private async storePassword(userId: string, password: string): Promise<void> {
    // In production, hash the password before storing
    // For now, store in memory (NOT SECURE - demo only)
    (this as any)[`password_${userId}`] = password;
  }

  /**
   * Get stored password (placeholder)
   */
  private async getStoredPassword(userId: string): Promise<string | null> {
    return (this as any)[`password_${userId}`] || null;
  }

  /**
   * Generate user ID
   */
  private generateUserId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
  }

  /**
   * Sanitize user (remove sensitive data)
   */
  private sanitizeUser(user: User): User {
    // Return a copy without sensitive fields
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      permissions: [...user.permissions],
      avatar: user.avatar,
      status: user.status,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
      metadata: user.metadata ? { ...user.metadata } : undefined
    };
  }

  /**
   * Initialize demo users for testing
   */
  private initializeDemoUsers(): void {
    // Create demo users
    const demoUsers: Array<{ email: string; password: string; name: string; role: UserRole }> = [
      { email: 'admin@dartmouth.com', password: 'admin123', name: 'Admin User', role: 'admin' },
      { email: 'manager@dartmouth.com', password: 'manager123', name: 'Manager User', role: 'manager' },
      { email: 'agent@dartmouth.com', password: 'agent123', name: 'Agent User', role: 'agent' }
    ];

    for (const demo of demoUsers) {
      this.createUser(demo.email, demo.password, demo.name, demo.role);
    }

    console.log('[AuthenticationService] ✅ Demo users initialized');
  }
}

