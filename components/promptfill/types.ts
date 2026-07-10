export interface Template {
    id: string;
    name: { [key: string]: string };
    content: { [key: string]: string };
    imageUrl: string;
    imageUrls?: string[];
    author: string;
    tags?: string[];
    language?: string[];
}

export interface BankItem {
    label: { [key: string]: string };
    category: string;
    options: { [key: string]: string }[];
}

export interface BankMap {
    [key: string]: BankItem;
}

export interface Category {
    id: string;
    label: { [key: string]: string };
    color: string;
}

export interface CategoryMap {
    [key: string]: Category;
}

export interface GeneratedImage {
    id: string;
    url: string;
    width?: number;
    height?: number;
}

export interface ProviderConfig {
    id: string;
    name: string;
    apiKey: string;
    baseUrl?: string;
    endpoint?: string;
    models: string[];
    defaultModel: string;
    modelCapabilities?: { [model: string]: ModelCapabilities };
    sizeOptions: { [model: string]: string[] };
}

export interface ModelCapabilities {
    supportsReferenceImage: boolean;
    maxReferenceImages: number;
}

export interface ConfigResponse {
    providers: ProviderConfig[];
    activeProvider: string;
}

export interface ConfigRequest {
    provider: string;
    config: { [key: string]: any };
}

export interface GenerationParams {
    prompt: string;
    provider: string;
    model: string;
    size: string;
    images?: string[];
    parameters?: { [key: string]: any };
}

export interface HistoryRecord {
    id: string;
    params: GenerationParams;
    images: GeneratedImage[];
    timestamp: number;
    metadata?: { [key: string]: any };
}
