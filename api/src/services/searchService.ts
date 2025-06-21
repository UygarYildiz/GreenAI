import { supabase } from '../config/database';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

export interface SearchResult {
  id: string;
  type: 'topic' | 'reply' | 'user' | 'product';
  title: string;
  content: string;
  excerpt: string;
  url: string;
  score: number;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface SearchFilters {
  type?: 'topics' | 'replies' | 'users' | 'products' | 'all';
  categoryId?: string;
  authorId?: string;
  tags?: string[];
  dateRange?: {
    from: string;
    to: string;
  };
  sortBy?: 'relevance' | 'date' | 'popularity';
  includeContent?: boolean;
}

export interface SearchSuggestion {
  text: string;
  type: 'query' | 'tag' | 'category' | 'user';
  count: number;
}

export interface SearchAnalytics {
  query: string;
  resultCount: number;
  clickedResults: string[];
  userId?: string;
  timestamp: Date;
  filters: SearchFilters;
}

export class SearchService {

  // ==================== MAIN SEARCH ====================

  /**
   * Ana arama fonksiyonu
   */
  async search(
    query: string,
    filters: SearchFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<{
    results: SearchResult[];
    total: number;
    suggestions: SearchSuggestion[];
    facets: Record<string, any>;
    analytics: SearchAnalytics;
  }> {
    try {
      // Query'yi temizle ve normalize et
      const normalizedQuery = this.normalizeQuery(query);
      
      // Cache kontrolü
      const cacheKey = this.generateCacheKey(normalizedQuery, filters, page, limit);
      const cached = await redis.get(cacheKey);
      if (cached) {
        const result = JSON.parse(cached);
        await this.trackSearch(query, result.total, filters);
        return result;
      }

      // Arama tipine göre sonuçları getir
      const searchPromises = [];
      
      if (!filters.type || filters.type === 'all' || filters.type === 'topics') {
        searchPromises.push(this.searchTopics(normalizedQuery, filters));
      }
      
      if (!filters.type || filters.type === 'all' || filters.type === 'replies') {
        searchPromises.push(this.searchReplies(normalizedQuery, filters));
      }
      
      if (!filters.type || filters.type === 'all' || filters.type === 'users') {
        searchPromises.push(this.searchUsers(normalizedQuery, filters));
      }

      const searchResults = await Promise.all(searchPromises);
      
      // Sonuçları birleştir ve sırala
      let allResults: SearchResult[] = [];
      searchResults.forEach(results => {
        allResults = allResults.concat(results);
      });

      // Relevance score'a göre sırala
      allResults.sort((a, b) => b.score - a.score);

      // Sayfalama uygula
      const offset = (page - 1) * limit;
      const paginatedResults = allResults.slice(offset, offset + limit);

      // Öneriler ve facet'ları getir
      const [suggestions, facets] = await Promise.all([
        this.generateSuggestions(query, allResults),
        this.generateFacets(allResults, filters)
      ]);

      const result = {
        results: paginatedResults,
        total: allResults.length,
        suggestions,
        facets,
        analytics: await this.trackSearch(query, allResults.length, filters)
      };

      // Cache'e kaydet (5 dakika)
      await redis.setex(cacheKey, 300, JSON.stringify(result));

      return result;

    } catch (error) {
      logger.error('Search failed:', error);
      throw error;
    }
  }

  // ==================== SPECIFIC SEARCH METHODS ====================

  /**
   * Konu arama
   */
  private async searchTopics(query: string, filters: SearchFilters): Promise<SearchResult[]> {
    try {
      let searchQuery = supabase
        .from('topics')
        .select(`
          id,
          title,
          content,
          excerpt,
          slug,
          tags,
          view_count,
          reply_count,
          like_count,
          created_at,
          updated_at,
          author:author_id(id, username, full_name, avatar_url),
          category:category_id(id, name, slug, color)
        `)
        .eq('is_approved', true);

      // Full-text search
      if (query) {
        searchQuery = searchQuery.textSearch('title,content', query, {
          type: 'websearch',
          config: 'turkish'
        });
      }

      // Filtreleri uygula
      if (filters.categoryId) {
        searchQuery = searchQuery.eq('category_id', filters.categoryId);
      }
      
      if (filters.authorId) {
        searchQuery = searchQuery.eq('author_id', filters.authorId);
      }
      
      if (filters.tags && filters.tags.length > 0) {
        searchQuery = searchQuery.overlaps('tags', filters.tags);
      }
      
      if (filters.dateRange) {
        searchQuery = searchQuery
          .gte('created_at', filters.dateRange.from)
          .lte('created_at', filters.dateRange.to);
      }

      // Sıralama
      switch (filters.sortBy) {
        case 'date':
          searchQuery = searchQuery.order('created_at', { ascending: false });
          break;
        case 'popularity':
          searchQuery = searchQuery.order('view_count', { ascending: false });
          break;
        default:
          // Relevance sıralaması PostgreSQL tarafından yapılır
          break;
      }

      const { data: topics, error } = await searchQuery.limit(100);

      if (error) throw error;

      return topics?.map(topic => ({
        id: topic.id,
        type: 'topic' as const,
        title: topic.title,
        content: topic.content,
        excerpt: topic.excerpt || this.generateExcerpt(topic.content),
        url: `/forum/topics/${topic.slug}`,
        score: this.calculateTopicScore(topic, query),
        metadata: {
          author: topic.author,
          category: topic.category,
          tags: topic.tags,
          stats: {
            views: topic.view_count,
            replies: topic.reply_count,
            likes: topic.like_count
          }
        },
        createdAt: topic.created_at,
        updatedAt: topic.updated_at
      })) || [];

    } catch (error) {
      logger.error('Topic search failed:', error);
      return [];
    }
  }

  /**
   * Yorum arama
   */
  private async searchReplies(query: string, filters: SearchFilters): Promise<SearchResult[]> {
    try {
      let searchQuery = supabase
        .from('replies')
        .select(`
          id,
          content,
          like_count,
          is_solution,
          created_at,
          updated_at,
          author:author_id(id, username, full_name, avatar_url),
          topic:topic_id(id, title, slug, category_id)
        `)
        .eq('is_approved', true);

      // Full-text search
      if (query) {
        searchQuery = searchQuery.textSearch('content', query, {
          type: 'websearch',
          config: 'turkish'
        });
      }

      // Filtreleri uygula
      if (filters.authorId) {
        searchQuery = searchQuery.eq('author_id', filters.authorId);
      }
      
      if (filters.dateRange) {
        searchQuery = searchQuery
          .gte('created_at', filters.dateRange.from)
          .lte('created_at', filters.dateRange.to);
      }

      const { data: replies, error } = await searchQuery.limit(50);

      if (error) throw error;

      return replies?.map(reply => ({
        id: reply.id,
        type: 'reply' as const,
        title: `${reply.topic.title} - Yorum`,
        content: reply.content,
        excerpt: this.generateExcerpt(reply.content),
        url: `/forum/topics/${reply.topic.slug}#reply-${reply.id}`,
        score: this.calculateReplyScore(reply, query),
        metadata: {
          author: reply.author,
          topic: reply.topic,
          isSolution: reply.is_solution,
          stats: {
            likes: reply.like_count
          }
        },
        createdAt: reply.created_at,
        updatedAt: reply.updated_at
      })) || [];

    } catch (error) {
      logger.error('Reply search failed:', error);
      return [];
    }
  }

  /**
   * Kullanıcı arama
   */
  private async searchUsers(query: string, filters: SearchFilters): Promise<SearchResult[]> {
    try {
      let searchQuery = supabase
        .from('users')
        .select(`
          id,
          username,
          full_name,
          bio,
          avatar_url,
          user_type,
          is_verified,
          reputation_score,
          location,
          expertise_areas,
          created_at,
          last_login_at
        `)
        .eq('is_active', true)
        .eq('email_verified', true);

      // İsim ve kullanıcı adı araması
      if (query) {
        searchQuery = searchQuery.or(
          `username.ilike.%${query}%,full_name.ilike.%${query}%,bio.ilike.%${query}%`
        );
      }

      const { data: users, error } = await searchQuery.limit(20);

      if (error) throw error;

      return users?.map(user => ({
        id: user.id,
        type: 'user' as const,
        title: user.full_name || user.username,
        content: user.bio || '',
        excerpt: user.bio ? this.generateExcerpt(user.bio) : '',
        url: `/users/${user.username}`,
        score: this.calculateUserScore(user, query),
        metadata: {
          username: user.username,
          userType: user.user_type,
          isVerified: user.is_verified,
          reputationScore: user.reputation_score,
          location: user.location,
          expertiseAreas: user.expertise_areas,
          avatarUrl: user.avatar_url
        },
        createdAt: user.created_at,
        updatedAt: user.last_login_at
      })) || [];

    } catch (error) {
      logger.error('User search failed:', error);
      return [];
    }
  }

  // ==================== SUGGESTIONS ====================

  /**
   * Arama önerileri oluştur
   */
  private async generateSuggestions(query: string, results: SearchResult[]): Promise<SearchSuggestion[]> {
    try {
      const suggestions: SearchSuggestion[] = [];

      // Popüler arama terimleri
      const popularQueries = await this.getPopularQueries(query);
      suggestions.push(...popularQueries);

      // Tag önerileri
      const tagSuggestions = await this.getTagSuggestions(query);
      suggestions.push(...tagSuggestions);

      // Kategori önerileri
      const categorySuggestions = await this.getCategorySuggestions(query);
      suggestions.push(...categorySuggestions);

      // Kullanıcı önerileri
      const userSuggestions = await this.getUserSuggestions(query);
      suggestions.push(...userSuggestions);

      return suggestions.slice(0, 10); // En fazla 10 öneri

    } catch (error) {
      logger.error('Failed to generate suggestions:', error);
      return [];
    }
  }

  private async getPopularQueries(query: string): Promise<SearchSuggestion[]> {
    try {
      // Redis'ten popüler aramaları getir
      const popularQueries = await redis.zrevrange('popular_queries', 0, 9, 'WITHSCORES');
      
      const suggestions: SearchSuggestion[] = [];
      for (let i = 0; i < popularQueries.length; i += 2) {
        const text = popularQueries[i];
        const count = parseInt(popularQueries[i + 1]);
        
        if (text.toLowerCase().includes(query.toLowerCase())) {
          suggestions.push({
            text,
            type: 'query',
            count
          });
        }
      }
      
      return suggestions;
    } catch (error) {
      return [];
    }
  }

  private async getTagSuggestions(query: string): Promise<SearchSuggestion[]> {
    try {
      const { data: tags, error } = await supabase
        .rpc('get_popular_tags', { search_term: query, limit_count: 5 });

      if (error) throw error;

      return tags?.map((tag: any) => ({
        text: tag.tag,
        type: 'tag' as const,
        count: tag.count
      })) || [];

    } catch (error) {
      return [];
    }
  }

  private async getCategorySuggestions(query: string): Promise<SearchSuggestion[]> {
    try {
      const { data: categories, error } = await supabase
        .from('categories')
        .select('name, topic_count')
        .ilike('name', `%${query}%`)
        .eq('is_active', true)
        .order('topic_count', { ascending: false })
        .limit(3);

      if (error) throw error;

      return categories?.map(category => ({
        text: category.name,
        type: 'category' as const,
        count: category.topic_count
      })) || [];

    } catch (error) {
      return [];
    }
  }

  private async getUserSuggestions(query: string): Promise<SearchSuggestion[]> {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('username, full_name, reputation_score')
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .eq('is_active', true)
        .order('reputation_score', { ascending: false })
        .limit(3);

      if (error) throw error;

      return users?.map(user => ({
        text: user.full_name || user.username,
        type: 'user' as const,
        count: user.reputation_score
      })) || [];

    } catch (error) {
      return [];
    }
  }

