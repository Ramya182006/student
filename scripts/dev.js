const { spawn } = require('child_process');

const processes = [];

const run = (name, command, args, options = {}) => {
  const child = spawn(command, args, {
    stdio: 'inherit',
    shell: true,
    ...options,
  });

  processes.push(child);

  child.on('exit', (code) => {
    if (code !== 0) {
      console.error(`${name} stopped with exit code ${code}`);
    }
  });
};

const stopAll = () => {
  for (const child of processes) {
    if (!child.killed) child.kill();
  }
};

process.on('SIGINT', () => {
  stopAll();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopAll();
  process.exit(0);
});

run('backend', 'npm', ['start']);
run('frontend', 'npm', ['run', 'dev', '--', '--host', '127.0.0.1'], {
  cwd: 'frontend',
});
