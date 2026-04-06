const { execSync } = require('child_process');

function killPort(port) {
  try {
    const stdout = execSync(`netstat -ano | findstr :${port}`).toString();
    const lines = stdout.trim().split('\n');
    lines.forEach(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length > 4) {
        const pid = parts[parts.length - 1];
        console.log(`Killing PID ${pid} on port ${port}`);
        try { execSync(`taskkill /F /PID ${pid}`); } catch (e) {}
      }
    });
  } catch (err) {
    console.log(`Port ${port} is already clear.`);
  }
}

killPort(3000);
killPort(8000);
