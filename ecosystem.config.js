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
    }
  ]
};
