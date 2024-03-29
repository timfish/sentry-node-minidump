# sentry-node-minidump

This package provides a Sentry integration for the Node SDK that captures and
sends minidumps when the process crashes.

```ts
import * as Sentry from '@sentry/node';
import { nodeMinidumpIntegration } from 'sentry-node-minidump';
import { raiseSegfault } from 'sadness-generator';

Sentry.init({
  dsn: '__DSN__',
  integrations: [nodeMinidumpIntegration()],
});

setTimeout(() => {
  causeCrash();
}, 5_000);
```