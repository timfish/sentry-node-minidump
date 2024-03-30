# sentry-node-minidump

If you use native Node modules, you may want to capture minidumps to Sentry if
they segfault. 

This package provides a Sentry integration for the Node SDK that captures and
sends minidumps when the process crashes.

```ts
import * as Sentry from '@sentry/node';
import { nodeMinidumpIntegration, causeCrash } from 'sentry-node-minidump';


Sentry.init({
  dsn: '__DSN__',
  integrations: [nodeMinidumpIntegration()],
});

setTimeout(() => {
  causeCrash();
}, 5_000);
```