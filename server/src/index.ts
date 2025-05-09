import 'tsconfig-paths/register';

import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import * as dotenv from 'dotenv';
dotenv.config();

// Extend the Express Request interface to include the user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        role: string;
      };
    }
  }
}

import routes from './routes';
import logger from './integrations/logger';
import { initializeDb } from './db';
import { SettingRepository } from './db/repositories';
import { initializeCronSystem } from './services/cron/initialize';
import { initEvents } from './events';

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: process.env.UI_ORIGIN || 'http://localhost:3000',
    credentials: true,
  }),
);
app.use(routes);
app.use((_, res) => {
  res.status(404).end();
});

const PORT = process.env.SERVER_PORT ? parseInt(process.env.SERVER_PORT) : 8080;
const server = app.listen(PORT, () => {
  logger.info(`Express server running on port ${PORT}`);

  // Initialize the database first
  initializeDb();

  // Initialize event listeners
  initEvents();
  logger.info('Event listeners initialized');

  // Initialize settings with default values
  try {
    SettingRepository.initializeSettings();
    logger.info('Settings initialized successfully');
  } catch (error) {
    logger.error({
      message: 'Failed to initialize settings',
      error: error as Error,
    });
  }

  // Initialize the cron system for watchers
  initializeCronSystem();
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received, shutting down...');
  server.close(() => {
    logger.info('Express server closed');
    process.exit(0);
  });
});
