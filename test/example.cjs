const { init } = require('@sentry/node');
const { causeCrash } = require('../bindings.cjs');
const { nodeMinidumpIntegration } = require('../index.cjs');

init({
  dsn: `http://1f30b300383f4904bf22a6672fe08141@localhost:${process.env.SENTRY_PORT}/4505526893805568`,
  integrations: [nodeMinidumpIntegration()],
  release: '1.0.0',
  environment: 'production',
});

setTimeout(() => {
  causeCrash();
}, 5000);
