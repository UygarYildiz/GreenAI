import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '../config/database';
import { logger } from '../utils/logger';
import { AIResponse, AIConfig, PromptTemplate } from '../types/ai';

export class AIService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  /**
   * Forum sorusuna AI cevabı oluştur
   */
  async generateResponse(
    topicId: string,
    question: string,
    category: string,
    context?: any
  ): Promise<AIResponse | null> {
    try {
      // Kategori AI konfigürasyonunu kontrol et
      const config = await this.getAIConfig(category);
      if (!config?.aiEnabled) {
        return null;
      }

      // Prompt oluştur
      const prompt = this.buildPrompt(question, category, context);
      
      // Rate limiting kontrolü
      const canProceed = await this.checkRateLimit(topicId);
      if (!canProceed) {
        throw new Error('Rate limit exceeded');
      }

      // Gemini API çağrısı
      const startTime = Date.now();
      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: config.temperature || 0.7,
          maxOutputTokens: config.maxTokens || 1000,
          topP: 0.8,
          topK: 40,
        },
      });

      const processingTime = Date.now() - startTime;
      const response = result.response;
      const responseText = response.text();

      // Güven skoru hesapla (basit heuristic)
      const confidenceScore = this.calculateConfidenceScore(
        responseText,
        question,
        category
      );

      // Threshold kontrolü
      if (confidenceScore < config.confidenceThreshold) {
        logger.warn(`AI response confidence too low: ${confidenceScore}`);
        return null;
      }

      // Content filtering
      const isContentSafe = await this.filterContent(responseText);
      if (!isContentSafe) {
        logger.warn('AI response filtered due to unsafe content');
        return null;
      }

      // Veritabanına kaydet
      const aiResponse = await this.saveAIResponse({
        topicId,
        modelName: 'gemini-2.0-flash',
        promptText: prompt,
        responseText,
        confidenceScore,
        processingTimeMs: processingTime,
        tokensUsed: this.estimateTokens(prompt + responseText),
        costUsd: this.calculateCost(prompt, responseText),
      });

      return aiResponse;
    } catch (error) {
      logger.error('AI response generation failed:', error);
      throw error;
    }
  }

  /**
   * Kategori için AI konfigürasyonunu getir
   */
  private async getAIConfig(categorySlug: string): Promise<AIConfig | null> {
    const { data, error } = await supabase
      .from('ai_category_config')
      .select(`
        *,
        categories!inner(slug)
      `)
      .eq('categories.slug', categorySlug)
      .single();

    if (error) {
      logger.error('Failed to get AI config:', error);
      return null;
    }

    return data;
  }

  /**
   * Prompt oluştur
   */
  private buildPrompt(
    question: string,
    category: string,
    context?: any
  ): string {
    const templates = this.getPromptTemplates();
    const template = templates[category] || templates.default;

    return template
      .replace('{question}', question)
      .replace('{category}', category)
      .replace('{context}', JSON.stringify(context || {}))
      .replace('{timestamp}', new Date().toISOString());
  }

  /**
   * Prompt şablonları
   */
  private getPromptTemplates(): Record<string, string> {
    return {
      'hastalık-zararlılar': `
        Sen deneyimli bir tarım uzmanısın. Türkiye'nin iklim koşulları ve tarım uygulamaları konusunda bilgilisin.
        
        Kullanıcı sorusu: {question}
        Kategori: {category}
        Tarih: {timestamp}
        
        Lütfen şu formatta yanıtla:
        
        ## 🔍 Analiz
        [Sorunun kısa analizi]
        
        ## 🩺 Olası Teşhis
        [En olası hastalık/zararlı ve belirtileri]
        
        ## 💊 Tedavi Önerileri
        1. [Organik çözümler]
        2. [Kimyasal çözümler (gerekirse)]
        3. [Kültürel önlemler]
        
        ## 🛡️ Önleme Yöntemleri
        [Gelecekte nasıl önlenebilir]
        
        ## ⚠️ Önemli Notlar
        - Bu öneriler genel bilgi amaçlıdır
        - Ciddi durumlarda tarım uzmanına danışın
        - Kimyasal kullanımında etiket talimatlarını takip edin
        
        Türkiye'nin iklim koşullarını ve yerel çeşitleri göz önünde bulundur.
      `,
      
      'gübre-beslenme': `
        Sen bir gübre ve bitki beslenmesi uzmanısın.
        
        Soru: {question}
        Kategori: {category}
        
        ## 🌱 Beslenme Analizi
        [Bitkinin beslenme ihtiyacı analizi]
        
        ## 🧪 Gübre Önerileri
        ### Organik Seçenekler:
        - [Organik gübre önerileri]
        
        ### Kimyasal Seçenekler:
        - [NPK ve diğer gübre önerileri]
        
        ## 📅 Uygulama Takvimi
        [Ne zaman, nasıl uygulanacağı]
        
        ## 💡 Ek Öneriler
        [Toprak analizi, pH, vs.]
        
        Türkiye'de bulunabilir ürünleri ve yerel koşulları dikkate al.
      `,
      
      default: `
        Sen deneyimli bir tarım uzmanısın. Türkiye'nin tarım koşullarını iyi biliyorsun.
        
        Soru: {question}
        Kategori: {category}
        
        Lütfen kapsamlı, pratik ve Türkiye koşullarına uygun bir yanıt ver.
        Yanıtını başlıklar halinde düzenle ve önemli noktaları vurgula.
        
        Yanıtının sonunda şu uyarıyı ekle:
        "⚠️ Bu bilgiler genel rehberlik amaçlıdır. Spesifik durumlar için tarım uzmanına danışmanız önerilir."
      `
    };
  }

  /**
   * Güven skoru hesapla
   */
  private calculateConfidenceScore(
    response: string,
    question: string,
    category: string
  ): number {
    let score = 0.5; // Base score

    // Yanıt uzunluğu kontrolü
    if (response.length > 200) score += 0.1;
    if (response.length > 500) score += 0.1;

    // Yapılandırılmış yanıt kontrolü
    if (response.includes('##') || response.includes('###')) score += 0.1;
    if (response.includes('1.') || response.includes('-')) score += 0.05;

    // Kategori relevansı
    const categoryKeywords = this.getCategoryKeywords(category);
    const matchedKeywords = categoryKeywords.filter(keyword =>
      response.toLowerCase().includes(keyword.toLowerCase())
    );
    score += (matchedKeywords.length / categoryKeywords.length) * 0.2;

    // Türkçe içerik kontrolü
    const turkishWords = ['türkiye', 'iklim', 'toprak', 'bölge', 'yerel'];
    const turkishMatches = turkishWords.filter(word =>
      response.toLowerCase().includes(word)
    );
    score += (turkishMatches.length / turkishWords.length) * 0.1;

    return Math.min(score, 1.0);
  }

  /**
   * Kategori anahtar kelimeleri
   */
  private getCategoryKeywords(category: string): string[] {
    const keywords: Record<string, string[]> = {
      'hastalık-zararlılar': ['hastalık', 'zararlı', 'böcek', 'mantar', 'virüs', 'tedavi'],
      'gübre-beslenme': ['gübre', 'beslenme', 'npk', 'organik', 'kompost', 'azot'],
      'sebze-yetiştirme': ['sebze', 'ekim', 'dikim', 'hasat', 'sulama'],
      'meyve-yetiştirme': ['meyve', 'ağaç', 'budama', 'aşılama', 'çiçeklenme'],
    };

    return keywords[category] || ['tarım', 'bitki', 'yetiştirme'];
  }

  /**
   * İçerik filtreleme
   */
  private async filterContent(content: string): Promise<boolean> {
    // Zararlı içerik kontrolü
    const harmfulPatterns = [
      /zararlı kimyasal/i,
      /yasadışı/i,
      /kaçak/i,
    ];

    for (const pattern of harmfulPatterns) {
      if (pattern.test(content)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Rate limiting kontrolü
   */
  private async checkRateLimit(topicId: string): Promise<boolean> {
    // Basit rate limiting implementasyonu
    // Redis ile daha gelişmiş bir sistem kurulabilir
    return true;
  }

  /**
   * Token sayısını tahmin et
   */
  private estimateTokens(text: string): number {
    // Basit tahmin: 1 token ≈ 4 karakter
    return Math.ceil(text.length / 4);
  }

  /**
   * Maliyet hesapla
   */
  private calculateCost(prompt: string, response: string): number {
    const inputTokens = this.estimateTokens(prompt);
    const outputTokens = this.estimateTokens(response);
    
    // Gemini 2.0 Flash pricing
    const inputCost = (inputTokens / 1000) * 0.000075;
    const outputCost = (outputTokens / 1000) * 0.0003;
    
    return inputCost + outputCost;
  }

  /**
   * AI yanıtını veritabanına kaydet
   */
  private async saveAIResponse(data: any): Promise<AIResponse> {
    const { data: response, error } = await supabase
      .from('ai_responses')
      .insert(data)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save AI response: ${error.message}`);
    }

    return response;
  }

  /**
   * AI yanıtına feedback ver
   */
  async submitFeedback(
    responseId: string,
    userId: string,
    feedbackType: 'helpful' | 'not_helpful' | 'incorrect',
    feedbackText?: string
  ): Promise<void> {
    const { error } = await supabase
      .from('ai_response_feedback')
      .upsert({
        ai_response_id: responseId,
        user_id: userId,
        feedback_type: feedbackType,
        feedback_text: feedbackText,
      });

    if (error) {
      throw new Error(`Failed to submit feedback: ${error.message}`);
    }
  }
}
