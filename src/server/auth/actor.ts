import type { Permission } from "./permissions";

/**
 * The authenticated principal every admin service receives. Built only by the
 * session layer from database state — never from client input.
 */
export interface Actor {
  userId: string;
  sessionId: string;
  name: string;
  email: string;
  roleKey: string;
  roleName: string;
  /** Signed in with a temporary password: only the change-password screen is usable. */
  mustChangePassword: boolean;
  permissions: ReadonlySet<Permission>;
}

export class AuthorizationError extends Error {
  constructor(readonly permission: Permission) {
    super(`Missing permission: ${permission}`);
    this.name = "AuthorizationError";
  }
}

export function can(actor: Actor, permission: Permission): boolean {
  return actor.permissions.has(permission);
}

/** First line of every admin service function. */
export function authorize(actor: Actor, permission: Permission): void {
  if (!can(actor, permission)) throw new AuthorizationError(permission);
}
