import subprocess
import sys
import os
import signal

def main():
    print("[LDR Manager] Starting Node.js worker...")

    # Locate the worker.ts file
    worker_path = os.path.join(os.path.dirname(__file__), "worker.ts")

    # We use 'tsx' from the root or assume it's in the path
    # Assuming running from root: npx tsx agents/ldr/worker.ts
    cmd = ["npx", "tsx", worker_path]

    try:
        process = subprocess.Popen(cmd, stdout=sys.stdout, stderr=sys.stderr)
        process.wait()
    except KeyboardInterrupt:
        print("[LDR Manager] Stopping worker...")
        process.send_signal(signal.SIGTERM)
        process.wait()

if __name__ == "__main__":
    main()
