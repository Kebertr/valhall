import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from './authenticated-user';

export interface KeycloakTokenPayload {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  realm_access?: {
    roles?: string[];
  };
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const keycloakUrl = configService
      .getOrThrow<string>('KEYCLOAK_URL')
      .replace(/\/$/, '');
    const realm = configService.getOrThrow<string>('KEYCLOAK_REALM');
    const audience = configService.getOrThrow<string>('KEYCLOAK_CLIENT_ID');
    const issuer = `${keycloakUrl}/realms/${realm}`;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      audience,
      issuer,
      algorithms: ['RS256'],
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: `${issuer}/protocol/openid-connect/certs`,
      }),
    });
  }

  validate(payload: KeycloakTokenPayload): AuthenticatedUser {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token');
    }

    return {
      keycloakId: payload.sub,
      email: payload.email?.trim().toLowerCase(),
      emailVerified: payload.email_verified === true,
      roles: payload.realm_access?.roles ?? [],
    };
  }
}
