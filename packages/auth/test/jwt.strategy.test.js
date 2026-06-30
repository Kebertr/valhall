require('reflect-metadata');

const assert = require('node:assert/strict');
const test = require('node:test');
const { UnauthorizedException } = require('@nestjs/common');
const { ConfigService } = require('@nestjs/config');
const { JwtStrategy } = require('../dist');

function createStrategy() {
  return new JwtStrategy(
    new ConfigService({
      KEYCLOAK_URL: 'https://auth.example.test/',
      KEYCLOAK_REALM: 'valhall',
      KEYCLOAK_CLIENT_ID: 'valhall-api',
    }),
  );
}

test('maps a Keycloak token to the shared authenticated user', () => {
  const user = createStrategy().validate({
    sub: 'keycloak-user-id',
    email: ' ERIK@EXAMPLE.COM ',
    email_verified: true,
    realm_access: { roles: ['admin'] },
  });

  assert.deepEqual(user, {
    keycloakId: 'keycloak-user-id',
    email: 'erik@example.com',
    emailVerified: true,
    roles: ['admin'],
  });
});

test('rejects a token without a subject', () => {
  assert.throws(() => createStrategy().validate({}), UnauthorizedException);
});
