import os
import re

class SASTScanner:
    def __init__(self, target_dir):
        self.target_dir = target_dir

    def scan(self):
        issues = []
        for root, _, files in os.walk(self.target_dir):
            for file in files:
                filepath = os.path.join(root, file)
                if file.endswith('.wasm'):
                    issues.append(f"Forbidden WebAssembly module detected: {filepath}")
                elif file.endswith('.py'):
                    with open(filepath, 'rb') as f:
                        content = f.read()
                        if re.search(br'os\.system', content):
                            issues.append(f"Forbidden OS system call detected in: {filepath}")
                        elif re.search(br'subprocess\.', content):
                            issues.append(f"Forbidden OS system call detected in: {filepath}")
        return issues
