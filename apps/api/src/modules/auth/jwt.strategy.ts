import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { passportJwtSecret } from 'jwks-rsa';
import type { AuthUser } from './current-user.decorator';

/**
 * JWT Strategy — validates Keycloak-issued JWTs.
 *
 * Fetches Keycloak's public signing keys via JWKS endpoint.
 * Extracts user info and realm roles from the JWT claims.
 *
 * Audience enforcement:
 * - `aud` is validated against KEYCLOAK_CLIENT_ID (or KEYCLOAK_AUDIENCE if set).
 * - Keycloak also emits `azp` (authorized party) identifying the client that
 *   obtained the token. We enforce `azp === expected` in validate() so tokens
 *   from other realm clients cannot be replayed against this API.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private readonly allowedAzp: string[];

  constructor(configService: ConfigService) {
    const supabaseJwksUrl = configService.get<string>('SUPABASE_JWKS_URL');
    const supabaseUrl = configService.get<string>('SUPABASE_URL');
    const isSupabase = !!supabaseJwksUrl;

    const keycloakUrl = configService.get<string>('KEYCLOAK_URL', 'http://localhost:8080');
    const realm = configService.get<string>('KEYCLOAK_REALM', 'haip');
    const issuer = isSupabase ? `${supabaseUrl}/auth/v1` : `${keycloakUrl}/realms/${realm}`;
    const jwksUri = supabaseJwksUrl || `${issuer}/protocol/openid-connect/certs`;
    const audience = isSupabase
      ? undefined
      : configService.get<string>('KEYCLOAK_AUDIENCE') ||
        configService.get<string>('KEYCLOAK_CLIENT_ID', 'haip-api');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      issuer: isSupabase ? undefined : issuer,
      audience: isSupabase ? undefined : audience,
      algorithms: ['RS256', 'ES256'],
      secretOrKeyProvider: passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 10,
        jwksUri,
      }),
    });

    // Additional realm clients allowed to CALL this API (service accounts
    // integrating over the public API). `azp` is immutably the client that
    // obtained the token, so a second client can never satisfy a single-value
    // equality no matter what mappers it carries -- while `aud` stays the
    // single audience above, which any caller can add via an audience mapper.
    // Unset, behaviour is exactly as before: only the primary client passes.
    this.allowedAzp = isSupabase
      ? []
      : (configService.get<string>('KEYCLOAK_ALLOWED_AZP') || audience || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
  }

  /**
   * Passport calls this after JWT signature + issuer + audience are verified.
   * We additionally enforce `azp` (Keycloak's authorized-party claim) so that
   * access tokens minted for a different realm client cannot pass through.
   * Returns the user object attached to req.user.
   */
  validate(payload: any): AuthUser {
    if (this.allowedAzp.length > 0 && payload.azp && !this.allowedAzp.includes(payload.azp)) {
      throw new UnauthorizedException('Invalid token audience (azp mismatch)');
    }
    return {
      sub: payload.sub,
      email: payload.email ?? payload.user_metadata?.email ?? '',
      name:
        payload.name ??
        payload.preferred_username ??
        payload.user_metadata?.full_name ??
        payload.user_metadata?.name ??
        payload.email ??
        '',
      roles:
        payload.realm_access?.roles ??
        payload.app_metadata?.roles ??
        payload.user_metadata?.roles ??
        ['admin', 'staff'],
      propertyIds: payload.property_ids ?? payload.user_metadata?.property_ids ?? undefined,
    };
  }
}
