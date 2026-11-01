"""Audit the Git index before publishing; private working files stay local."""
from pathlib import PurePosixPath
import re
import subprocess

files=subprocess.check_output(['git','ls-files','-z']).decode().split('\0')
files=[p for p in files if p]
issues=[]
for name in files:
    parts=PurePosixPath(name).parts
    if any(p in {'data','node_modules','artifacts','publication-private'} for p in parts) or name in {'.env','public/bank.json','LOCAL_NOTES.md','IMPLEMENTATION.md','scripts/build_bank.py'}:
        issues.append((name,'private or generated path'))
    if PurePosixPath(name).suffix.lower() in {'.wav','.mp3','.mp4','.m4a','.webm','.ogg','.pem','.key','.zip'}:
        issues.append((name,'audio, archive or credential file'))
    data=subprocess.check_output(['git','show',':'+name])
    if len(data)>2_000_000:
        issues.append((name,'unexpectedly large file'))
    text=data.decode('utf-8-sig')
    if re.search(r'(?:github_pat_|gh[pousr]_|sk-(?:proj-)?)[A-Za-z0-9_\-]{20,}',text):
        issues.append((name,'possible live credential'))
    if re.search(r'(?:[A-Za-z]:[/\\]Users[/\\]|G:[/\\]资料|D:[/\\]Documents)',text):
        issues.append((name,'personal filesystem path'))
if issues:
    for name,reason in issues:
        print(f'FAIL {name}: {reason}')
    raise SystemExit(1)
print(f'PASS: {len(files)} staged files; private paths, audio, credentials and personal paths excluded.')
