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

def rsync_project():
    print("Syncing entire project...")
    cmd = 'rsync -avz -e "ssh -o StrictHostKeyChecking=no" --exclude node_modules --exclude .next --exclude .git --exclude src-tauri/target /mnt/c/Development/nexusaicorporate/nexus-studio/ root@47.236.51.230:/srv/nexus-studio/'
    child = pexpect.spawn(cmd, encoding='utf-8')
    child.logfile = sys.stdout
    idx = child.expect(['(?i)pass(word|phrase)', pexpect.EOF, pexpect.TIMEOUT], timeout=15)
    if idx == 0:
        child.sendline('ZMCw486!75276')
        child.expect(pexpect.EOF, timeout=300)
    print("Done rsync")

rsync_project()
run_ssh_cmd('pm2 list')
