const { spawn } = require('child_process');
const path = require('path');

module.exports = function runLocalModel(prompt) {
  return new Promise((resolve, reject) => {
    const python = spawn('python', [path.join(__dirname, 'run.py'), prompt]);

    let output = '';
    python.stdout.on('data', data => (output += data.toString()));
    python.stderr.on('data', data => console.error(data.toString()));
    python.on('close', code => {
      if (code !== 0) return reject(new Error('Model failed'));
      resolve(output.trim());
    });
  });
};
