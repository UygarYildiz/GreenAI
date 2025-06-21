'use client';

import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface AIResponse {
  id: string;
  topicId: string;
  responseText: string;
  confidenceScore: number;
  processingTimeMs: number;
  modelName: string;
  createdAt: string;
  feedback?: {
    helpful: number;
    notHelpful: number;
    userFeedback?: 'helpful' | 'not_helpful' | 'incorrect';
  };
}

interface UseAIResponseReturn {
  response: AIResponse | null;
  isLoading: boolean;
  error: string | null;
  generateResponse: (topicId: string, forceGenerate?: boolean) => Promise<AIResponse | null>;
  submitFeedback: (responseId: string, feedbackType: string, feedbackText?: string) => Promise<void>;
  clearError: () => void;
}

export function useAIResponse(): UseAIResponseReturn {
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const generateResponse = useCallback(async (
    topicId: string,
    forceGenerate: boolean = false
  ): Promise<AIResponse | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/ai/generate-response/${topicId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ forceGenerate }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'AI yanıtı oluşturulamadı');
      }

      if (!data.success) {
        if (data.reason === 'low_confidence_or_disabled') {
          setError('Bu kategori için AI yanıtı mevcut değil veya güven skoru düşük.');
          return null;
        }
        throw new Error(data.error || 'Bilinmeyen hata');
      }

      const aiResponse = data.response;
      setResponse(aiResponse);

      // Başarı bildirimi
      if (!data.cached) {
        toast({
          title: 'AI yanıtı oluşturuldu',
          description: `Güven skoru: %${Math.round(aiResponse.confidenceScore * 100)}`,
        });
      }

      return aiResponse;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata oluştu';
      setError(errorMessage);
      
      toast({
        title: 'Hata',
        description: errorMessage,
        variant: 'destructive',
      });

      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const submitFeedback = useCallback(async (
    responseId: string,
    feedbackType: string,
    feedbackText?: string
  ): Promise<void> => {
    try {
      const response = await fetch(`/api/ai/responses/${responseId}/feedback`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          feedbackType,
          feedbackText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Geri bildirim gönderilemedi');
      }

      if (!data.success) {
        throw new Error(data.error || 'Bilinmeyen hata');
      }

      // Response state'ini güncelle
      setResponse(prev => {
        if (!prev || prev.id !== responseId) return prev;
        
        return {
          ...prev,
          feedback: {
            ...prev.feedback,
            userFeedback: feedbackType as any,
            // Feedback sayılarını güncelle (gerçek değerler API'den gelecek)
            helpful: prev.feedback?.helpful || 0,
            notHelpful: prev.feedback?.notHelpful || 0,
          },
        };
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Geri bildirim gönderilemedi';
      
      toast({
        title: 'Hata',
        description: errorMessage,
        variant: 'destructive',
      });

      throw err;
    }
  }, [toast]);

  return {
    response,
    isLoading,
    error,
    generateResponse,
    submitFeedback,
    clearError,
  };
}

// AI konfigürasyonu için hook
export function useAIConfig() {
  const [configs, setConfigs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchConfigs = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/config/categories', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Konfigürasyonlar yüklenemedi');
      }

      setConfigs(data.configs || []);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateConfig = useCallback(async (
    categoryId: string,
    configData: any
  ) => {
    try {
      const response = await fetch(`/api/ai/config/categories/${categoryId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(configData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Konfigürasyon güncellenemedi');
      }

      // Configs listesini güncelle
      setConfigs(prev => 
        prev.map(config => 
          config.categoryId === categoryId 
            ? { ...config, ...data.config }
            : config
        )
      );

      toast({
        title: 'Başarılı',
        description: 'AI konfigürasyonu güncellendi',
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Güncelleme başarısız';
      
      toast({
        title: 'Hata',
        description: errorMessage,
        variant: 'destructive',
      });

      throw err;
    }
  }, [toast]);

  return {
    configs,
    isLoading,
    error,
    fetchConfigs,
    updateConfig,
  };
}

// AI analitikleri için hook
export function useAIAnalytics() {
  const [analytics, setAnalytics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (params?: {
    startDate?: string;
    endDate?: string;
    category?: string;
    groupBy?: 'day' | 'week' | 'month';
  }) => {
    setIsLoading(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams();
      if (params?.startDate) searchParams.set('startDate', params.startDate);
      if (params?.endDate) searchParams.set('endDate', params.endDate);
      if (params?.category) searchParams.set('category', params.category);
      if (params?.groupBy) searchParams.set('groupBy', params.groupBy);

      const response = await fetch(`/api/ai/analytics?${searchParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analitikler yüklenemedi');
      }

      setAnalytics(data.analytics);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bilinmeyen hata';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    analytics,
    isLoading,
    error,
    fetchAnalytics,
  };
}
