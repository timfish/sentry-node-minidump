import { init } from '@sentry/node';
import { causeCrash } from './bindings.cjs';
import { nodeMinidumpIntegration } from './index.mjs';

init({
  dsn: 'https://1f30b300383f4904bf22a6672fe08141@o447951.ingest.us.sentry.io/4505526893805568',
  integrations: [nodeMinidumpIntegration()],
});

setTimeout(() => {
  causeCrash();
}, 5000);
