import type { Session, User } from 'better-auth';

declare global {
  namespace Express {
    interface Request {
      authSession: { session: Session; user: User } | null;
    }
  }
}
