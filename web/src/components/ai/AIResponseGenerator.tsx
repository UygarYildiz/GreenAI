'use client';

import React, { useState } from 'react';
import { Bot, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAIResponse } from '@/hooks/useAIResponse';
import { AIResponse } from './AIResponse';

interface AIResponseGeneratorProps {
  topicId: string;
  category: string;
  isAIEnabled?: boolean;
  existingResponse?: any;
  onResponseGenerated?: (response: any) => void;
}

export function AIResponseGenerator({
  topicId,
  category,
  isAIEnabled = true,
  existingResponse,
  onResponseGenerated,
}: AIResponseGeneratorProps) {
  const [showResponse, setShowResponse] = useState(!!existingResponse);
  const {
    generateResponse,
    submitFeedback,
    isLoading,
    error,
    response,
  } = useAIResponse();

  const handleGenerateResponse = async () => {
    try {
      const aiResponse = await generateResponse(topicId);
      if (aiResponse) {
        setShowResponse(true);
        onResponseGenerated?.(aiResponse);
      }
    } catch (err) {
      console.error('Failed to generate AI response:', err);
    }
  };

  const handleRegenerateResponse = async () => {
    try {
      const aiResponse = await generateResponse(topicId, true); // force regenerate
      if (aiResponse) {
        onResponseGenerated?.(aiResponse);
      }
    } catch (err) {
      console.error('Failed to regenerate AI response:', err);
    }
  };

  const handleFeedback = async (responseId: string, feedbackType: string, feedbackText?: string) => {
    await submitFeedback(responseId, feedbackType, feedbackText);
  };

  // AI devre dışı ise hiçbir şey gösterme
  if (!isAIEnabled) {
    return null;
  }

  // Hata durumu
  if (error) {
    return (
      <Alert variant="destructive" className="my-4">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          AI yanıtı oluşturulurken bir hata oluştu: {error}
        </AlertDescription>
      </Alert>
    );
  }

  // Mevcut yanıt varsa göster
  if (showResponse && (response || existingResponse)) {
    return (
      <div className="my-6 space-y-4">
        <AIResponse
          response={response || existingResponse}
          onFeedback={handleFeedback}
          isLoading={isLoading}
        />
        
        {/* Regenerate Button */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRegenerateResponse}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Yeni yanıt oluştur
          </Button>
        </div>
      </div>
    );
  }

  // Loading durumu
  if (isLoading) {
    return (
      <div className="my-6">
        <AIResponse
          response={{} as any}
          isLoading={true}
        />
      </div>
    );
  }

  // AI yanıt oluşturma butonu
  return (
    <Card className="my-6 border-dashed border-2 border-blue-200 bg-blue-50/30">
      <CardContent className="flex flex-col items-center justify-center py-8 text-center">
        <div className="flex items-center gap-2 mb-4">
          <Bot className="h-8 w-8 text-blue-600" />
          <Sparkles className="h-6 w-6 text-blue-500" />
        </div>
        
        <h3 className="text-lg font-semibold text-blue-900 mb-2">
          AI Asistanından Yardım Al
        </h3>
        
        <p className="text-blue-700 mb-4 max-w-md">
          Bu soruya yapay zeka destekli bir yanıt oluşturabiliriz. 
          AI asistanımız tarım konularında size önerilerde bulunabilir.
        </p>
        
        <Button
          onClick={handleGenerateResponse}
          disabled={isLoading}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
        >
          <Bot className="h-4 w-4" />
          AI Yanıtı Oluştur
          <Sparkles className="h-4 w-4" />
        </Button>
        
        <p className="text-xs text-blue-600 mt-3">
          Bu özellik deneysel aşamadadır ve uzman görüşünün yerini tutmaz.
        </p>
      </CardContent>
    </Card>
  );
}

// AI Category Badge Component
export function AICategoryBadge({ category, isEnabled }: { category: string; isEnabled: boolean }) {
  if (!isEnabled) return null;

  return (
    <div className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
      <Bot className="h-3 w-3" />
      AI Destekli
    </div>
  );
}

// AI Status Indicator
export function AIStatusIndicator({ 
  status 
}: { 
  status: 'available' | 'generating' | 'unavailable' | 'error' 
}) {
  const statusConfig = {
    available: {
      color: 'text-green-600',
      bg: 'bg-green-100',
      text: 'AI Mevcut',
      icon: Bot,
    },
    generating: {
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      text: 'AI Çalışıyor',
      icon: RefreshCw,
      animate: true,
    },
    unavailable: {
      color: 'text-gray-600',
      bg: 'bg-gray-100',
      text: 'AI Mevcut Değil',
      icon: Bot,
    },
    error: {
      color: 'text-red-600',
      bg: 'bg-red-100',
      text: 'AI Hatası',
      icon: AlertCircle,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs ${config.bg} ${config.color}`}>
      <Icon className={`h-3 w-3 ${config.animate ? 'animate-spin' : ''}`} />
      {config.text}
    </div>
  );
}
