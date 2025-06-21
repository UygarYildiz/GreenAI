export interface AIResponse {
  id: string;
  topicId: string;
  modelName: string;
  promptText: string;
  responseText: string;
  confidenceScore: number;
  processingTimeMs: number;
  tokensUsed: number;
  costUsd: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AIConfig {
  id: string;
  categoryId: string;
  aiEnabled: boolean;
  autoResponse: boolean;
  confidenceThreshold: number;
  maxTokens: number;
  temperature: number;
  createdAt: string;
}

export interface AIFeedback {
  id: string;
  aiResponseId: string;
  userId: string;
  feedbackType: 'helpful' | 'not_helpful' | 'incorrect';
  feedbackText?: string;
  createdAt: string;
}

export interface PromptTemplate {
  category: string;
  template: string;
  variables: string[];
}

export interface AIAnalytics {
  totalResponses: number;
  averageConfidence: number;
  averageProcessingTime: number;
  totalCost: number;
  feedbackStats: {
    helpful: number;
    notHelpful: number;
    incorrect: number;
  };
  categoryBreakdown: {
    category: string;
    responseCount: number;
    averageConfidence: number;
  }[];
}

export interface AIGenerationRequest {
  topicId: string;
  question: string;
  category: string;
  context?: {
    hasImages?: boolean;
    userLocation?: string;
    cropType?: string;
    soilType?: string;
    season?: string;
  };
}

export interface AIGenerationResponse {
  success: boolean;
  response?: AIResponse;
  error?: string;
  reason?: 'disabled' | 'rate_limit' | 'low_confidence' | 'content_filter';
}

export interface CustomModelConfig {
  modelName: string;
  version: string;
  endpoint: string;
  apiKey: string;
  maxTokens: number;
  temperature: number;
  isActive: boolean;
}

export interface RAGDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  source: string;
  embedding?: number[];
  metadata: {
    language: string;
    region?: string;
    cropType?: string;
    season?: string;
    reliability: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface VectorSearchResult {
  document: RAGDocument;
  similarity: number;
  relevanceScore: number;
}

export interface ModelTrainingData {
  id: string;
  question: string;
  expertAnswer: string;
  category: string;
  quality: 'high' | 'medium' | 'low';
  metadata: {
    region: string;
    language: string;
    cropType?: string;
    season?: string;
  };
  createdAt: string;
}

export interface FineTuningJob {
  id: string;
  modelName: string;
  baseModel: string;
  trainingDataSize: number;
  status: 'pending' | 'training' | 'completed' | 'failed';
  metrics?: {
    accuracy: number;
    loss: number;
    validationAccuracy: number;
  };
  createdAt: string;
  completedAt?: string;
}

export interface AIUsageStats {
  userId?: string;
  period: 'hour' | 'day' | 'month';
  requestCount: number;
  tokenUsage: number;
  cost: number;
  timestamp: string;
}

export interface ContentModerationResult {
  isApproved: boolean;
  confidence: number;
  flags: {
    harmfulContent: boolean;
    misinformation: boolean;
    offTopic: boolean;
    lowQuality: boolean;
  };
  reason?: string;
}

export interface AIServiceHealth {
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  errorRate: number;
  lastCheck: string;
  services: {
    geminiAPI: 'up' | 'down';
    database: 'up' | 'down';
    vectorDB: 'up' | 'down';
  };
}

// Enum types
export enum AIModelType {
  GEMINI_FLASH = 'gemini-2.0-flash',
  GEMINI_PRO = 'gemini-pro',
  CUSTOM_AGRICULTURE = 'custom-agriculture-v1',
  CUSTOM_TURKISH = 'custom-turkish-agriculture-v1'
}

export enum FeedbackType {
  HELPFUL = 'helpful',
  NOT_HELPFUL = 'not_helpful',
  INCORRECT = 'incorrect',
  SPAM = 'spam',
  INAPPROPRIATE = 'inappropriate'
}

export enum AICategory {
  DISEASE_PEST = 'hastalık-zararlılar',
  FERTILIZER = 'gübre-beslenme',
  VEGETABLE = 'sebze-yetiştirme',
  FRUIT = 'meyve-yetiştirme',
  GRAIN = 'tahıl-baklagiller',
  ORGANIC = 'organik-tarım',
  EQUIPMENT = 'ekipman-teknoloji'
}

// Request/Response interfaces for API endpoints
export interface GenerateAIResponseRequest {
  topicId: string;
  forceGenerate?: boolean;
}

export interface UpdateAIConfigRequest {
  aiEnabled: boolean;
  autoResponse?: boolean;
  confidenceThreshold?: number;
  maxTokens?: number;
  temperature?: number;
}

export interface SubmitFeedbackRequest {
  feedbackType: FeedbackType;
  feedbackText?: string;
}

export interface AIAnalyticsRequest {
  startDate?: string;
  endDate?: string;
  category?: string;
  groupBy?: 'day' | 'week' | 'month';
}

// Error types
export class AIServiceError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AIServiceError';
  }
}

export class RateLimitError extends AIServiceError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 'RATE_LIMIT_EXCEEDED', 429);
  }
}

export class ContentFilterError extends AIServiceError {
  constructor(message: string = 'Content filtered') {
    super(message, 'CONTENT_FILTERED', 400);
  }
}

export class LowConfidenceError extends AIServiceError {
  constructor(message: string = 'AI confidence too low') {
    super(message, 'LOW_CONFIDENCE', 422);
  }
}
