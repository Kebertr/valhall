const assert = require('node:assert/strict');
const test = require('node:test');
require('reflect-metadata');

const { Reflector } = require('@nestjs/core');
const { Role, ROLES_KEY } = require('../dist/roles.decorator');
const { RolesGuard } = require('../dist/roles.guard');

function contextFor(roles, requiredRoles) {
  const handler = () => undefined;
  class Controller {}

  if (requiredRoles) {
    Reflect.defineMetadata(ROLES_KEY, requiredRoles, handler);
  }

  return {
    getHandler: () => handler,
    getClass: () => Controller,
    switchToHttp: () => ({
      getRequest: () => ({ user: { roles } }),
    }),
  };
}

test('allows routes without required roles', () => {
  const guard = new RolesGuard(new Reflector());
  assert.equal(guard.canActivate(contextFor([])), true);
});

test('allows a user with any required role', () => {
  const guard = new RolesGuard(new Reflector());
  const context = contextFor(
    [Role.BONGMEISTER],
    [Role.ADMIN, Role.BONGMEISTER],
  );

  assert.equal(guard.canActivate(context), true);
});

test('throws when a user does not have a required role', () => {
  const guard = new RolesGuard(new Reflector());
  const context = contextFor([Role.ORDFORANDE], [Role.ADMIN]);

  assert.throws(
    () => guard.canActivate(context),
    /Access denied\. Required roles: ADMIN/,
  );
});

test('throws when an authenticated user is missing', () => {
  const guard = new RolesGuard(new Reflector());
  const context = contextFor([], [Role.ADMIN]);
  context.switchToHttp = () => ({ getRequest: () => ({}) });

  assert.throws(() => guard.canActivate(context), /User not authenticated/);
});
