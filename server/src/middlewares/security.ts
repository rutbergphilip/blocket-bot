import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '@/integrations/logger';
import { RefreshTokenRepository } from '@/db/repositories';

const JWT_SECRET = process.env.JWT_SECRET || 'blocket-bot-secret-key';
const REFRESH_TOKEN_SECRET =
  process.env.REFRESH_TOKEN_SECRET || 'blocket-bot-refresh-secret-key';
const TOKEN_EXPIRY = '24h';
const REFRESH_TOKEN_EXPIRY = '30d';

export function generateToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId }, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch (error) {
    logger.warn({
      message: 'Invalid JWT token',
      error: error as Error,
    });
    return null;
  }
}

export function verifyRefreshToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET) as { userId: string };
  } catch (error) {
    logger.warn({
      message: 'Invalid refresh token',
      error: error as Error,
    });
    return null;
  }
}

export function authenticateJWT(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const token = req.cookies?.auth_token;

    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // @ts-ignore - Add user ID to request for use in route handlers
    req.userId = decoded.userId;
    next();
    return;
  }

  const token = authHeader.split(' ')[1];

  const decoded = verifyToken(token);

  if (!decoded) {
    const refreshToken = req.cookies?.refresh_token;
    if (refreshToken) {
      const refreshDecoded = verifyRefreshToken(refreshToken);
      if (refreshDecoded) {
        const newAccessToken = generateToken(refreshDecoded.userId);
        const newRefreshToken = generateRefreshToken(refreshDecoded.userId);

        const storedToken = RefreshTokenRepository.createRefreshToken(
          refreshDecoded.userId,
          newRefreshToken,
        );

        if (!storedToken) {
          res.status(500).json({ error: 'Failed to store refresh token' });
          return;
        }

        res.cookie('auth_token', newAccessToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 24 * 60 * 60 * 1000, // 24 hours
        });
        res.cookie('refresh_token', newRefreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        });

        // @ts-ignore - Add user ID to request for use in route handlers
        req.userId = refreshDecoded.userId;
        next();
        return;
      }
    }
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  // @ts-ignore - Add user ID to request for use in route handlers
  req.userId = decoded.userId;
  next();
}
