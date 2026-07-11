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

run_ssh_cmd('pm2 restart all')
