import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestDb } from '../testHelpers';
import * as userService from '../../services/userService';

describe('userService', () => {
  beforeEach(() => {
    setupTestDb();
  });

  describe('createUser', () => {
    it('creates a user with roles', () => {
      const user = userService.createUser('test@example.com', 'password123', ['MONITOR']);
      expect(user.email).toBe('test@example.com');
      expect(user.status).toBe('ACTIVE');
      expect(user.roles).toContain('MONITOR');
    });

    it('rejects duplicate email', () => {
      userService.createUser('dup@example.com', 'password123', ['MONITOR']);
      expect(() =>
        userService.createUser('dup@example.com', 'password456', ['AUDITOR'])
      ).toThrow(/Email already in use/);
    });

    it('assigns multiple roles', () => {
      const user = userService.createUser('multi@example.com', 'password123', ['MONITOR', 'AUDITOR']);
      expect(user.roles).toHaveLength(2);
      expect(user.roles).toContain('MONITOR');
      expect(user.roles).toContain('AUDITOR');
    });
  });

  describe('updateUser — status transitions', () => {
    it('transitions ACTIVE → INACTIVE', () => {
      const user = userService.createUser('u1@example.com', 'password123', ['MONITOR']);
      const updated = userService.updateUser(user.id, { status: 'INACTIVE' });
      expect(updated.status).toBe('INACTIVE');
    });

    it('transitions ACTIVE → ARCHIVED', () => {
      const user = userService.createUser('u2@example.com', 'password123', ['MONITOR']);
      const updated = userService.updateUser(user.id, { status: 'ARCHIVED' });
      expect(updated.status).toBe('ARCHIVED');
    });

    it('transitions INACTIVE → ACTIVE', () => {
      const user = userService.createUser('u3@example.com', 'password123', ['MONITOR']);
      userService.updateUser(user.id, { status: 'INACTIVE' });
      const updated = userService.updateUser(user.id, { status: 'ACTIVE' });
      expect(updated.status).toBe('ACTIVE');
    });

    it('rejects ARCHIVED → ACTIVE (terminal state)', () => {
      const user = userService.createUser('u4@example.com', 'password123', ['MONITOR']);
      userService.updateUser(user.id, { status: 'ARCHIVED' });
      expect(() =>
        userService.updateUser(user.id, { status: 'ACTIVE' })
      ).toThrow(/Cannot transition from ARCHIVED to ACTIVE/);
    });

    it('rejects ARCHIVED → INACTIVE (terminal state)', () => {
      const user = userService.createUser('u5@example.com', 'password123', ['MONITOR']);
      userService.updateUser(user.id, { status: 'ARCHIVED' });
      expect(() =>
        userService.updateUser(user.id, { status: 'INACTIVE' })
      ).toThrow(/Cannot transition from ARCHIVED to INACTIVE/);
    });
  });

  describe('updateUser — password', () => {
    it('updates password without changing status', () => {
      const user = userService.createUser('pw@example.com', 'password123', ['MONITOR']);
      const updated = userService.updateUser(user.id, { password: 'newpassword456' });
      expect(updated.status).toBe('ACTIVE');
      expect(updated.id).toBe(user.id);
    });
  });

  describe('updateUser — roles replacement', () => {
    it('replaces all roles', () => {
      const user = userService.createUser('roles@example.com', 'password123', ['MONITOR', 'AUDITOR']);
      const updated = userService.updateUser(user.id, { roles: ['ADMIN'] });
      expect(updated.roles).toEqual(['ADMIN']);
    });
  });

  describe('assignRoleToUser', () => {
    it('adds a role to user', () => {
      const user = userService.createUser('assign@example.com', 'password123', ['MONITOR']);
      const updated = userService.assignRoleToUser(user.id, 'AUDITOR');
      expect(updated.roles).toContain('MONITOR');
      expect(updated.roles).toContain('AUDITOR');
    });

    it('is idempotent (no error on duplicate)', () => {
      const user = userService.createUser('idem@example.com', 'password123', ['MONITOR']);
      const updated = userService.assignRoleToUser(user.id, 'MONITOR');
      expect(updated.roles).toContain('MONITOR');
    });

    it('throws for non-existent user', () => {
      expect(() => userService.assignRoleToUser(9999, 'MONITOR')).toThrow(/User not found/);
    });
  });

  describe('unassignRoleFromUser', () => {
    it('removes a role from user', () => {
      const user = userService.createUser('unassign@example.com', 'password123', ['MONITOR', 'AUDITOR']);
      const updated = userService.unassignRoleFromUser(user.id, 'AUDITOR');
      expect(updated.roles).toEqual(['MONITOR']);
    });

    it('throws if user does not have the role', () => {
      const user = userService.createUser('norole@example.com', 'password123', ['MONITOR']);
      expect(() => userService.unassignRoleFromUser(user.id, 'AUDITOR')).toThrow(
        /User does not have role/
      );
    });

    it('throws for non-existent user', () => {
      expect(() => userService.unassignRoleFromUser(9999, 'MONITOR')).toThrow(/User not found/);
    });
  });

  describe('getUsers', () => {
    it('returns paginated results', () => {
      // Seed admin already exists from initDb
      userService.createUser('page1@example.com', 'password123', ['MONITOR']);
      userService.createUser('page2@example.com', 'password123', ['AUDITOR']);
      const result = userService.getUsers(1, 10);
      expect(result.total).toBeGreaterThanOrEqual(3); // seed admin + 2 new
      expect(result.rows.length).toBeGreaterThanOrEqual(3);
    });

    it('respects page size', () => {
      userService.createUser('ps1@example.com', 'password123', ['MONITOR']);
      userService.createUser('ps2@example.com', 'password123', ['MONITOR']);
      const result = userService.getUsers(1, 1);
      expect(result.rows).toHaveLength(1);
      expect(result.total).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getUser', () => {
    it('throws for non-existent user', () => {
      expect(() => userService.getUser(9999)).toThrow(/User not found/);
    });
  });
});