  // ==================== FACETS ====================

  private async generateFacets(results: SearchResult[], filters: SearchFilters): Promise<Record<string, any>> {
    const facets: Record<string, any> = {};

    // Tip facet'ı
    facets.types = this.calculateTypeFacets(results);

    // Kategori facet'ı
    facets.categories = this.calculateCategoryFacets(results);

    // Yazar facet'ı
    facets.authors = this.calculateAuthorFacets(results);

    // Tarih facet'ı
    facets.dates = this.calculateDateFacets(results);

    return facets;
  }

  private calculateTypeFacets(results: SearchResult[]) {
    const typeCounts: Record<string, number> = {};
    results.forEach(result => {
      typeCounts[result.type] = (typeCounts[result.type] || 0) + 1;
    });
    return typeCounts;
  }

  private calculateCategoryFacets(results: SearchResult[]) {
    const categoryCounts: Record<string, number> = {};
    results.forEach(result => {
      if (result.metadata.category) {
        const categoryName = result.metadata.category.name;
        categoryCounts[categoryName] = (categoryCounts[categoryName] || 0) + 1;
      }
    });
    return categoryCounts;
  }

  private calculateAuthorFacets(results: SearchResult[]) {
    const authorCounts: Record<string, number> = {};
    results.forEach(result => {
      if (result.metadata.author) {
        const authorName = result.metadata.author.username;
        authorCounts[authorName] = (authorCounts[authorName] || 0) + 1;
      }
    });
    return authorCounts;
  }

