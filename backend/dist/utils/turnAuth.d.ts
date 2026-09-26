/**
 * Generates RFC 5389 time-limited HMAC credentials for TURN server authentication.
 * @param deviceId The ID of the device connecting to the TURN server.
 * @param secret The shared secret configured in the Coturn server.
 * @param ttlSeconds Time-to-live for the credentials in seconds (default: 86400 = 24 hours).
 * @returns Object containing the generated username and password.
 */
export declare function generateTurnCredentials(deviceId: string, secret: string, ttlSeconds?: number): {
    username: string;
    password: string;
    ttl: number;
};
//# sourceMappingURL=turnAuth.d.ts.map