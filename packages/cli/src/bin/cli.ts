#!/usr/bin/env node

import ImwebMpCli from '../index';

process.on('unhandledRejection', (err: Error) => {
  throw err;
});

const app = new ImwebMpCli();
app.run().catch((err: Error) => {
  console.error(err.stack);
  process.exit(1);
});