  private calculateDateFacets(results: SearchResult[]) {
    const now = new Date();
    const facets = {
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      thisYear: 0
    };

    results.forEach(result => {
      const createdAt = new Date(result.createdAt);
      const diffTime = now.getTime() - createdAt.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 1) facets.today++;
      if (diffDays <= 7) facets.thisWeek++;
      if (diffDays <= 30) facets.thisMonth++;
      if (diffDays <= 365) facets.thisYear++;
    });

    return facets;
  }

  // ==================== SCORING ====================

  private calculateTopicScore(topic: any, query: string): number {
    let score = 0;

    // Title match (en yüksek puan)
    if (topic.title.toLowerCase().includes(query.toLowerCase())) {
      score += 100;
    }

    // Content match
    if (topic.content.toLowerCase().includes(query.toLowerCase())) {
      score += 50;
    }

    // Tag match
    if (topic.tags.some((tag: string) => tag.toLowerCase().includes(query.toLowerCase()))) {
      score += 30;
    }

    // Popularity boost
    score += Math.log(topic.view_count + 1) * 2;
    score += Math.log(topic.reply_count + 1) * 3;
    score += Math.log(topic.like_count + 1) * 5;

    // Freshness boost
    const daysSinceCreated = (Date.now() - new Date(topic.created_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceCreated < 7) {
      score += 10;
    }

    return score;
  }

  private calculateReplyScore(reply: any, query: string): number {
    let score = 0;

    // Content match
    if (reply.content.toLowerCase().includes(query.toLowerCase())) {
      score += 50;
    }

    // Solution boost
    if (reply.is_solution) {
      score += 50;
    }

    // Like boost
    score += Math.log(reply.like_count + 1) * 3;

    return score;
  }

  private calculateUserScore(user: any, query: string): number {
    let score = 0;

    // Name match
    if (user.username.toLowerCase().includes(query.toLowerCase())) {
      score += 100;
    }
    if (user.full_name && user.full_name.toLowerCase().includes(query.toLowerCase())) {
      score += 80;
    }

    // Bio match
    if (user.bio && user.bio.toLowerCase().includes(query.toLowerCase())) {
      score += 30;
    }

    // Reputation boost
    score += Math.log(user.reputation_score + 1) * 2;

    // Verified boost
    if (user.is_verified) {
      score += 20;
    }

    return score;
  }

  // ==================== ANALYTICS ====================

  private async trackSearch(query: string, resultCount: number, filters: SearchFilters): Promise<SearchAnalytics> {
    try {
      const analytics: SearchAnalytics = {
        query,
        resultCount,
        clickedResults: [],
        timestamp: new Date(),
        filters
      };

      // Popüler aramalara ekle
      await redis.zincrby('popular_queries', 1, query);

      // Arama istatistiklerini kaydet
      await redis.lpush('search_analytics', JSON.stringify(analytics));
      await redis.ltrim('search_analytics', 0, 9999); // Son 10000 aramayı tut

      return analytics;

    } catch (error) {
      logger.error('Failed to track search:', error);
      return {
        query,
        resultCount,
        clickedResults: [],
        timestamp: new Date(),
        filters
      };
    }
  }

  // ==================== HELPER METHODS ====================

  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '') // Özel karakterleri kaldır
      .replace(/\s+/g, ' '); // Çoklu boşlukları tek boşluk yap
  }

  private generateCacheKey(query: string, filters: SearchFilters, page: number, limit: number): string {
    const filterString = JSON.stringify(filters);
    const hash = require('crypto').createHash('md5').update(query + filterString + page + limit).digest('hex');
    return `search:${hash}`;
  }

  private generateExcerpt(content: string, maxLength: number = 150): string {
    const plainText = content.replace(/<[^>]*>/g, ''); // HTML taglarını kaldır
    return plainText.length > maxLength 
      ? plainText.substring(0, maxLength) + '...'
      : plainText;
  }
}
