"""Portable launcher contract. These tests do not install or start servers."""
import importlib.util
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

class LauncherTests(unittest.TestCase):
    def load(self):
        path = ROOT / 'scripts' / 'run.py'
        self.assertTrue(path.exists(), 'portable launcher has not been implemented')
        spec = importlib.util.spec_from_file_location('shieldpay_launcher', path)
        module = importlib.util.module_from_spec(spec)
        sys.modules[spec.name] = module
        spec.loader.exec_module(module)
        return module

    def test_local_launch_has_safe_defaults(self):
        m = self.load()
        args = m.parse_args([])
        self.assertEqual(args.host, '127.0.0.1')
        self.assertEqual(args.port, 8787)
        self.assertFalse(args.no_build)

    def test_build_plan_uses_real_production_bundle(self):
        m = self.load()
        steps = m.command_plan(m.parse_args([]), uv='uv', npm='npm')
        self.assertEqual(steps[0][0], ['uv', 'sync', '--frozen'])
        self.assertEqual(steps[1][0], ['npm', 'ci'])
        self.assertEqual(steps[2][0], ['npm', 'run', 'build'])
        self.assertIn('backend.app:app', steps[-1][0])
        self.assertIn('127.0.0.1', steps[-1][0])

    def test_check_does_not_start_server(self):
        m = self.load()
        steps = m.command_plan(m.parse_args(['--check']), uv='uv', npm='npm')
        self.assertFalse(any('uvicorn' in cmd for cmd, cwd in steps))
        self.assertTrue(any('pytest' in cmd for cmd, cwd in steps))
        self.assertTrue(any('test' in cmd for cmd, cwd in steps))

    def test_no_build_can_run_existing_bundle(self):
        m = self.load()
        steps = m.command_plan(m.parse_args(['--no-build']), uv='uv', npm='npm')
        self.assertFalse(any('npm' == cmd[0] for cmd, cwd in steps))
        self.assertIn('uvicorn', steps[-1][0])

if __name__ == '__main__':
    unittest.main()
