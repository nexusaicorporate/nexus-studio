import pexpect
import sys

def rsync_dir(folder):
    print(f"Syncing {folder}...")
    cmd = f'rsync -avz -e "ssh -o StrictHostKeyChecking=no" /mnt/c/Development/nexusaicorporate/nexus-studio/{folder}/ root@47.236.51.230:/srv/nexus-studio/{folder}/'
    child = pexpect.spawn(cmd, encoding='utf-8')
    child.logfile = sys.stdout
    idx = child.expect(['(?i)pass(word|phrase)', pexpect.EOF, pexpect.TIMEOUT], timeout=15)
    if idx == 0:
        child.sendline('ZMCw486!75276')
        child.expect(pexpect.EOF, timeout=120)
    print("Done rsync")

def run_ssh_cmd(cmd):
    print(f"Running ssh cmd: {cmd}")
    child = pexpect.spawn(f'ssh -o StrictHostKeyChecking=no root@47.236.51.230 "{cmd}"', encoding='utf-8')
    child.logfile = sys.stdout
    idx = child.expect(['(?i)pass(word|phrase)', pexpect.EOF, pexpect.TIMEOUT], timeout=15)
    if idx == 0:
        child.sendline('ZMCw486!75276')
        child.expect(pexpect.EOF, timeout=120)
    print("Done ssh cmd")

rsync_dir('app')
rsync_dir('components')
rsync_dir('lib')
rsync_dir('scripts')

print("Rebuilding...")
run_ssh_cmd('cd /srv/nexus-studio && npm run build')
run_ssh_cmd('pm2 restart all')
