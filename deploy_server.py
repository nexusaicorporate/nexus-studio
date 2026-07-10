import paramiko
import sys

host = '47.236.51.230'
user = 'root'
password = 'ZMCw486!75276'
port = 22

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    print(f"Connecting to {host}...")
    client.connect(hostname=host, port=port, username=user, password=password)
    
    stdin, stdout, stderr = client.exec_command('find / -name "nexus-studio" -type d 2>/dev/null | grep -v node_modules | head -n 1')
    project_dir = stdout.read().decode('utf-8').strip()
    
    if not project_dir:
        print("Could not find nexus-studio directory on the server")
        sys.exit(1)
        
    commands = [
        "git fetch origin main",
        "git reset --hard origin/main",
        "npm install",
        "npm run build",
        "pm2 restart all"
    ]
    
    for command in commands:
        full_command = f"cd {project_dir} && {command}"
        print(f"Executing: {full_command}")
        stdin, stdout, stderr = client.exec_command(full_command, get_pty=True)
        
        while not stdout.channel.exit_status_ready():
            if stdout.channel.recv_ready():
                print(stdout.channel.recv(1024).decode('utf-8', errors='ignore'), end='')
            
        exit_status = stdout.channel.recv_exit_status()
        while stdout.channel.recv_ready():
            print(stdout.channel.recv(1024).decode('utf-8', errors='ignore'), end='')
            
        if exit_status != 0:
            print(f"Command failed with exit status {exit_status}")
            sys.exit(1)
            
    print("Deployment completed successfully.")
    
finally:
    client.close()
