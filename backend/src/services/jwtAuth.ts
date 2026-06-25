import jwt from 'jsonwebtoken';

const JWT_EXPIRES_IN = '30d';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured');
  }
  return secret;
}

export interface JwtPayload {
  sub: string;
  email: string;
}

export function signToken(telegramId: string, email: string): string {
  return jwt.sign({ sub: telegramId, email }, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  const payload = jwt.verify(token, getJwtSecret());
  if (typeof payload === 'string' || !payload.sub) {
    throw new Error('Invalid token');
  }
  return payload as JwtPayload;
}
