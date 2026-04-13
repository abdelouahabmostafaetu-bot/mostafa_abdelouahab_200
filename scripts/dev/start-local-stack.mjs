import { spawn } from "node:child_process";
import net from "node:net";
import process from "node:process";

const rootDir = process.cwd();
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const children = [];

function isPortOpen(port) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host: "127.0.0.1" });

    socket.once("connect", () => {
      socket.end();
      resolve(true);
    });

    socket.once("error", () => {
      resolve(false);
    });
  });
}

async function isHttpHealthy(url) {
  try {
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

function prefixStream(stream, label, target) {
  let buffer = "";

  stream.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      target.write(`[${label}] ${line}\n`);
    }
  });

  stream.on("end", () => {
    if (buffer) {
      target.write(`[${label}] ${buffer}\n`);
    }
  });
}

function runProcess(label, cwd, args) {
  const command = `${npmCommand} ${args.join(" ")}`;
  const child = spawn(command, {
    cwd,
    env: process.env,
    shell: true,
    stdio: ["inherit", "pipe", "pipe"],
  });

  prefixStream(child.stdout, label, process.stdout);
  prefixStream(child.stderr, label, process.stderr);
  children.push(child);
  return child;
}

function runShellProcess(label, cwd, command) {
  const child = spawn(command, {
    cwd,
    env: process.env,
    shell: true,
    stdio: ["inherit", "pipe", "pipe"],
  });

  prefixStream(child.stdout, label, process.stdout);
  prefixStream(child.stderr, label, process.stderr);
  children.push(child);
  return child;
}

let isShuttingDown = false;

function shutdown(exitCode = 0) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }

  setTimeout(() => {
    process.exit(exitCode);
  }, 300);
}

const managedChildren = [];

function trackChild(label, child, { required }) {
  managedChildren.push({ label, child, required });

  child.on("exit", (code, signal) => {
    if (isShuttingDown) {
      return;
    }

    if (signal) {
      if (!required) {
        process.stderr.write(`[${label}] exited after signal ${signal}; continuing without it\n`);
        return;
      }
      process.stderr.write(`[${label}] exited after signal ${signal}\n`);
      shutdown(1);
      return;
    }

    if (code !== 0) {
      if (!required) {
        process.stderr.write(`[${label}] exited with code ${code}; continuing without it\n`);
        return;
      }
      process.stderr.write(`[${label}] exited with code ${code}\n`);
      shutdown(code ?? 1);
      return;
    }

    if (required) {
      shutdown(0);
    }
  });
}

const site = runProcess("site", rootDir, ["run", "dev:site"]);
trackChild("site", site, { required: true });

const searchHealthy = await isHttpHealthy("http://127.0.0.1:8000/api/health");
if (searchHealthy) {
  process.stdout.write("[search-ai] port 8000 already in use, reusing the existing AI backend\n");
} else if (await isPortOpen(8000)) {
  process.stderr.write(
    "[search-ai] port 8000 is already in use, but http://127.0.0.1:8000/api/health is not healthy. Continuing without the embedded AI backend.\n",
  );
} else {
  const searchAi = runShellProcess(
    "search-ai",
    rootDir,
    "python -u public/tools/math-search/server.py",
  );
  trackChild("search-ai", searchAi, { required: false });
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => shutdown(0));
}
