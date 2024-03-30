import { createEventEnvelope, getEnvelopeEndpointWithUrlEncodedAuth } from '@sentry/core';
import type { Event, Envelope, SdkMetadata, DsnComponents } from '@sentry/types';
import { addItemToEnvelope, createAttachmentEnvelopeItem, uuid4 } from '@sentry/utils';
import { makeNodeTransport } from '@sentry/node';
import { startCrashReporterServer } from './bindings.cjs';
import { tmpdir } from 'node:os';
import { readFileSync } from 'node:fs';

// Read the config from stdin
const json = readFileSync(process.stdin.fd, 'utf-8');
const { dsn, sdkMetadata, tunnel, eventDefaults, socketName, debug } = JSON.parse(json) as {
  debug: boolean;
  dsn: DsnComponents;
  sdkMetadata: SdkMetadata;
  tunnel: string | undefined;
  eventDefaults: Event;
  socketName: string;
};

function log(...args: unknown[]) {
  if (debug) console.log('[sentry-node-minidump]:', ...args);
}

log('Reporter process starting');

function createMinidumpEventEnvelope(data: string | Uint8Array): Envelope {
  const event: Event = {
    event_id: uuid4(),
    level: 'fatal',
    platform: 'native',
    ...eventDefaults,
  };

  let env = createEventEnvelope(event, dsn, sdkMetadata, tunnel);

  env = addItemToEnvelope(
    env,
    createAttachmentEnvelopeItem({
      data,
      filename: 'minidump.dmp',
      attachmentType: 'event.minidump',
    }),
  );

  return env;
}

startCrashReporterServer(socketName, tmpdir(), 3000, (err: Error, dump: ArrayBuffer) => {
  if (err) {
    log('Failed to start crash reporter server:', err);
    return;
  }

  const url = getEnvelopeEndpointWithUrlEncodedAuth(dsn, tunnel);
  const transport = makeNodeTransport({
    url,
    recordDroppedEvent: () => {
      //
    },
  });

  const envelope = createMinidumpEventEnvelope(new Uint8Array(dump));

  log('Sending minidump envelope');

  transport.send(envelope).then(
    () => {
      log(`Envelope successfully sent to ${url}`);
    },
    (error) => {
      log(`Failed to send envelope to ${url}`, error);
    },
  );
});
