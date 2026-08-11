export interface VietnameseAnalysis {
    id: string;
    text: string;
    analysisType: string;
    includeCulturalContext: boolean;
    includeTraditionalWisdom: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export type VietnameseAnalysisResponse = {
    originalText: string;
    wordSegmentation: string[];
    posTags: string[];
    sentimentScore: number;
    culturalElements: string[];
    traditionalWisdom: string[];
    respectLevel: string;
    regionalInfluence: string;
    businessContext: string;
    processingTimeMs: number;
    status: string;
};