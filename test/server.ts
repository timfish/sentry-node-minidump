import type { Envelope } from '@sentry/types';
import { parseEnvelope } from '@sentry/utils';
import express from 'express';
import type { AddressInfo } from 'node:net';

/**
 * Creates a basic Sentry server that accepts POST to the envelope endpoint
 *
 * This does no checks on the envelope, it just calls the callback if it managed to parse an envelope from the raw POST
 * body data.
 */
export function createBasicSentryServer(timeout = 10_000): Promise<[number, Promise<Envelope>]> {
  const app = express();
  app.use(express.raw({ type: () => true, inflate: true, limit: '100mb' }));

  const waitForEnvelope = new Promise<Envelope>((resolve, reject) => {
    const time = setTimeout(() => {
      reject(new Error('Timeout'));
    }, timeout);

    app.post('/api/:id/envelope/', (req, res) => {
      clearTimeout(time);

      try {
        const env = parseEnvelope(req.body as Buffer, new TextEncoder(), new TextDecoder());
        resolve(env);
      } catch (e) {
        // eslint-disable-next-line no-console
        reject(e);
      }

      res.status(200).send();
    });
  });

  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address() as AddressInfo;
      resolve([address.port, waitForEnvelope]);
    });
  });
}
