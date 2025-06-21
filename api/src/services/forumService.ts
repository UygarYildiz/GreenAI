import { supabase } from '../config/database';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';
import { SecurityService } from './securityService';
import {
  Category,
  Topic,
  Reply,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  CreateTopicRequest,
  UpdateTopicRequest,
  CreateReplyRequest,
  UpdateReplyRequest,
  TopicFilters,
  ReplyFilters,
  PaginationParams,
  PaginatedResponse,
  ForumStats,
  TopicSearchResult,
  ForumActivity
} from '../types/forum';

export class ForumService {

  // ==================== CATEGORY MANAGEMENT ====================

  /**
   * Tüm kategorileri getir (hiyerarşik yapıda)
   */
  async getCategories(): Promise<Category[]> {
    try {
      // Cache'den kontrol et
      const cacheKey = 'forum:categories';
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const { data: categories, error } = await supabase
        .from('categories')
        .select(`
          *,
          parent:parent_id(id, name, slug),
          children:categories!parent_id(id, name, slug, topic_count, reply_count)
        `)
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;

      const formattedCategories = this.formatCategories(categories);

      // Cache'e kaydet (1 saat)
      await redis.setex(cacheKey, 3600, JSON.stringify(formattedCategories));

      return formattedCategories;
    } catch (error) {
      logger.error('Failed to get categories:', error);
      throw error;
    }
  }

  /**
   * Kategori detayını getir
   */
  async getCategoryById(id: string): Promise<Category | null> {
    try {
      const { data: category, error } = await supabase
        .from('categories')
        .select(`
          *,
          parent:parent_id(id, name, slug),
          children:categories!parent_id(id, name, slug, topic_count, reply_count)
        `)
        .eq('id', id)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.formatCategory(category);
    } catch (error) {
      logger.error('Failed to get category by ID:', error);
      throw error;
    }
  }

