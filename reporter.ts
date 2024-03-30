import { createEventEnvelope, getEnvelopeEndpointWithUrlEncodedAuth } from '@sentry/core';
import type { Event, Envelope, SdkMetadata, DsnComponents } from '@sentry/types';
import { addItemToEnvelope, createAttachmentEnvelopeItem, uuid4 } from '@sentry/utils';
import { makeNodeTransport } from '@sentry/node';
import { startCrashReporterServer } from './bindings.cjs';
import { tmpdir } from 'node:os';
import { readFileSync } from 'node:fs';

// Read the config from stdin
const json = readFileSync(process.stdin.fd, 'utf-8');
const { dsn, metadata, tunnel, eventDefaults, socketName } = JSON.parse(json) as {
  dsn: DsnComponents;
  metadata: SdkMetadata;
  tunnel: string | undefined;
  eventDefaults: Event;
  socketName: string;
};

function createMinidumpEventEnvelope(dump: ArrayBuffer): Envelope {
  const event: Event = {
    event_id: uuid4(),
    level: 'fatal',
    platform: 'native',
    ...eventDefaults,
  };

  let env = createEventEnvelope(event, dsn, metadata, tunnel);

  env = addItemToEnvelope(
    env,
    createAttachmentEnvelopeItem({
      data: new Uint8Array(dump),
      filename: 'minidump.dmp',
      attachmentType: 'event.minidump',
    }),
  );

  return env;
}

startCrashReporterServer(socketName, tmpdir(), 3000, (err, dump) => {
  if (err) {
    console.error('Failed to start crash reporter server:', err);
    return;
  }

  const url = getEnvelopeEndpointWithUrlEncodedAuth(dsn, tunnel);
  const transport = makeNodeTransport({
    url,
    recordDroppedEvent: () => {
      //
    },
  });

  const envelope = createMinidumpEventEnvelope(dump);
  transport.send(envelope);
});
