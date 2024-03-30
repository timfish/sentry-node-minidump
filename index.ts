import { defineIntegration } from '@sentry/core';
import type { NodeClient } from '@sentry/node';
import type { Contexts, EventHint, Event } from '@sentry/types';
import { uuid4 } from '@sentry/utils';
import { spawn } from 'node:child_process';
import { hookCrashSignals, causeCrash as crash } from './bindings.cjs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

export function causeCrash(): void {
  crash();
}

/**
 * Gets contexts by calling all event processors. This shouldn't be called until
 * all integrations are setup
 */
async function getContexts(client: NodeClient): Promise<Contexts> {
  let event: Event | null = {};
  const eventHint: EventHint = {};

  for (const processor of client.getEventProcessors()) {
    if (event === null) break;
    event = await processor(event, eventHint);
  }

  return event?.contexts || {};
}

async function start(client: NodeClient) {
  const socketName = join(tmpdir(), uuid4());

  const eventDefaults: Event = {
    release: client.getOptions().release,
    environment: client.getOptions().environment,
    dist: client.getOptions().dist,
    contexts: await getContexts(client),
  };

  const variables = {
    dsn: client.getDsn(),
    metadata: client.getSdkMetadata(),
    tunnel: client.getOptions().tunnel,
    eventDefaults: eventDefaults,
    socketName: socketName,
  };

  const reporterPath = resolve(dirname(fileURLToPath(import.meta.url)), 'reporter.mjs');

  // Spawn node and pipe the config
  const child = spawn(process.execPath, [reporterPath]);
  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);
  child.stdin.write(JSON.stringify(variables));
  child.stdin.end(() => {
    hookCrashSignals(socketName, 3000, child.pid, 1000);
  });
}

export const nodeMinidumpIntegration = defineIntegration(() => {
  return {
    name: 'node-minidump',
    setupOnce() {
      // noop
    },
    setup(client: NodeClient) {
      // Wait until all other integrations are setup in the next tick
      setImmediate(() => start(client));
    },
  };
});
