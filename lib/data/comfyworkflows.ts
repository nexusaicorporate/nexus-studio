export interface HubWorkflow {
  id: string;
  name: string;
  category: "Image" | "Video" | "ControlNet" | "Flux" | "Utilities";
  desc: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  nodes: number;
  author: string;
  json: Record<string, any>;
}

export const HUB_WORKFLOWS: HubWorkflow[] = [
  {
    id: "t2i",
    name: "Text to Image (Standard SDXL)",
    category: "Image",
    difficulty: "Beginner",
    nodes: 7,
    author: "Nexusai",
    desc: "Standard prompt execution block linking CheckpointLoader, CLIPTextEncode, KSampler, EmptyLatentImage, VAEDecode, and SaveImage. Ideal for basic SDXL generation.",
    json: {
      "3": {
        "class_type": "KSampler",
        "inputs": {
          "cfg": 8,
          "denoise": 1,
          "latent_image": ["5", 0],
          "model": ["4", 0],
          "negative": ["7", 0],
          "positive": ["6", 0],
          "sampler_name": "euler",
          "scheduler": "normal",
          "seed": 8632194305,
          "steps": 20
        }
      },
      "4": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": {
          "ckpt_name": "dreamshaper_8.safetensors"
        }
      },
      "5": {
        "class_type": "EmptyLatentImage",
        "inputs": {
          "batch_size": 1,
          "height": 512,
          "width": 512
        }
      },
      "6": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "clip": ["4", 1],
          "text": "masterpiece, a beautiful cyberpunk model sitting in a coffee shop, neon glow, detailed skin textures"
        }
      },
      "7": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "clip": ["4", 1],
          "text": "bad anatomy, blurry, disfigured, watermark, text"
        }
      },
      "8": {
        "class_type": "VAEDecode",
        "inputs": {
          "samples": ["3", 0],
          "vae": ["4", 2]
        }
      },
      "9": {
        "class_type": "SaveImage",
        "inputs": {
          "filename_prefix": "ComfyUI_T2I",
          "images": ["8", 0]
        }
      }
    }
  },
  {
    id: "i2i",
    name: "Image to Image (VAE Encode)",
    category: "Image",
    difficulty: "Beginner",
    nodes: 8,
    author: "Nexusai",
    desc: "Loads an input image, encodes it to latent space, and executes a KSampler pass with custom denoise scaling (0.4 - 0.7) to transfer style or modify features.",
    json: {
      "3": {
        "class_type": "KSampler",
        "inputs": {
          "cfg": 8,
          "denoise": 0.55,
          "latent_image": ["12", 0],
          "model": ["4", 0],
          "negative": ["7", 0],
          "positive": ["6", 0],
          "sampler_name": "euler",
          "scheduler": "normal",
          "seed": 218764093,
          "steps": 20
        }
      },
      "4": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": {
          "ckpt_name": "dreamshaper_8.safetensors"
        }
      },
      "6": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "clip": ["4", 1],
          "text": "portrait photo of a woman with red hair, soft lighting, 8k resolution"
        }
      },
      "7": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "clip": ["4", 1],
          "text": "deformed, blurry, watermark"
        }
      },
      "10": {
        "class_type": "LoadImage",
        "inputs": {
          "image": "reference_portrait.jpg"
        }
      },
      "12": {
        "class_type": "VAEEncode",
        "inputs": {
          "pixels": ["10", 0],
          "vae": ["4", 2]
        }
      },
      "8": {
        "class_type": "VAEDecode",
        "inputs": {
          "samples": ["3", 0],
          "vae": ["4", 2]
        }
      },
      "9": {
        "class_type": "SaveImage",
        "inputs": {
          "filename_prefix": "ComfyUI_I2I",
          "images": ["8", 0]
        }
      }
    }
  },
  {
    id: "flux_dev",
    name: "Flux.1 Dev Generation",
    category: "Flux",
    difficulty: "Intermediate",
    nodes: 8,
    author: "BlackForestLabs",
    desc: "High quality image generation using Black Forest Labs FLUX.1 Dev. Utilizes dual CLIP and T5XXL encoders with flow matching samplers.",
    json: {
      "1": {
        "class_type": "UNETLoader",
        "inputs": {
          "unet_name": "flux1-dev.sft"
        }
      },
      "2": {
        "class_type": "DualCLIPLoader",
        "inputs": {
          "clip_name1": "clip_l.safetensors",
          "clip_name2": "t5xxl_fp16.safetensors",
          "type": "flux"
        }
      },
      "3": {
        "class_type": "VAELoader",
        "inputs": {
          "vae_name": "ae.safetensors"
        }
      },
      "4": {
        "class_type": "CLIPTextEncodeFlux",
        "inputs": {
          "clip": ["2", 0],
          "text": "a cute red panda wearing safety goggles working in an AI chemistry lab, cinematic style"
        }
      },
      "5": {
        "class_type": "EmptyLatentImage",
        "inputs": {
          "batch_size": 1,
          "height": 1024,
          "width": 1024
        }
      },
      "6": {
        "class_type": "FluxSampler",
        "inputs": {
          "model": ["1", 0],
          "conditioning": ["4", 0],
          "latent_image": ["5", 0],
          "steps": 25,
          "guidance": 3.5,
          "seed": 4983210493
        }
      },
      "7": {
        "class_type": "VAEDecode",
        "inputs": {
          "samples": ["6", 0],
          "vae": ["3", 0]
        }
      },
      "8": {
        "class_type": "SaveImage",
        "inputs": {
          "filename_prefix": "Flux_Dev",
          "images": ["7", 0]
        }
      }
    }
  },
  {
    id: "flux_schnell",
    name: "Flux.1 Schnell (4-Step Fast)",
    category: "Flux",
    difficulty: "Beginner",
    nodes: 8,
    author: "BlackForestLabs",
    desc: "Blazing fast FLUX.1 Schnell model workflow. Generates high-fidelity 1024x1024 images in just 4 sampling steps.",
    json: {
      "1": {
        "class_type": "UNETLoader",
        "inputs": {
          "unet_name": "flux1-schnell.sft"
        }
      },
      "2": {
        "class_type": "DualCLIPLoader",
        "inputs": {
          "clip_name1": "clip_l.safetensors",
          "clip_name2": "t5xxl_fp8.safetensors",
          "type": "flux"
        }
      },
      "3": {
        "class_type": "VAELoader",
        "inputs": {
          "vae_name": "ae.safetensors"
        }
      },
      "4": {
        "class_type": "CLIPTextEncodeFlux",
        "inputs": {
          "clip": ["2", 0],
          "text": "macro photo of morning dew on a spiderweb, bright sunrise bokeh"
        }
      },
      "5": {
        "class_type": "EmptyLatentImage",
        "inputs": {
          "batch_size": 1,
          "height": 1024,
          "width": 1024
        }
      },
      "6": {
        "class_type": "FluxSampler",
        "inputs": {
          "model": ["1", 0],
          "conditioning": ["4", 0],
          "latent_image": ["5", 0],
          "steps": 4,
          "guidance": 1.0,
          "seed": 9812739218
        }
      },
      "7": {
        "class_type": "VAEDecode",
        "inputs": {
          "samples": ["6", 0],
          "vae": ["3", 0]
        }
      },
      "8": {
        "class_type": "SaveImage",
        "inputs": {
          "filename_prefix": "Flux_Schnell",
          "images": ["7", 0]
        }
      }
    }
  },
  {
    id: "controlnet",
    name: "ControlNet Pose Transfer",
    category: "ControlNet",
    difficulty: "Intermediate",
    nodes: 10,
    author: "Nexusai",
    desc: "Uses ControlNet loaders and conditionings to guide structural composition or match human body skeletons from reference pose images.",
    json: {
      "3": {
        "class_type": "KSampler",
        "inputs": {
          "cfg": 8,
          "denoise": 1,
          "latent_image": ["5", 0],
          "model": ["4", 0],
          "negative": ["7", 0],
          "positive": ["15", 0],
          "sampler_name": "dpmpp_2m",
          "scheduler": "karras",
          "seed": 91823750,
          "steps": 25
        }
      },
      "4": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": {
          "ckpt_name": "dreamshaper_8.safetensors"
        }
      },
      "5": {
        "class_type": "EmptyLatentImage",
        "inputs": {
          "batch_size": 1,
          "height": 768,
          "width": 512
        }
      },
      "7": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "clip": ["4", 1],
          "text": "ugly, disfigured, cartoon, painting"
        }
      },
      "10": {
        "class_type": "LoadImage",
        "inputs": {
          "image": "openpose_skeleton.png"
        }
      },
      "14": {
        "class_type": "ControlNetLoader",
        "inputs": {
          "control_net_name": "control_v11p_sd15_openpose.pth"
        }
      },
      "15": {
        "class_type": "ControlNetApplySimple",
        "inputs": {
          "conditioning": ["16", 0],
          "control_net": ["14", 0],
          "image": ["10", 0],
          "strength": 0.9
        }
      },
      "16": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "clip": ["4", 1],
          "text": "full body fashion photo of a model wearing a summer dress"
        }
      },
      "8": {
        "class_type": "VAEDecode",
        "inputs": {
          "samples": ["3", 0],
          "vae": ["4", 2]
        }
      },
      "9": {
        "class_type": "SaveImage",
        "inputs": {
          "filename_prefix": "ComfyUI_ControlNet",
          "images": ["8", 0]
        }
      }
    }
  },
  {
    id: "animatediff",
    name: "AnimateDiff Video Generation",
    category: "Video",
    difficulty: "Advanced",
    nodes: 9,
    author: "Kosinkadink",
    desc: "Uses the AnimateDiff model loader and motion modules to turn latent images into smooth, repeating video sequences and animations.",
    json: {
      "1": {
        "class_type": "ADE_AnimateDiffLoaderWithContext",
        "inputs": {
          "model": ["2", 0],
          "model_name": "v3_sd15_mm.ckpt"
        }
      },
      "2": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": {
          "ckpt_name": "realisticVisionV60_v60VAE.safetensors"
        }
      },
      "3": {
        "class_type": "EmptyLatentImage",
        "inputs": {
          "batch_size": 16,
          "height": 512,
          "width": 512
        }
      },
      "4": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "clip": ["2", 1],
          "text": "cinematic shot of waves crashing on a sandy beach, time lapse, highly detailed"
        }
      },
      "5": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "clip": ["2", 1],
          "text": "blurry, low quality, static, deformed"
        }
      },
      "6": {
        "class_type": "KSampler",
        "inputs": {
          "model": ["1", 0],
          "positive": ["4", 0],
          "negative": ["5", 0],
          "latent_image": ["3", 0],
          "seed": 58321049,
          "steps": 20,
          "cfg": 7.5,
          "sampler_name": "euler_a",
          "scheduler": "normal",
          "denoise": 1.0
        }
      },
      "7": {
        "class_type": "VAEDecode",
        "inputs": {
          "samples": ["6", 0],
          "vae": ["2", 2]
        }
      },
      "8": {
        "class_type": "AnimateDiffCombine",
        "inputs": {
          "images": ["7", 0],
          "frame_rate": 8,
          "loop_count": 0,
          "format": "image/gif"
        }
      }
    }
  },
  {
    id: "facedetailer",
    name: "Face Detailer (Adetailer)",
    category: "Utilities",
    difficulty: "Intermediate",
    nodes: 10,
    author: "ltdrdata",
    desc: "Detects faces in generated images using YOLO and automatically applies a localized, high-resolution inpainting pass to fix blurry or distorted faces.",
    json: {
      "1": {
        "class_type": "FaceDetailer",
        "inputs": {
          "image": ["7", 0],
          "model": ["2", 0],
          "clip": ["2", 1],
          "vae": ["2", 2],
          "guide_size": 256,
          "guide_size_for": true,
          "max_size": 768,
          "seed": 1092837,
          "steps": 20,
          "cfg": 8.0,
          "sampler_name": "dpmpp_2d",
          "scheduler": "karras",
          "denoise": 0.4,
          "feather": 5,
          "noise_mask": true,
          "force_inpaint": true,
          "bbox_threshold": 0.5,
          "bbox_dilation": 10,
          "bbox_crop_factor": 3.0,
          "sam_model_opt": ["8", 0],
          "segm_detector_opt": ["9", 0]
        }
      },
      "2": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": {
          "ckpt_name": "dreamshaper_8.safetensors"
        }
      },
      "7": {
        "class_type": "LoadImage",
        "inputs": {
          "image": "photo_with_face.jpg"
        }
      },
      "8": {
        "class_type": "SAMLoader",
        "inputs": {
          "model_name": "sam_vit_b_01ec64.pth"
        }
      },
      "9": {
        "class_type": "UltralyticsDetectorProvider",
        "inputs": {
          "model_name": "face_yolov8n.pt"
        }
      },
      "10": {
        "class_type": "SaveImage",
        "inputs": {
          "filename_prefix": "Face_Detailer",
          "images": ["1", 0]
        }
      }
    }
  },
  {
    id: "ipadapter",
    name: "IPAdapter Style & Reference",
    category: "ControlNet",
    difficulty: "Advanced",
    nodes: 11,
    author: "cubiq",
    desc: "Injects styling cues, textures, or character faces from reference images directly into KSampler models without training LoRAs.",
    json: {
      "1": {
        "class_type": "IPAdapterApply",
        "inputs": {
          "ipadapter": ["2", 0],
          "clip_vision": ["3", 0],
          "image": ["4", 0],
          "model": ["5", 0],
          "weight": 0.75,
          "noise": 0.0
        }
      },
      "2": {
        "class_type": "IPAdapterLoader",
        "inputs": {
          "ipadapter_file": "ip-adapter_sd15.bin"
        }
      },
      "3": {
        "class_type": "CLIPVisionLoader",
        "inputs": {
          "clip_vision_file": "pytorch_model.bin"
        }
      },
      "4": {
        "class_type": "LoadImage",
        "inputs": {
          "image": "style_reference.jpg"
        }
      },
      "5": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": {
          "ckpt_name": "dreamshaper_8.safetensors"
        }
      },
      "6": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "clip": ["5", 1],
          "text": "a cute cat sitting on a throne, styled after the reference"
        }
      },
      "7": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "clip": ["5", 1],
          "text": "bad composition, dark, low quality"
        }
      },
      "8": {
        "class_type": "EmptyLatentImage",
        "inputs": {
          "batch_size": 1,
          "height": 512,
          "width": 512
        }
      },
      "9": {
        "class_type": "KSampler",
        "inputs": {
          "model": ["1", 0],
          "positive": ["6", 0],
          "negative": ["7", 0],
          "latent_image": ["8", 0],
          "seed": 73210489,
          "steps": 20,
          "cfg": 8.0,
          "sampler_name": "euler",
          "scheduler": "normal",
          "denoise": 1.0
        }
      },
      "10": {
        "class_type": "VAEDecode",
        "inputs": {
          "samples": ["9", 0],
          "vae": ["5", 2]
        }
      },
      "11": {
        "class_type": "SaveImage",
        "inputs": {
          "filename_prefix": "IPAdapter_Output",
          "images": ["10", 0]
        }
      }
    }
  },
  {
    id: "upscale",
    name: "Ultimate SD Upscale (4K)",
    category: "Utilities",
    difficulty: "Intermediate",
    nodes: 8,
    author: "ssitu",
    desc: "Uses model upscalers and tile diffusion to blow up generated images to 4K resolution while preserving micro-textures and introducing high resolution details.",
    json: {
      "1": {
        "class_type": "UltimateSDUpscale",
        "inputs": {
          "image": ["2", 0],
          "model": ["3", 0],
          "positive": ["4", 0],
          "negative": ["5", 0],
          "vae": ["3", 2],
          "upscale_by": 2.0,
          "upscale_model": ["6", 0],
          "tile_width": 512,
          "tile_height": 512,
          "mask_blur": 8,
          "padding": 32,
          "seam_fix_mode": "None"
        }
      },
      "2": {
        "class_type": "LoadImage",
        "inputs": {
          "image": "input_image.png"
        }
      },
      "3": {
        "class_type": "CheckpointLoaderSimple",
        "inputs": {
          "ckpt_name": "dreamshaper_8.safetensors"
        }
      },
      "4": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "clip": ["3", 1],
          "text": "photo of a cozy cottage in the woods, hyperrealistic, sharp focus, 8k"
        }
      },
      "5": {
        "class_type": "CLIPTextEncode",
        "inputs": {
          "clip": ["3", 1],
          "text": "blurry, artifacts, noise, painterly"
        }
      },
      "6": {
        "class_type": "UpscaleModelLoader",
        "inputs": {
          "model_name": "4x-UltraSharp.pth"
        }
      },
      "8": {
        "class_type": "SaveImage",
        "inputs": {
          "filename_prefix": "SD_Upscale",
          "images": ["1", 0]
        }
      }
    }
  }
];
