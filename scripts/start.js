#!/usr/bin/env node

const { spawn } = require('child_process');

// Check if REACT_APP_ENV is set
const env = process.env.REACT_APP_ENV;

let command;
let args;

if (env === 'development') {
  console.log('Starting with development environment...');
  command = 'npm';
  args = ['run', 'dev'];
} else if (env === 'production') {
  console.log('Starting with production environment...');
  command = 'npm';
  args = ['run', 'prod'];
} else if (env === 'local') {
  console.log('Starting with local environment...');
  command = 'npm';
  args = ['run', 'local'];
} else {
  console.log('No REACT_APP_ENV specified, defaulting to local...');
  command = 'npm';
  args = ['run', 'local'];
}

// Spawn the appropriate npm command
const child = spawn(command, args, { stdio: 'inherit', shell: true });

child.on('exit', (code) => {
  process.exit(code);
});