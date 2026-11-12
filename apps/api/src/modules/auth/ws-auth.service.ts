import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import jwksClient, { JwksClient, SigningKey } from 'jwks-rsa';
import type { AuthUser } from './current-user.decorator';

/**
 * Token verifier used by non-HTTP entrypoints (e.g. WebSocket gateway) that
 * cannot go through the passport HTTP strategy. Mirrors JwtStrategy's
 * validation rules: Keycloak issuer, audience (aud + azp), RS256 signature
 * fetched from JWKS.
 */
@Injectable()
export class WsAuthService {
  private readonly logger = new Logger(WsAuthService.name);
  private readonly issuer: string;
  private readonly expectedAudience: string;
  private readonly allowedAzp: string[];
  private readonly jwks: JwksClient;

  constructor(configService: ConfigService) {
    const supabaseJwksUrl = configService.get<string>('SUPABASE_JWKS_URL');
    const supabaseUrl = configService.get<string>('SUPABASE_URL');
    const isSupabase = !!supabaseJwksUrl;

    const keycloakUrl = configService.get<string>('KEYCLOAK_URL', 'http://localhost:8080');
    const realm = configService.get<string>('KEYCLOAK_REALM', 'haip');
    this.issuer = isSupabase ? `${supabaseUrl}/auth/v1` : `${keycloakUrl}/realms/${realm}`;
    this.expectedAudience = isSupabase
      ? ''
      : configService.get<string>('KEYCLOAK_AUDIENCE') ||
        configService.get<string>('KEYCLOAK_CLIENT_ID', 'haip-api');
    // Same allow-list as JwtStrategy -- the two verifiers must agree on who
    // may call, or a caller works over HTTP and dies on the socket.
    this.allowedAzp = isSupabase
      ? []
      : (configService.get<string>('KEYCLOAK_ALLOWED_AZP') || this.expectedAudience)
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
    this.jwks = jwksClient({
      jwksUri: supabaseJwksUrl || `${this.issuer}/protocol/openid-connect/certs`,
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 10,
    });
  }

  /**
   * Verify a bearer token and return the extracted AuthUser.
   * Throws on invalid signature, issuer, audience, or expiration.
   */
  async verify(token: string): Promise<AuthUser> {
    const payload = await new Promise<any>((resolve, reject) => {
      const verifyOptions: jwt.VerifyOptions = {
        algorithms: ['RS256', 'ES256'],
      };
      if (this.expectedAudience) {
        verifyOptions.audience = this.expectedAudience;
      }
      if (this.issuer && !this.issuer.includes('supabase.co')) {
        verifyOptions.issuer = this.issuer;
      }

      jwt.verify(
        token,
        (header, cb) => {
          if (!header.kid) {
            cb(new Error('Token has no kid'));
            return;
          }
          this.jwks.getSigningKey(header.kid, (err: Error | null, key?: SigningKey) => {
            if (err || !key) {
              cb(err ?? new Error('Signing key not found'));
              return;
            }
            cb(null, key.getPublicKey());
          });
        },
        verifyOptions,
        (err, decoded) => {
          if (err) reject(err);
          else resolve(decoded);
        },
      );
    });

    if (this.allowedAzp.length > 0 && payload.azp && !this.allowedAzp.includes(payload.azp)) {
      throw new Error('Invalid token audience (azp mismatch)');
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
