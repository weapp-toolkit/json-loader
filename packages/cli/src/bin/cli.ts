#!/usr/bin/env node

import WeappCli from '../index';

process.on('unhandledRejection', (err: Error) => {
  throw err;
});

const app = new WeappCli();
app.run().catch((err: Error) => {
  console.error(err.stack);
  process.exit(1);
});
