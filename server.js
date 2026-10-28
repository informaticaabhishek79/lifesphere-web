// Startup file for running the Next.js website as a plain Node.js process on shared hosting.
// Creates its own HTTP server and listens on the port we give it via process.env.PORT.
'use strict';

const { createServer } = require('http');
const next = require('next');

const port = Number(process.env.PORT) || 3000;
const app = next({ dev: false });
const handle = app.getRequestHandler();

app
  .prepare()
  .then(() => {
    createServer((req, res) => handle(req, res)).listen(port, () => {
      console.log(`LifeSphere web listening on port ${port}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start LifeSphere web:', err);
    process.exit(1);
  });