  /**
   * Slug ile kategori getir
   */
  async getCategoryBySlug(slug: string): Promise<Category | null> {
    try {
      const { data: category, error } = await supabase
        .from('categories')
        .select(`
          *,
          parent:parent_id(id, name, slug),
          children:categories!parent_id(id, name, slug, topic_count, reply_count)
        `)
        .eq('slug', slug)
        .eq('is_active', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      return this.formatCategory(category);
    } catch (error) {
      logger.error('Failed to get category by slug:', error);
      throw error;
    }
  }

  /**
   * Yeni kategori oluştur
   */
  async createCategory(data: CreateCategoryRequest, userId: string): Promise<Category> {
    try {
      const slug = this.generateSlug(data.name);

      const { data: category, error } = await supabase
        .from('categories')
        .insert({
          name: data.name,
          slug,
          description: data.description,
          icon: data.icon,
          color: data.color,
          parent_id: data.parentId,
          sort_order: data.sortOrder || 0
        })
        .select()
        .single();

      if (error) throw error;

      // Cache'i temizle
      await redis.del('forum:categories');

      // Aktiviteyi logla
      await this.logForumActivity(userId, 'category_created', 'category', category.id, {
        categoryName: data.name
      });

      logger.info('Category created', { categoryId: category.id, name: data.name, userId });

      return this.formatCategory(category);
    } catch (error) {
      logger.error('Failed to create category:', error);
      throw error;
    }
  }

  // ==================== TOPIC MANAGEMENT ====================

  /**
   * Konuları getir (filtreleme ve sayfalama ile)
   */
  async getTopics(
    filters: TopicFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResponse<Topic>> {
    try {
      const { page = 1, limit = 20 } = pagination;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('topics')
        .select(`
          *,
          author:author_id(id, username, full_name, avatar_url, user_type, is_verified),
          category:category_id(id, name, slug, color),
          last_reply_user:last_reply_by(id, username, avatar_url),
          media_files:media_files(id, filename, file_type, thumbnail_path)
        `, { count: 'exact' })
        .eq('is_approved', true);

      // Filtreleri uygula
      if (filters.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }
      if (filters.authorId) {
        query = query.eq('author_id', filters.authorId);
      }
      if (filters.isPinned !== undefined) {
        query = query.eq('is_pinned', filters.isPinned);
      }
      if (filters.isLocked !== undefined) {
        query = query.eq('is_locked', filters.isLocked);
      }
      if (filters.isSolved !== undefined) {
        query = query.eq('is_solved', filters.isSolved);
      }
      if (filters.isFeatured !== undefined) {
        query = query.eq('is_featured', filters.isFeatured);
      }
      if (filters.tags && filters.tags.length > 0) {
        query = query.overlaps('tags', filters.tags);
      }
      if (filters.search) {
        query = query.textSearch('title,content', filters.search, {
          type: 'websearch',
          config: 'turkish'
        });
      }

      // Zaman aralığı filtresi
      if (filters.timeRange && filters.timeRange !== 'all') {
        const timeMap = {
          today: '1 day',
          week: '7 days',
          month: '30 days',
          year: '365 days'
        };
        const interval = timeMap[filters.timeRange];
        query = query.gte('created_at', `now() - interval '${interval}'`);
      }

      // Sıralama
      const sortBy = filters.sortBy || 'latest';
      switch (sortBy) {
        case 'latest':
          query = query.order('is_pinned', { ascending: false })
                      .order('last_activity_at', { ascending: false });
          break;
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'popular':
          query = query.order('view_count', { ascending: false });
          break;
        case 'most_replies':
          query = query.order('reply_count', { ascending: false });
          break;
        case 'most_likes':
          query = query.order('like_count', { ascending: false });
          break;
      }

      // Sayfalama
      query = query.range(offset, offset + limit - 1);

      const { data: topics, error, count } = await query;

      if (error) throw error;

      const formattedTopics = topics?.map(topic => this.formatTopic(topic)) || [];

      return {
        data: formattedTopics,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          hasNext: offset + limit < (count || 0),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Failed to get topics:', error);
      throw error;
    }
  }

  /**
   * Konu detayını getir
   */
  async getTopicById(id: string, userId?: string): Promise<Topic | null> {
    try {
      const { data: topic, error } = await supabase
        .from('topics')
        .select(`
          *,
          author:author_id(id, username, full_name, avatar_url, user_type, is_verified, reputation_score),
          category:category_id(id, name, slug, color),
          last_reply_user:last_reply_by(id, username, avatar_url),
          media_files:media_files(id, filename, original_name, file_type, storage_path, thumbnail_path, alt_text)
        `)
        .eq('id', id)
        .eq('is_approved', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      // Görüntülenme sayısını artır
      await this.incrementViewCount(id);

      // Kullanıcı etkileşimlerini kontrol et
      if (userId) {
        const [isLiked, isBookmarked, isSubscribed] = await Promise.all([
          this.checkUserLike(userId, 'topic', id),
          this.checkUserBookmark(userId, id),
          this.checkUserSubscription(userId, id)
        ]);

        const formattedTopic = this.formatTopic(topic);
        formattedTopic.isLiked = isLiked;
        formattedTopic.isBookmarked = isBookmarked;
        formattedTopic.isSubscribed = isSubscribed;

        return formattedTopic;
      }

      return this.formatTopic(topic);
    } catch (error) {
      logger.error('Failed to get topic by ID:', error);
      throw error;
    }
  }

  /**
   * Slug ile konu getir
   */
  async getTopicBySlug(slug: string, userId?: string): Promise<Topic | null> {
    try {
      const { data: topic, error } = await supabase
        .from('topics')
        .select(`
          *,
          author:author_id(id, username, full_name, avatar_url, user_type, is_verified, reputation_score),
          category:category_id(id, name, slug, color),
          last_reply_user:last_reply_by(id, username, avatar_url),
          media_files:media_files(id, filename, original_name, file_type, storage_path, thumbnail_path, alt_text)
        `)
        .eq('slug', slug)
        .eq('is_approved', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      // Görüntülenme sayısını artır
      await this.incrementViewCount(topic.id);

      // Kullanıcı etkileşimlerini kontrol et
      if (userId) {
        const [isLiked, isBookmarked, isSubscribed] = await Promise.all([
          this.checkUserLike(userId, 'topic', topic.id),
          this.checkUserBookmark(userId, topic.id),
          this.checkUserSubscription(userId, topic.id)
        ]);

        const formattedTopic = this.formatTopic(topic);
        formattedTopic.isLiked = isLiked;
        formattedTopic.isBookmarked = isBookmarked;
        formattedTopic.isSubscribed = isSubscribed;

        return formattedTopic;
      }

      return this.formatTopic(topic);
    } catch (error) {
      logger.error('Failed to get topic by slug:', error);
      throw error;
    }
  }

  /**
   * Yeni konu oluştur
   */
  async createTopic(data: CreateTopicRequest, userId: string): Promise<Topic> {
    try {
      const slug = await this.generateUniqueSlug(data.title, 'topics');
      const excerpt = this.generateExcerpt(data.content);

      const { data: topic, error } = await supabase
        .from('topics')
        .insert({
          title: data.title,
          slug,
          content: data.content,
          excerpt,
          author_id: userId,
          category_id: data.categoryId,
          tags: data.tags || [],
          meta_title: data.metaTitle,
          meta_description: data.metaDescription,
          last_activity_at: new Date().toISOString()
        })
        .select(`
          *,
          author:author_id(id, username, full_name, avatar_url, user_type, is_verified),
          category:category_id(id, name, slug, color)
        `)
        .single();

      if (error) throw error;

      // Medya dosyalarını bağla
      if (data.mediaFiles && data.mediaFiles.length > 0) {
        await this.attachMediaFiles(data.mediaFiles, topic.id, 'topic');
      }

      // Otomatik olarak konuyu takip et
      await this.subscribeToTopic(userId, topic.id);

      // Aktiviteyi logla
      await this.logForumActivity(userId, 'topic_created', 'topic', topic.id, {
        topicTitle: data.title,
        categoryId: data.categoryId
      });

      logger.info('Topic created', { topicId: topic.id, title: data.title, userId });

      return this.formatTopic(topic);
    } catch (error) {
      logger.error('Failed to create topic:', error);
      throw error;
    }
  }

  // ==================== HELPER METHODS ====================

  private formatCategories(categories: any[]): Category[] {
    return categories.map(category => this.formatCategory(category));
  }

  private formatCategory(category: any): Category {
    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      icon: category.icon,
      color: category.color,
      parentId: category.parent_id,
      sortOrder: category.sort_order,
      isActive: category.is_active,
      topicCount: category.topic_count,
      replyCount: category.reply_count,
      lastTopicId: category.last_topic_id,
      lastTopicAt: category.last_topic_at,
      createdAt: category.created_at,
      updatedAt: category.updated_at,
      parent: category.parent,
      children: category.children
    };
  }

  private formatTopic(topic: any): Topic {
    return {
      id: topic.id,
      title: topic.title,
      slug: topic.slug,
      content: topic.content,
      excerpt: topic.excerpt,
      authorId: topic.author_id,
      categoryId: topic.category_id,
      isPinned: topic.is_pinned,
      isLocked: topic.is_locked,
      isSolved: topic.is_solved,
      isFeatured: topic.is_featured,
      isApproved: topic.is_approved,
      viewCount: topic.view_count,
      replyCount: topic.reply_count,
      likeCount: topic.like_count,
      bookmarkCount: topic.bookmark_count,
      lastReplyAt: topic.last_reply_at,
      lastReplyBy: topic.last_reply_by,
      lastActivityAt: topic.last_activity_at,
      metaTitle: topic.meta_title,
      metaDescription: topic.meta_description,
      tags: topic.tags || [],
      createdAt: topic.created_at,
      updatedAt: topic.updated_at,
      author: topic.author,
      category: topic.category,
      lastReplyUser: topic.last_reply_user,
      mediaFiles: topic.media_files
    };
  }

  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .replace(/ç/g, 'c')
      .replace(/ğ/g, 'g')
      .replace(/ı/g, 'i')
      .replace(/ö/g, 'o')
      .replace(/ş/g, 's')
      .replace(/ü/g, 'u')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private async generateUniqueSlug(title: string, table: string): Promise<string> {
    let baseSlug = this.generateSlug(title);
    let slug = baseSlug;
    let counter = 1;

    while (await this.slugExists(slug, table)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  private async slugExists(slug: string, table: string): Promise<boolean> {
    const { data, error } = await supabase
      .from(table)
      .select('id')
      .eq('slug', slug)
      .limit(1);

    return !error && data && data.length > 0;
  }

  private generateExcerpt(content: string, maxLength: number = 200): string {
    const plainText = content.replace(/<[^>]*>/g, ''); // HTML taglarını kaldır
    return plainText.length > maxLength 
      ? plainText.substring(0, maxLength) + '...'
      : plainText;
  }

  private async incrementViewCount(topicId: string): Promise<void> {
    try {
      await supabase
        .from('topics')
        .update({ view_count: supabase.raw('view_count + 1') })
        .eq('id', topicId);
    } catch (error) {
      logger.error('Failed to increment view count:', error);
    }
  }

  private async checkUserLike(userId: string, targetType: string, targetId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', userId)
        .eq('target_type', targetType)
        .eq('target_id', targetId)
        .limit(1);

      return !error && data && data.length > 0;
    } catch (error) {
      return false;
    }
  }

  private async checkUserBookmark(userId: string, topicId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', userId)
        .eq('topic_id', topicId)
        .limit(1);

      return !error && data && data.length > 0;
    } catch (error) {
      return false;
    }
  }

  private async checkUserSubscription(userId: string, topicId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('topic_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('topic_id', topicId)
        .eq('is_active', true)
        .limit(1);

      return !error && data && data.length > 0;
    } catch (error) {
      return false;
    }
  }

  private async subscribeToTopic(userId: string, topicId: string): Promise<void> {
    try {
      await supabase
        .from('topic_subscriptions')
        .insert({
          user_id: userId,
          topic_id: topicId,
          notification_type: 'all',
          is_active: true
        });
    } catch (error) {
      logger.error('Failed to auto-subscribe to topic:', error);
    }
  }

  private async attachMediaFiles(mediaFileIds: string[], targetId: string, targetType: 'topic' | 'reply'): Promise<void> {
    try {
      const updateField = targetType === 'topic' ? 'topic_id' : 'reply_id';
      
      await supabase
        .from('media_files')
        .update({ [updateField]: targetId })
        .in('id', mediaFileIds);
    } catch (error) {
      logger.error('Failed to attach media files:', error);
    }
  }

  // ==================== REPLY MANAGEMENT ====================

  /**
   * Konunun yorumlarını getir
   */
  async getReplies(
    topicId: string,
    filters: ReplyFilters = {},
    pagination: PaginationParams = {}
  ): Promise<PaginatedResponse<Reply>> {
    try {
      const { page = 1, limit = 20 } = pagination;
      const offset = (page - 1) * limit;

      let query = supabase
        .from('replies')
        .select(`
          *,
          author:author_id(id, username, full_name, avatar_url, user_type, is_verified, reputation_score),
          parent:parent_id(id, author_id, content),
          children:replies!parent_id(
            id, content, author_id, like_count, created_at,
            author:author_id(id, username, avatar_url)
          ),
          media_files:media_files(id, filename, file_type, thumbnail_path, alt_text)
        `, { count: 'exact' })
        .eq('topic_id', topicId)
        .eq('is_approved', true);

      // Ana yorumları getir (parent_id null olanlar)
      if (!filters.parentId) {
        query = query.is('parent_id', null);
      } else {
        query = query.eq('parent_id', filters.parentId);
      }

      // Sıralama
      const sortBy = filters.sortBy || 'oldest';
      switch (sortBy) {
        case 'oldest':
          query = query.order('created_at', { ascending: true });
          break;
        case 'newest':
          query = query.order('created_at', { ascending: false });
          break;
        case 'most_likes':
          query = query.order('like_count', { ascending: false });
          break;
      }

      // Sayfalama
      query = query.range(offset, offset + limit - 1);

      const { data: replies, error, count } = await query;

      if (error) throw error;

      const formattedReplies = replies?.map(reply => this.formatReply(reply)) || [];

      return {
        data: formattedReplies,
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          hasNext: offset + limit < (count || 0),
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Failed to get replies:', error);
      throw error;
    }
  }

  /**
   * Yeni yorum oluştur
   */
  async createReply(data: CreateReplyRequest, userId: string): Promise<Reply> {
    try {
      // Konunun kilitli olup olmadığını kontrol et
      const topic = await this.getTopicById(data.topicId);
      if (!topic) {
        throw new Error('Topic not found');
      }
      if (topic.isLocked) {
        throw new Error('Topic is locked');
      }

      const { data: reply, error } = await supabase
        .from('replies')
        .insert({
          content: data.content,
          author_id: userId,
          topic_id: data.topicId,
          parent_id: data.parentId
        })
        .select(`
          *,
          author:author_id(id, username, full_name, avatar_url, user_type, is_verified),
          parent:parent_id(id, author_id, content)
        `)
        .single();

      if (error) throw error;

      // Medya dosyalarını bağla
      if (data.mediaFiles && data.mediaFiles.length > 0) {
        await this.attachMediaFiles(data.mediaFiles, reply.id, 'reply');
      }

      // Otomatik olarak konuyu takip et
      await this.subscribeToTopic(userId, data.topicId);

      // Aktiviteyi logla
      await this.logForumActivity(userId, 'reply_created', 'reply', reply.id, {
        topicId: data.topicId,
        parentId: data.parentId
      });

      logger.info('Reply created', { replyId: reply.id, topicId: data.topicId, userId });

      return this.formatReply(reply);
    } catch (error) {
      logger.error('Failed to create reply:', error);
      throw error;
    }
  }

  /**
   * Yorumu güncelle
   */
  async updateReply(replyId: string, data: UpdateReplyRequest, userId: string): Promise<Reply> {
    try {
      // Yorum sahibi kontrolü
      const { data: existingReply, error: fetchError } = await supabase
        .from('replies')
        .select('author_id, topic_id')
        .eq('id', replyId)
        .single();

      if (fetchError || !existingReply) {
        throw new Error('Reply not found');
      }

      if (existingReply.author_id !== userId) {
        throw new Error('Unauthorized to edit this reply');
      }

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      if (data.content) {
        updateData.content = data.content;
        updateData.is_edited = true;
        updateData.edited_at = new Date().toISOString();
        updateData.edited_by = userId;
        updateData.edit_reason = data.editReason;
      }

      if (data.isSolution !== undefined) {
        updateData.is_solution = data.isSolution;
      }

      const { data: reply, error } = await supabase
        .from('replies')
        .update(updateData)
        .eq('id', replyId)
        .select(`
          *,
          author:author_id(id, username, full_name, avatar_url, user_type, is_verified),
          parent:parent_id(id, author_id, content)
        `)
        .single();

      if (error) throw error;

      // Çözüm işaretlendiyse konuyu çözümlü olarak işaretle
      if (data.isSolution) {
        await supabase
          .from('topics')
          .update({ is_solved: true })
          .eq('id', existingReply.topic_id);

        await this.logForumActivity(userId, 'reply_marked_solution', 'reply', replyId, {
          topicId: existingReply.topic_id
        });
      }

      // Aktiviteyi logla
      await this.logForumActivity(userId, 'reply_updated', 'reply', replyId, {
        topicId: existingReply.topic_id,
        editReason: data.editReason
      });

      logger.info('Reply updated', { replyId, userId });

      return this.formatReply(reply);
    } catch (error) {
      logger.error('Failed to update reply:', error);
      throw error;
    }
  }

  // ==================== INTERACTION MANAGEMENT ====================

  /**
   * Beğeni ekle/kaldır
   */
  async toggleLike(userId: string, targetType: 'topic' | 'reply', targetId: string): Promise<boolean> {
    try {
      // Mevcut beğeniyi kontrol et
      const { data: existingLike, error: fetchError } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', userId)
        .eq('target_type', targetType)
        .eq('target_id', targetId)
        .single();

      if (existingLike) {
        // Beğeniyi kaldır
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('id', existingLike.id);

        if (error) throw error;

        await this.logForumActivity(userId, 'like_removed', targetType, targetId);
        return false;
      } else {
        // Beğeni ekle
        const { error } = await supabase
          .from('likes')
          .insert({
            user_id: userId,
            target_type: targetType,
            target_id: targetId
          });

        if (error) throw error;

        await this.logForumActivity(userId, 'like_added', targetType, targetId);
        return true;
      }
    } catch (error) {
      logger.error('Failed to toggle like:', error);
      throw error;
    }
  }

  /**
   * Yer imi ekle/kaldır
   */
  async toggleBookmark(userId: string, topicId: string): Promise<boolean> {
    try {
      const { data: existingBookmark, error: fetchError } = await supabase
        .from('bookmarks')
        .select('id')
        .eq('user_id', userId)
        .eq('topic_id', topicId)
        .single();

      if (existingBookmark) {
        // Yer imini kaldır
        const { error } = await supabase
          .from('bookmarks')
          .delete()
          .eq('id', existingBookmark.id);

        if (error) throw error;

        await this.logForumActivity(userId, 'bookmark_removed', 'topic', topicId);
        return false;
      } else {
        // Yer imi ekle
        const { error } = await supabase
          .from('bookmarks')
          .insert({
            user_id: userId,
            topic_id: topicId
          });

        if (error) throw error;

        await this.logForumActivity(userId, 'bookmark_added', 'topic', topicId);
        return true;
      }
    } catch (error) {
      logger.error('Failed to toggle bookmark:', error);
      throw error;
    }
  }

  /**
   * Konu takibi ekle/kaldır
   */
  async toggleSubscription(userId: string, topicId: string): Promise<boolean> {
    try {
      const { data: existingSubscription, error: fetchError } = await supabase
        .from('topic_subscriptions')
        .select('id, is_active')
        .eq('user_id', userId)
        .eq('topic_id', topicId)
        .single();

      if (existingSubscription) {
        // Takibi değiştir
        const newStatus = !existingSubscription.is_active;
        const { error } = await supabase
          .from('topic_subscriptions')
          .update({ is_active: newStatus })
          .eq('id', existingSubscription.id);

        if (error) throw error;

        await this.logForumActivity(
          userId,
          newStatus ? 'subscription_added' : 'subscription_removed',
          'topic',
          topicId
        );
        return newStatus;
      } else {
        // Yeni takip ekle
        const { error } = await supabase
          .from('topic_subscriptions')
          .insert({
            user_id: userId,
            topic_id: topicId,
            notification_type: 'all',
            is_active: true
          });

        if (error) throw error;

        await this.logForumActivity(userId, 'subscription_added', 'topic', topicId);
        return true;
      }
    } catch (error) {
      logger.error('Failed to toggle subscription:', error);
      throw error;
    }
  }

  // ==================== HELPER METHODS ====================

  private formatReply(reply: any): Reply {
    return {
      id: reply.id,
      content: reply.content,
      authorId: reply.author_id,
      topicId: reply.topic_id,
      parentId: reply.parent_id,
      isSolution: reply.is_solution,
      isApproved: reply.is_approved,
      isEdited: reply.is_edited,
      likeCount: reply.like_count,
      replyCount: reply.reply_count,
      editReason: reply.edit_reason,
      editedAt: reply.edited_at,
      editedBy: reply.edited_by,
      createdAt: reply.created_at,
      updatedAt: reply.updated_at,
      author: reply.author,
      parent: reply.parent,
      children: reply.children,
      mediaFiles: reply.media_files
    };
  }

  // ==================== SEARCH AND ANALYTICS ====================

  /**
   * Forum içeriği arama
   */
  async searchContent(
    query: string,
    options: {
      type?: 'topics' | 'replies' | 'all';
      categoryId?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<PaginatedResponse<any>> {
    try {
      const { type = 'all', categoryId, page = 1, limit = 20 } = options;
      const offset = (page - 1) * limit;

      let results: any[] = [];

      if (type === 'topics' || type === 'all') {
        const topicResults = await this.searchTopics(query, categoryId, limit);
        results = results.concat(topicResults);
      }

      if (type === 'replies' || type === 'all') {
        const replyResults = await this.searchReplies(query, categoryId, limit);
        results = results.concat(replyResults);
      }

      // Relevance score'a göre sırala
      results.sort((a, b) => b.relevanceScore - a.relevanceScore);

      // Sayfalama
      const paginatedResults = results.slice(offset, offset + limit);

      return {
        data: paginatedResults,
        pagination: {
          page,
          limit,
          total: results.length,
          totalPages: Math.ceil(results.length / limit),
          hasNext: offset + limit < results.length,
          hasPrev: page > 1
        }
      };

    } catch (error) {
      logger.error('Content search failed:', error);
      throw error;
    }
  }

  private async searchTopics(query: string, categoryId?: string, limit: number = 20) {
    let searchQuery = supabase
      .from('topics')
      .select(`
        id, title, excerpt, slug, created_at,
        author:author_id(username, avatar_url),
        category:category_id(name, slug)
      `)
      .eq('is_approved', true)
      .textSearch('title,content', query, { type: 'websearch', config: 'turkish' });

    if (categoryId) {
      searchQuery = searchQuery.eq('category_id', categoryId);
    }

    const { data: topics, error } = await searchQuery.limit(limit);
    if (error) throw error;

    return topics?.map(topic => ({
      ...topic,
      type: 'topic',
      relevanceScore: this.calculateRelevanceScore(topic.title + ' ' + topic.excerpt, query),
      url: `/forum/topics/${topic.slug}`
    })) || [];
  }

  private async searchReplies(query: string, categoryId?: string, limit: number = 20) {
    let searchQuery = supabase
      .from('replies')
      .select(`
        id, content, created_at,
        author:author_id(username, avatar_url),
        topic:topic_id(title, slug, category_id)
      `)
      .eq('is_approved', true)
      .textSearch('content', query, { type: 'websearch', config: 'turkish' });

    const { data: replies, error } = await searchQuery.limit(limit);
    if (error) throw error;

    let filteredReplies = replies || [];

    if (categoryId) {
      filteredReplies = filteredReplies.filter(reply => reply.topic.category_id === categoryId);
    }

    return filteredReplies.map(reply => ({
      ...reply,
      type: 'reply',
      title: `${reply.topic.title} - Yorum`,
      relevanceScore: this.calculateRelevanceScore(reply.content, query),
      url: `/forum/topics/${reply.topic.slug}#reply-${reply.id}`
    }));
  }

  private calculateRelevanceScore(text: string, query: string): number {
    const lowerText = text.toLowerCase();
    const lowerQuery = query.toLowerCase();

    let score = 0;

    // Exact match
    if (lowerText.includes(lowerQuery)) {
      score += 100;
    }

    // Word matches
    const queryWords = lowerQuery.split(' ');
    queryWords.forEach(word => {
      if (lowerText.includes(word)) {
        score += 10;
      }
    });

    return score;
  }

  /**
   * Forum istatistikleri
   */
  async getForumStats(): Promise<any> {
    try {
      // Cache'den kontrol et
      const cacheKey = 'forum:stats';
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const [topicStats, replyStats, userStats, categoryStats] = await Promise.all([
        this.getTopicStatistics(),
        this.getReplyStatistics(),
        this.getUserStatistics(),
        this.getCategoryStatistics()
      ]);

      const stats = {
        totalTopics: topicStats.total,
        totalReplies: replyStats.total,
        totalUsers: userStats.total,
        totalCategories: categoryStats.total,
        todayTopics: topicStats.today,
        todayReplies: replyStats.today,
        activeUsers: userStats.active,
        popularTags: await this.getPopularTags()
      };

      // Cache'e kaydet (30 dakika)
      await redis.setex(cacheKey, 1800, JSON.stringify(stats));

      return stats;
    } catch (error) {
      logger.error('Failed to get forum stats:', error);
      throw error;
    }
  }

  /**
   * Kategori istatistikleri
   */
  async getCategoryStats(categoryId: string): Promise<any> {
    try {
      const { data: category, error } = await supabase
        .from('categories')
        .select(`
          id, name, topic_count, reply_count, last_topic_at,
          topics!inner(tags)
        `)
        .eq('id', categoryId)
        .single();

      if (error) throw error;

      // Popüler etiketleri hesapla
      const allTags = category.topics.flatMap((topic: any) => topic.tags || []);
      const tagCounts = allTags.reduce((acc: any, tag: string) => {
        acc[tag] = (acc[tag] || 0) + 1;
        return acc;
      }, {});

      const popularTags = Object.entries(tagCounts)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count }));

      return {
        id: category.id,
        name: category.name,
        topicCount: category.topic_count,
        replyCount: category.reply_count,
        lastActivity: category.last_topic_at,
        popularTags,
        activeUsers: await this.getCategoryActiveUsers(categoryId)
      };

    } catch (error) {
      logger.error('Failed to get category stats:', error);
      return null;
    }
  }

  /**
   * Kullanıcı forum istatistikleri
   */
  async getUserForumStats(userId: string): Promise<any> {
    try {
      const [topicCount, replyCount, likeCount, solutionCount, badges] = await Promise.all([
        this.getUserTopicCount(userId),
        this.getUserReplyCount(userId),
        this.getUserLikeCount(userId),
        this.getUserSolutionCount(userId),
        this.getUserBadges(userId)
      ]);

      const { data: user, error } = await supabase
        .from('users')
        .select('reputation_score, created_at, last_login_at')
        .eq('id', userId)
        .single();

      if (error) throw error;

      return {
        userId,
        topicCount,
        replyCount,
        likeCount,
        solutionCount,
        reputationScore: user.reputation_score,
        badges,
        joinedAt: user.created_at,
        lastActiveAt: user.last_login_at
      };

    } catch (error) {
      logger.error('Failed to get user forum stats:', error);
      return null;
    }
  }

  // ==================== HELPER METHODS ====================

  private async getTopicStatistics() {
    const { count: total } = await supabase
      .from('topics')
      .select('*', { count: 'exact', head: true });

    const { count: today } = await supabase
      .from('topics')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    return { total: total || 0, today: today || 0 };
  }

  private async getReplyStatistics() {
    const { count: total } = await supabase
      .from('replies')
      .select('*', { count: 'exact', head: true });

    const { count: today } = await supabase
      .from('replies')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    return { total: total || 0, today: today || 0 };
  }

  private async getUserStatistics() {
    const { count: total } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const { count: active } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true)
      .gte('last_login_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    return { total: total || 0, active: active || 0 };
  }

  private async getCategoryStatistics() {
    const { count: total } = await supabase
      .from('categories')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    return { total: total || 0 };
  }

  private async getPopularTags() {
    const { data: topics, error } = await supabase
      .from('topics')
      .select('tags')
      .not('tags', 'is', null);

    if (error) return [];

    const allTags = topics?.flatMap(topic => topic.tags || []) || [];
    const tagCounts = allTags.reduce((acc: any, tag: string) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(tagCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));
  }

  private async getCategoryActiveUsers(categoryId: string): Promise<number> {
    const { count } = await supabase
      .from('topics')
      .select('author_id', { count: 'exact', head: true })
      .eq('category_id', categoryId)
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    return count || 0;
  }

  private async getUserTopicCount(userId: string): Promise<number> {
    const { count } = await supabase
      .from('topics')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', userId);

    return count || 0;
  }

  private async getUserReplyCount(userId: string): Promise<number> {
    const { count } = await supabase
      .from('replies')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', userId);

    return count || 0;
  }

  private async getUserLikeCount(userId: string): Promise<number> {
    // Kullanıcının aldığı toplam beğeni sayısı
    const { data: topicLikes } = await supabase
      .from('likes')
      .select('target_id')
      .eq('target_type', 'topic')
      .in('target_id',
        supabase.from('topics').select('id').eq('author_id', userId)
      );

    const { data: replyLikes } = await supabase
      .from('likes')
      .select('target_id')
      .eq('target_type', 'reply')
      .in('target_id',
        supabase.from('replies').select('id').eq('author_id', userId)
      );

    return (topicLikes?.length || 0) + (replyLikes?.length || 0);
  }

  private async getUserSolutionCount(userId: string): Promise<number> {
    const { count } = await supabase
      .from('replies')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', userId)
      .eq('is_solution', true);

    return count || 0;
  }

  private async getUserBadges(userId: string): Promise<any[]> {
    const { data: badges, error } = await supabase
      .from('user_badges')
      .select('*')
      .eq('user_id', userId)
      .order('earned_at', { ascending: false });

    return badges || [];
  }

  private async logForumActivity(
    userId: string,
    activity: ForumActivity,
    targetType: string,
    targetId: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      await SecurityService.logSecurityEvent({
        userId,
        activity: `forum_${activity}`,
        metadata: {
          targetType,
          targetId,
          ...metadata
        },
        severity: 'low',
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Failed to log forum activity:', error);
    }
  }
}
