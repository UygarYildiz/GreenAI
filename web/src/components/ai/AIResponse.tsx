'use client';

import React, { useState } from 'react';
import { Bot, ThumbsUp, ThumbsDown, AlertTriangle, Clock, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';

interface AIResponseProps {
  response: {
    id: string;
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
  };
  onFeedback?: (responseId: string, feedbackType: string, feedbackText?: string) => void;
  isLoading?: boolean;
}

export function AIResponse({ response, onFeedback, isLoading = false }: AIResponseProps) {
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const { toast } = useToast();

  const handleFeedback = async (feedbackType: string) => {
    if (!onFeedback) return;

    setSubmittingFeedback(true);
    try {
      await onFeedback(response.id, feedbackType, feedbackText || undefined);
      toast({
        title: 'Geri bildirim gönderildi',
        description: 'Değerlendirmeniz için teşekkür ederiz!',
      });
      setShowFeedbackForm(false);
      setFeedbackText('');
    } catch (error) {
      toast({
        title: 'Hata',
        description: 'Geri bildirim gönderilemedi. Lütfen tekrar deneyin.',
        variant: 'destructive',
      });
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'bg-green-100 text-green-800';
    if (score >= 0.6) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getConfidenceText = (score: number) => {
    if (score >= 0.8) return 'Yüksek güven';
    if (score >= 0.6) return 'Orta güven';
    return 'Düşük güven';
  };

  if (isLoading) {
    return (
      <Card className="border-l-4 border-l-blue-500 bg-blue-50/50">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-600 animate-pulse" />
            <span className="font-medium text-blue-900">AI Asistanı yanıt hazırlıyor...</span>
            <Sparkles className="h-4 w-4 text-blue-500 animate-pulse" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-blue-200 rounded animate-pulse"></div>
            <div className="h-4 bg-blue-200 rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-blue-200 rounded animate-pulse w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-blue-500 bg-blue-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-blue-600" />
            <span className="font-medium text-blue-900">AI Asistanı</span>
            <Badge variant="secondary" className="text-xs">
              {response.modelName}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Clock className="h-4 w-4" />
            {formatDistanceToNow(new Date(response.createdAt), {
              addSuffix: true,
              locale: tr,
            })}
          </div>
        </div>
        
        <div className="flex items-center gap-2 mt-2">
          <Badge className={getConfidenceColor(response.confidenceScore)}>
            {getConfidenceText(response.confidenceScore)} ({Math.round(response.confidenceScore * 100)}%)
          </Badge>
          <span className="text-xs text-gray-500">
            {response.processingTimeMs}ms
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* AI Response Content */}
        <div className="prose prose-sm max-w-none">
          <div 
            className="text-gray-800 leading-relaxed"
            dangerouslySetInnerHTML={{ 
              __html: response.responseText.replace(/\n/g, '<br />') 
            }}
          />
        </div>

        {/* Warning Notice */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            <strong>Önemli:</strong> Bu yanıt yapay zeka tarafından oluşturulmuştur. 
            Spesifik durumlar için mutlaka tarım uzmanına danışın.
          </div>
        </div>

        {/* Feedback Section */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Bu yanıt size yardımcı oldu mu?
            </div>
            
            {response.feedback && (
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <ThumbsUp className="h-4 w-4" />
                  {response.feedback.helpful}
                </span>
                <span className="flex items-center gap-1">
                  <ThumbsDown className="h-4 w-4" />
                  {response.feedback.notHelpful}
                </span>
              </div>
            )}
          </div>

          {!response.feedback?.userFeedback && onFeedback && (
            <div className="flex items-center gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFeedback('helpful')}
                disabled={submittingFeedback}
                className="flex items-center gap-1"
              >
                <ThumbsUp className="h-4 w-4" />
                Yararlı
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleFeedback('not_helpful')}
                disabled={submittingFeedback}
                className="flex items-center gap-1"
              >
                <ThumbsDown className="h-4 w-4" />
                Yararlı değil
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFeedbackForm(!showFeedbackForm)}
                disabled={submittingFeedback}
                className="flex items-center gap-1"
              >
                <AlertTriangle className="h-4 w-4" />
                Yanlış bilgi
              </Button>
            </div>
          )}

          {response.feedback?.userFeedback && (
            <div className="mt-3 text-sm text-gray-600">
              Geri bildiriminiz: <strong>
                {response.feedback.userFeedback === 'helpful' && 'Yararlı'}
                {response.feedback.userFeedback === 'not_helpful' && 'Yararlı değil'}
                {response.feedback.userFeedback === 'incorrect' && 'Yanlış bilgi'}
              </strong>
            </div>
          )}

          {/* Feedback Form */}
          {showFeedbackForm && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Ek açıklama (opsiyonel):
              </label>
              <Textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Yanıtla ilgili düşüncelerinizi paylaşın..."
                rows={3}
                className="resize-none"
              />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => handleFeedback('incorrect')}
                  disabled={submittingFeedback}
                >
                  Gönder
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowFeedbackForm(false);
                    setFeedbackText('');
                  }}
                  disabled={submittingFeedback}
                >
                  İptal
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
