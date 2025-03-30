import { WatcherRepository } from '@/db/repositories';

import type { Watcher } from '@/types/watchers';
import type { Request, Response } from 'express';

export async function create(req: Request, res: Response) {
  const { query, schedule, notifications } = req.body;

  const newWatcher: Watcher = {
    last_run: new Date().toISOString(),
    status: 'active',
    number_of_runs: 0,
    query,
    notifications,
    schedule,
  };

  const watcher = WatcherRepository.create(newWatcher);

  res.status(201).json(watcher);
}
