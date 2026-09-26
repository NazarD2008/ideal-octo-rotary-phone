export declare function hashPassword(password: string): Promise<string>;
export declare function verifyPassword(password: string, hash: string): Promise<boolean>;
/** Seed the default admin user on first run.
 *  Default credentials:
 *    username: admin
 *    email: admin@liuma.com
 *    password: s20041021
 */
export declare function seedDefaultUser(): Promise<void>;
//# sourceMappingURL=seed.d.ts.map