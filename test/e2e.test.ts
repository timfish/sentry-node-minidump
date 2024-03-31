import { expect, test, describe, afterAll } from 'vitest';
import { createBasicSentryServer } from './server';
import { ChildProcess, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { forEachEnvelopeItem } from '@sentry/utils';
import type { EventItem, Event, AttachmentItem } from '@sentry/types';

const EXPECTED_EVENT: Event = {
  event_id: expect.any(String),
  level: 'fatal',
  platform: 'native',
  release: '1.0.0',
  environment: 'production',
  contexts: {
    os: {
      name: expect.any(String),
      version: expect.any(String),
    },
    app: {
      app_start_time: expect.any(String),
    },
    culture: {
      locale: expect.any(String),
      timezone: expect.any(String),
    },
    device: {
      arch: expect.any(String),
      boot_time: expect.any(String),
      cpu_description: expect.any(String),
      processor_count: expect.any(Number),
    },
  },
};

describe('e2e', () => {
  const childProcesses: ChildProcess[] = [];

  afterAll(() => {
    for (const child of childProcesses) {
      child.kill();
    }
  });

  ['mjs', 'cjs'].forEach((ext) => {
    test(
      ext,
      async () => {
        expect.assertions(4);

        const [port, waitForEnvelope] = await createBasicSentryServer();
        const testPath = resolve(dirname(fileURLToPath(import.meta.url)), `example.${ext}`);

        const child = spawn(process.execPath, [testPath], {
          stdio: 'inherit',
          env: { SENTRY_PORT: `${port}` },
        });

        childProcesses.push(child);

        const envelope = await waitForEnvelope;

        forEachEnvelopeItem(envelope, (item, type) => {
          if (type === 'event') {
            const event = Array.isArray(item) ? (item as EventItem)[1] : undefined;
            expect(event).toMatchObject(EXPECTED_EVENT);
          }
          if (type === 'attachment') {
            const [headers, data] = item as AttachmentItem;

            expect(headers).toMatchObject({
              filename: 'minidump.dmp',
              attachment_type: 'event.minidump',
            });

            // Minidumps start with the magic number "MDMP"
            expect(data.slice(0, 4)).toEqual(Buffer.from([0x4d, 0x44, 0x4d, 0x50]));
            expect(data.length).toBeGreaterThan(20_000);
          }
        });
      },
      10_000,
    );
  });
});
