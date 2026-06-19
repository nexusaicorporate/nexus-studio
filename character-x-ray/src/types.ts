export interface CharacterSnapshot {
    brief: string;
    wardrobe: string;
    personality: string;
}

export interface CharacterImage {
    id?: string;
    dataUrl: string;
    base64: string;
    mimeType: string;
    mediaId?: string;
    snapshot?: CharacterSnapshot;
}

export interface Suggestion {
    text: string;
    reasoning: string;
}

export interface Feedback {
    id: string;
    category: 'wardrobe' | 'style' | 'color' | 'lore' | 'narrative';
    insight: string;
    suggestions: Suggestion[];
    answeredWith?: string[];
}

export interface DevelopmentUpdate {
    feedback: Feedback[];
}

export interface CharacterSummaries {
    wardrobe: string;
    personality: string;
}

export interface CharacterState {
    initialBackstory: string;
    imageHistory: CharacterImage[];
    currentImageIndex: number;
    activeFeedback: Feedback[];
    highlightSegments: string[];
    wardrobeSummary: string;
    personalitySummary: string;
    pendingImagePrompt: string | null;
}

// Reducer action types
export type CharacterAction =
    | { type: 'SET_FEEDBACK'; feedback: Feedback[] }
    | { type: 'ADD_IMAGE'; image: CharacterImage }
    | { type: 'NAV_IMAGE'; index: number }
    | { type: 'RESTORE_SNAPSHOT'; snapshot: CharacterSnapshot }
    | { type: 'UPDATE_BRIEF'; brief: string; highlights: string[] }
    | { type: 'REMOVE_FEEDBACK'; ids: string[] }
    | { type: 'ANSWER_FEEDBACK'; id: string; answer: string }
    | { type: 'RESET_ANSWERS' }
    | { type: 'REPLACE_FEEDBACK'; oldId: string; newFeedback: Feedback }
    | { type: 'SET_BACKSTORY'; backstory: string }
    | { type: 'CLEAR_HIGHLIGHTS' }
    | { type: 'SET_SUMMARIES'; wardrobe: string; personality: string }
    | { type: 'SET_IMAGE_PROMPT'; prompt: string }
    | { type: 'CLEAR_IMAGE_PROMPT' }
    | { type: 'RESET' };

// ---------------------------------------------------------------------------
// Actions interface — typed callbacks returned by useCharacterState
// ---------------------------------------------------------------------------

export interface CharacterActions {
    adoptAnswer: (feedbackId: string, answer: string) => void;
    resetAnswers: () => void;
    regenerateFeedback: (questionId: string) => Promise<void>;
    prepareImagePrompt: () => Promise<void>;
    setImagePrompt: (prompt: string) => void;
    confirmImageGeneration: () => Promise<void>;
    discardImagePrompt: () => void;
    saveCurrentImage: () => Promise<void>;
    setBackstory: (backstory: string) => void;
    clearHighlights: () => void;
    navImage: (index: number) => void;
    uploadImage: () => Promise<void>;
    startOver: () => Promise<void>;
    kickoff: () => Promise<void>;
    regenerateImage: () => Promise<void>;
}