import pytest
import os
from agents.shared.sast_scanner import SASTScanner

def test_sast_scanner(tmp_path):
    scanner = SASTScanner(tmp_path)

    wasm_file = tmp_path / "test.wasm"
    wasm_file.write_text("dummy content")

    py_file = tmp_path / "test.py"
    py_file.write_text("import os\nos.system('ls')")

    py_file2 = tmp_path / "test2.py"
    py_file2.write_text("import subprocess\nsubprocess.call('ls')")

    issues = scanner.scan()
    assert len(issues) == 3
    assert any("test.wasm" in issue for issue in issues)
    assert any("test.py" in issue for issue in issues)
    assert any("test2.py" in issue for issue in issues)
