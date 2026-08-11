#!/usr/bin/env node

import net from 'node:net';
import { spawnSync } from 'node:child_process';

const portArg =
  process.argv[2] ||
  process.env.PORT ||
  (() => {
    console.error('Usage: node scripts/tooling/probe-port.mjs <port>');
    process.exit(2);
  })();

const port = Number(portArg);
if (!Number.isFinite(port) || port <= 0) {
  console.error(`Invalid port: ${portArg}`);
  process.exit(2);
}

function describeOwner(port) {
  const netstat = spawnSync('netstat', ['-ano'], { encoding: 'utf8' });
  const outputs = [];
  if (netstat.stdout) {
    const listeners = netstat.stdout
      .split(/\r?\n/)
      .filter((line) => line.includes(`:${port}`) && /LISTEN/i.test(line));
    if (listeners.length) {
      outputs.push('netstat -ano');
      listeners.forEach((line) => outputs.push(line.trim()));
    }
  }

  if (outputs.length === 0) {
    const ss = spawnSync('ss', ['-tulpn'], { encoding: 'utf8' });
    if (ss.stdout) {
      const listeners = ss.stdout.split(/\r?\n/).filter((line) => line.includes(`:${port}`));
      if (listeners.length) {
        outputs.push('ss -tulpn');
        listeners.forEach((line) => outputs.push(line.trim()));
      }
    }
  }

  if (outputs.length === 0) {
    return `Unable to identify port ${port} owner via netstat/ss.`;
  }
  return outputs.join('\n');
}

const socket = net.createConnection({ host: '127.0.0.1', port }, () => {
  socket.end();
  console.log(`Port ${port} is occupied by a listening process.`);
  console.log(describeOwner(port));
  process.exit(1);
});

socket.on('error', () => {
  console.log(`Port ${port} is free.`);
  process.exit(0);
});

socket.setTimeout(1000, () => {
  console.log(`Port ${port} probe timed out; assuming free.`);
  socket.destroy();
  process.exit(0);
});
