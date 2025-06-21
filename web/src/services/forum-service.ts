import apiClient from '@/lib/api-client';
import { 
  Category, 
  Topic, 
  TopicWithReplies,
  TopicFilters, 
  PaginatedResponse,
  CreateTopicData,
  CreateReplyData,
  Reply
} from '@/types/forum.types';

export const forumService = {
  // Kategorileri getir
  async getCategories(): Promise<Category[]> {
    const response = await apiClient.get('/forum/categories');
    return response.data.data;
  },

  // Konuları getir
  async getTopics(filters?: TopicFilters): Promise<PaginatedResponse<Topic>> {
    const params = new URLSearchParams();
    
    if (filters?.categoryId) params.append('categoryId', filters.categoryId);
    if (filters?.authorId) params.append('authorId', filters.authorId);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.isPinned !== undefined) params.append('isPinned', filters.isPinned.toString());
    if (filters?.isLocked !== undefined) params.append('isLocked', filters.isLocked.toString());
    if (filters?.isSolved !== undefined) params.append('isSolved', filters.isSolved.toString());
    if (filters?.isFeatured !== undefined) params.append('isFeatured', filters.isFeatured.toString());
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.sortBy) params.append('sortBy', filters.sortBy);
    if (filters?.tags) {
      filters.tags.forEach(tag => params.append('tags', tag));
    }
    
    const response = await apiClient.get(`/forum/topics?${params}`);
    return {
      data: response.data.data,
      pagination: response.data.pagination,
    };
  },

  // Konu ara
  async searchTopics(query: string, page = 1): Promise<PaginatedResponse<Topic>> {
    const response = await apiClient.get(`/forum/search?q=${encodeURIComponent(query)}&page=${page}`);
    return {
      data: response.data.data,
      pagination: response.data.pagination,
    };
  },

  // Konu detayını getir
  async getTopic(slug: string): Promise<TopicWithReplies> {
    const response = await apiClient.get(`/forum/topics/${slug}`);
    return response.data.data;
  },

  // Konu oluştur
  async createTopic(topicData: CreateTopicData): Promise<Topic> {
    const response = await apiClient.post('/forum/topics', topicData);
    return response.data.data;
  },

  // Konu güncelle
  async updateTopic(topicId: string, topicData: Partial<CreateTopicData>): Promise<Topic> {
    const response = await apiClient.put(`/forum/topics/${topicId}`, topicData);
    return response.data.data;
  },

  // Konu sil
  async deleteTopic(topicId: string): Promise<void> {
    await apiClient.delete(`/forum/topics/${topicId}`);
  },

  // Konunun yorumlarını getir
  async getTopicReplies(topicId: string, page = 1, limit = 20): Promise<PaginatedResponse<Reply>> {
    const response = await apiClient.get(`/forum/topics/${topicId}/replies?page=${page}&limit=${limit}`);
    return {
      data: response.data.data,
      pagination: response.data.pagination,
    };
  },

  // Yorum oluştur
  async createReply(replyData: CreateReplyData): Promise<Reply> {
    const response = await apiClient.post('/forum/replies', replyData);
    return response.data.data;
  },

  // Yorum güncelle
  async updateReply(replyId: string, content: string): Promise<Reply> {
    const response = await apiClient.put(`/forum/replies/${replyId}`, { content });
    return response.data.data;
  },

  // Yorum sil
  async deleteReply(replyId: string): Promise<void> {
    await apiClient.delete(`/forum/replies/${replyId}`);
  },

  // Beğeni ekle/kaldır
  async toggleLike(targetType: 'topic' | 'reply', targetId: string): Promise<{ isLiked: boolean }> {
    const response = await apiClient.post('/forum/like', { targetType, targetId });
    return response.data.data;
  },

  // Yer imi ekle/kaldır
  async toggleBookmark(topicId: string): Promise<{ isBookmarked: boolean }> {
    const response = await apiClient.post('/forum/bookmark', { topicId });
    return response.data.data;
  },

  // Konu takibi ekle/kaldır
  async toggleSubscription(topicId: string): Promise<{ isSubscribed: boolean }> {
    const response = await apiClient.post('/forum/subscribe', { topicId });
    return response.data.data;
  },

  // Yorumu çözüm olarak işaretle
  async markReplyAsAccepted(replyId: string): Promise<Reply> {
    const response = await apiClient.post(`/forum/replies/${replyId}/accept`);
    return response.data.data;
  },
};
