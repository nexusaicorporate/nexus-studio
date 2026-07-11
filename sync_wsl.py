import pexpect
import sys

def run_ssh_cmd(cmd):
    print(f"Running ssh cmd: {cmd}")
    child = pexpect.spawn(f'ssh -o StrictHostKeyChecking=no root@47.236.51.230 "{cmd}"', encoding='utf-8')
    child.logfile = sys.stdout
    idx = child.expect(['(?i)pass(word|phrase)', pexpect.EOF, pexpect.TIMEOUT], timeout=15)
    if idx == 0:
        child.sendline('ZMCw486!75276')
        child.expect(pexpect.EOF, timeout=120)
    print("Done ssh cmd")

def scp_file(local_path, remote_path):
    print(f"Syncing {local_path}...")
    child = pexpect.spawn(f'scp -o StrictHostKeyChecking=no {local_path} root@47.236.51.230:{remote_path}', encoding='utf-8')
    child.logfile = sys.stdout
    idx = child.expect(['(?i)pass(word|phrase)', pexpect.EOF, pexpect.TIMEOUT], timeout=15)
    if idx == 0:
        child.sendline('ZMCw486!75276')
        child.expect(pexpect.EOF, timeout=120)
    print("Done scp")

print("Creating directories...")
run_ssh_cmd('mkdir -p /srv/nexus-studio/app/api/comfy/start')

print("Copying files...")
scp_file('/mnt/c/Development/nexusaicorporate/nexus-studio/scripts/run-comfyui.mjs', '/srv/nexus-studio/scripts/run-comfyui.mjs')
scp_file('/mnt/c/Development/nexusaicorporate/nexus-studio/app/api/comfy/start/route.ts', '/srv/nexus-studio/app/api/comfy/start/route.ts')
scp_file('/mnt/c/Development/nexusaicorporate/nexus-studio/app/studio/workflow/page.tsx', '/srv/nexus-studio/app/studio/workflow/page.tsx')

print("Rebuilding on server...")
run_ssh_cmd('cd /srv/nexus-studio && npm run build')
print("Done.")
