/**
 * Shape of `req` after the JWT strategy attaches the user payload.
 * Use this instead of leaving `@Request() req` untyped.
 *
 * Declared as a class (not interface) so TypeScript can emit
 * decorator metadata when `emitDecoratorMetadata` is enabled.
 */
export class AuthenticatedRequest {
  user: {
    id: string;
    role: string;
    provider_id?: string | null;
    jti?: string;
  };
}
