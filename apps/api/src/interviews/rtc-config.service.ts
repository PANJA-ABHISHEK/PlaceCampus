import { createHmac } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { RtcConfigResponse } from '@placecampus/shared-types';

const DEFAULT_STUN = 'stun:stun.l.google.com:19302';
const DEFAULT_TTL_SECONDS = 3600;

const list = (value?: string) =>
  (value ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);

/**
 * ICE servers for the in-app interview room.
 *
 * TURN uses the "TURN REST API" scheme supported by Coturn (`use-auth-secret` +
 * `static-auth-secret`): the browser gets a username of `<expiry>:<userId>` and a
 * password of base64(HMAC-SHA1(secret, username)). The shared secret never leaves
 * the server, and each credential stops working at its expiry time.
 *
 * Environment:
 *   STUN_URLS          comma-separated, default stun:stun.l.google.com:19302
 *   TURN_URLS          comma-separated, e.g. turn:turn.example.edu:3478,turns:turn.example.edu:5349
 *   TURN_SECRET        Coturn static-auth-secret
 *   TURN_TTL_SECONDS   credential lifetime, default 3600
 */
@Injectable()
export class RtcConfigService {
  private readonly logger = new Logger(RtcConfigService.name);
  private warned = false;

  constructor(private readonly config: ConfigService) {}

  forUser(userId: string, now = Date.now()): RtcConfigResponse {
    const stun = list(this.config.get<string>('STUN_URLS')) ;
    const iceServers: RtcConfigResponse['iceServers'] = [
      { urls: stun.length ? stun : [DEFAULT_STUN] },
    ];

    const turnUrls = list(this.config.get<string>('TURN_URLS'));
    const secret = this.config.get<string>('TURN_SECRET');
    if (!turnUrls.length || !secret) {
      if (!this.warned) {
        this.warned = true;
        this.logger.warn(
          'TURN_URLS / TURN_SECRET are not set: interview calls use STUN only and may fail on restrictive networks.',
        );
      }
      return { iceServers };
    }

    const ttl = Number(this.config.get('TURN_TTL_SECONDS')) || DEFAULT_TTL_SECONDS;
    const expiry = Math.floor(now / 1000) + ttl;
    const username = `${expiry}:${userId}`;
    const credential = createHmac('sha1', secret).update(username).digest('base64');
    iceServers.push({ urls: turnUrls, username, credential });
    return { iceServers, expiresAt: new Date(expiry * 1000).toISOString() };
  }
}
