import { CharacterImage } from '../types';

/**
 * Parse a data URL into its base64 payload and MIME type.
 */
export function parseDataUrl(dataUrl: string): { base64: string; mimeType: string } {
    const mimeType = dataUrl.split(';')[0]?.split(':')[1] || 'image/jpeg';
    const base64 = dataUrl.split(',')[1] || '';
    return { base64, mimeType };
}

/**
 * Factory to create a CharacterImage from a data URL or raw components.
 */
export function createCharacterImage(
    dataUrl: string,
    mediaId: string,
    snapshot?: CharacterImage['snapshot']
): CharacterImage {
    const { base64, mimeType } = parseDataUrl(dataUrl);
    return { dataUrl, mediaId, base64, mimeType, snapshot };
}