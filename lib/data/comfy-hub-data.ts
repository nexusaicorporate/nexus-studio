import workflowsData from "./comfyworkflows.json";

export interface HubWorkflow {
  name: string;
  shareId: string;
  title: string;
  description: string;
  mediaType: string;
  tags: string[];
  models: string[];
  logos: any[];
  usage: number;
  date: string;
  thumbnails: string[];
  username: string;
  creatorDisplayName: string;
  creatorAvatarUrl: string;
  isApp: boolean;
  thumbnailVariant?: string;
}

export const NEW_HUB_WORKFLOWS = workflowsData as HubWorkflow[];
