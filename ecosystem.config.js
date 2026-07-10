module.exports = {
  apps: [
    {
      name: "nexus-studio",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
      }
    },
    {
      name: "nexus-comfyui",
      script: "npm",
      args: "run comfyui"
    },
    {
      name: "nexus-lmrouter",
      script: "npx",
      args: "@lmrouter/cli start lmrouter.yaml"
    },
    {
      name: "nexus-director-api",
      script: "npx",
      args: "nx serve director-api",
      cwd: "./director-ai"
    }
  ]
};
