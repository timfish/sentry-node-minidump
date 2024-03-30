import { init } from '@sentry/node';
import { causeCrash } from '../bindings.cjs';
import { nodeMinidumpIntegration } from '../index.mjs';

init({
  dsn: `http://1f30b300383f4904bf22a6672fe08141@localhost:${process.env.SENTRY_PORT}/4505526893805568`,
  integrations: [nodeMinidumpIntegration()],
  release: '1.0.0',
  environment: 'production',
});

setTimeout(() => {
  causeCrash();
}, 5000);
