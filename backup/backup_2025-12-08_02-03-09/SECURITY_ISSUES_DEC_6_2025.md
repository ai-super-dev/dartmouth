# 🔴 SECURITY ISSUES - CRITICAL

**Date:** December 6, 2025, 10:50 PM AEST  
**Status:** ⚠️ CRITICAL - MUST FIX BEFORE PRODUCTION  
**Severity:** HIGH

---

## 🚨 CRITICAL ISSUE: Plain Text Password Storage/Comparison

### **Problem Description**

The authentication system is currently using **plain text password comparison** instead of secure password hashing. This is a **CRITICAL SECURITY VULNERABILITY**.

### **Location**

**File:** `packages/worker/src/controllers/auth.ts`  
**Lines:** 12-16

```typescript
async function comparePassword(password: string, hash: string): Promise<boolean> {
  // TODO: Replace with proper bcrypt implementation
  // This is a temporary solution for testing
  return password === hash || hash.startsWith('$2b$') && password === 'changeme123';
}
```

### **Impact**

- ⚠️ **HIGH RISK**: All staff passwords are stored as plain text in the database
- ⚠️ **Data Breach Risk**: If database is compromised, all passwords are exposed
- ⚠️ **Compliance**: Violates security best practices and compliance requirements
- ⚠️ **Production Blocker**: Cannot go to production with this vulnerability

### **Current Behavior**

1. When a staff member sets their password, it's stored as plain text in `staff_users.password_hash`
2. During login, the system compares the entered password directly with the stored "hash"
3. No actual hashing or salting is performed
4. Example: If password is "test123", it's stored as "test123" in the database

### **Affected Tables**

- `staff_users.password_hash` - Contains plain text passwords

### **Affected Users**

All staff users:
- John Hutchison (admin)
- Ted Smith (agent)
- Sam Johnson (agent)
- Gaille Hutchison (manager)
- McCarthy AI (system account)

---

## ✅ REQUIRED FIX

### **Solution: Implement Proper Password Hashing**

**Options:**

1. **Web Crypto API (Recommended for Cloudflare Workers)**
   - Use PBKDF2 with high iteration count
   - Native to Cloudflare Workers
   - No external dependencies
   - Example: `crypto.subtle.importKey()` + `crypto.subtle.deriveBits()`

2. **Argon2 (Best Security)**
   - Industry standard for password hashing
   - Winner of Password Hashing Competition
   - May need Workers-compatible library
   - Example: `@noble/hashes/argon2`

3. **Bcrypt (Traditional)**
   - Widely used and trusted
   - May have compatibility issues with Workers
   - Example: `bcryptjs` (pure JS implementation)

### **Implementation Steps**

1. **Choose hashing algorithm** (recommend Web Crypto API or Argon2)
2. **Update `comparePassword()` function** to use proper hashing
3. **Add `hashPassword()` function** for new password creation
4. **Update password change endpoints** to hash passwords
5. **Add migration script** to rehash existing passwords
6. **Force password reset** for all users after deployment

### **Code Example (Web Crypto API)**

```typescript
import { encode, decode } from '@stablelib/base64';

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  
  const key = await crypto.subtle.importKey(
    'raw',
    data,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    key,
    256
  );
  
  const hashArray = new Uint8Array(bits);
  const combined = new Uint8Array(salt.length + hashArray.length);
  combined.set(salt);
  combined.set(hashArray, salt.length);
  
  return encode(combined);
}

async function comparePassword(password: string, hash: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const combined = decode(hash);
  
  const salt = combined.slice(0, 16);
  const storedHash = combined.slice(16);
  
  const key = await crypto.subtle.importKey(
    'raw',
    data,
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );
  
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    key,
    256
  );
  
  const hashArray = new Uint8Array(bits);
  
  // Constant-time comparison
  if (hashArray.length !== storedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < hashArray.length; i++) {
    diff |= hashArray[i] ^ storedHash[i];
  }
  return diff === 0;
}
```

---

## 📋 MIGRATION PLAN

### **Phase 1: Implement Hashing (1-2 hours)**
1. Add hashing functions to auth controller
2. Update registration/password change endpoints
3. Test locally with new user accounts

### **Phase 2: Database Migration (30 minutes)**
1. Add new column `password_hash_v2` (temporary)
2. Keep old `password_hash` for rollback
3. Deploy to production

### **Phase 3: Force Password Reset (1 hour)**
1. Set all `password_hash_v2` to NULL
2. Send password reset emails to all staff
3. Update login to check `password_hash_v2` first, fall back to old
4. Monitor adoption

### **Phase 4: Cleanup (30 minutes)**
1. After all users reset passwords
2. Drop old `password_hash` column
3. Rename `password_hash_v2` to `password_hash`
4. Remove fallback code

---

## 🧪 TESTING PLAN

### **Unit Tests**
- [ ] Test password hashing produces different hashes for same password (salt)
- [ ] Test password comparison returns true for correct password
- [ ] Test password comparison returns false for incorrect password
- [ ] Test timing attack resistance (constant-time comparison)

### **Integration Tests**
- [ ] Test user registration with hashed password
- [ ] Test login with hashed password
- [ ] Test password change with hashed password
- [ ] Test password reset flow

### **Security Tests**
- [ ] Verify passwords not stored in plain text
- [ ] Verify hashes are salted (different for same password)
- [ ] Verify iteration count is high enough (100k+)
- [ ] Verify constant-time comparison

---

## 📝 NOTES

### **Why This Happened**
- Temporary implementation for quick testing
- Comment in code says "TEMPORARY - MUST FIX FOR PRODUCTION"
- Was never intended for production use
- Discovered during mentions testing when login failed

### **Current Workaround**
- Set `password_hash` to plain text password in database
- Example: `UPDATE staff_users SET password_hash = 'test123' WHERE email = 'user@example.com'`
- **DO NOT USE IN PRODUCTION**

### **Dependencies Needed**
- `@stablelib/base64` (for encoding) OR
- `@noble/hashes` (for Argon2) OR
- Built-in Web Crypto API (no dependencies)

---

## ⏰ TIMELINE

**Estimated Time:** 3-4 hours total  
**Priority:** 🔴 CRITICAL  
**Blocker:** YES - Cannot go to production without this fix  

---

## 🔗 RELATED ISSUES

- Mentions Mark as Read/Unread bug (discovered during testing)
- Staff user management (will need password reset UI)
- Email system (for password reset emails)

---

**END OF SECURITY REPORT**

**Action Required:** Implement proper password hashing BEFORE production deployment.

