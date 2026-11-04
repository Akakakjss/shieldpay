"""Build and run ShieldPay from any directory, without shell command interpolation."""
from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def parse_args(argv=None):
    parser = argparse.ArgumentParser(description='Build and run ShieldPay locally. Requires uv and Node.js LTS.')
    parser.add_argument('--host', default='127.0.0.1', help='Bind address (default: local machine only).')
    parser.add_argument('--port', type=int, default=8787)
    parser.add_argument('--no-build', action='store_true', help='Use an already-built frontend bundle.')
    parser.add_argument('--check', action='store_true', help='Install locked dependencies, test and build; do not start a server.')
    return parser.parse_args(argv)


def command_plan(args, uv='uv', npm='npm'):
    steps = [([uv, 'sync', '--frozen'], ROOT)]
    if not args.no_build or args.check:
        steps += [([npm, 'ci'], ROOT / 'frontend')]
    if args.check:
        steps += [([uv, 'run', 'pytest', '-q'], ROOT), ([npm, 'test', '--', '--run'], ROOT / 'frontend')]
    if not args.no_build or args.check:
        steps += [([npm, 'run', 'build'], ROOT / 'frontend')]
    if not args.check:
        steps += [([uv, 'run', 'uvicorn', 'backend.app:app', '--host', args.host, '--port', str(args.port)], ROOT)]
    return steps


def main(argv=None):
    args = parse_args(argv)
    uv = shutil.which('uv')
    npm = shutil.which('npm.cmd' if os.name == 'nt' else 'npm')
    if not uv or ((not args.no_build or args.check) and not npm):
        print('Install uv (https://docs.astral.sh/uv/) and Node.js LTS (https://nodejs.org/), then retry.', file=sys.stderr)
        return 2
    if not 1 <= args.port <= 65535:
        print('Port must be between 1 and 65535.', file=sys.stderr)
        return 2
    if args.no_build and not args.check and not (ROOT / 'frontend' / 'dist' / 'index.html').exists():
        print('No frontend bundle found. Run without --no-build first.', file=sys.stderr)
        return 2
    for command, cwd in command_plan(args, uv=uv, npm=npm or 'npm'):
        print(f'[{cwd.name}] ' + ' '.join(command), flush=True)
        if 'uvicorn' in command:
            print(f'Open http://{args.host}:{args.port} — press Ctrl+C to stop.', flush=True)
        # npm on Windows is a .cmd script. cmd.exe needs its command-line string,
        # not a list (which Python would quote twice around paths with spaces).
        windows_cmd = os.name == 'nt' and command[0].lower().endswith(('.cmd', '.bat'))
        result = subprocess.run(subprocess.list2cmdline(command) if windows_cmd else command, cwd=cwd, shell=windows_cmd, check=False)
        if result.returncode:
            return result.returncode
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print('\nShieldPay stopped.')
        raise SystemExit(130)
