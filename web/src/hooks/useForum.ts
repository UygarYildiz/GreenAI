'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  parentId?: string;
  sortOrder: number;
  isActive: boolean;
  topicCount: number;
  replyCount: number;
  lastTopicAt?: string;
  children?: Category[];
}

export interface Topic {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  authorId: string;
  categoryId: string;
  isPinned: boolean;
  isLocked: boolean;
  isSolved: boolean;
  isFeatured: boolean;
  viewCount: number;
  replyCount: number;
  likeCount: number;
  bookmarkCount: number;
  lastReplyAt?: string;
  lastActivityAt: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    username: string;
    fullName?: string;
    avatarUrl?: string;
    userType: string;
    isVerified: boolean;
  };
  category?: {
    id: string;
    name: string;
    slug: string;
    color?: string;
  };
  isLiked?: boolean;
  isBookmarked?: boolean;
  isSubscribed?: boolean;
}

export interface Reply {
  id: string;
  content: string;
  authorId: string;
  topicId: string;
  parentId?: string;
  isSolution: boolean;
  isApproved: boolean;
  isEdited: boolean;
  likeCount: number;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: string;
    username: string;
    fullName?: string;
    avatarUrl?: string;
    userType: string;
    isVerified: boolean;
  };
  children?: Reply[];
  isLiked?: boolean;
}

export interface CreateTopicData {
  title: string;
  content: string;
  categoryId: string;
  tags?: string[];
  metaTitle?: string;
  metaDescription?: string;
}

export interface CreateReplyData {
  content: string;
  parentId?: string;
}

export interface TopicFilters {
  categoryId?: string;
  authorId?: string;
  tags?: string[];
  isPinned?: boolean;
  isLocked?: boolean;
  isSolved?: boolean;
  isFeatured?: boolean;
  search?: string;
  sortBy?: 'latest' | 'oldest' | 'popular' | 'most_replies' | 'most_likes';
  timeRange?: 'today' | 'week' | 'month' | 'year' | 'all';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function useForum() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  // API çağrıları için helper function
  const apiCall = useCallback(async (endpoint: string, options: RequestInit = {}) => {
    const url = `${process.env.NEXT_PUBLIC_API_URL}/api/forum${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const token = localStorage.getItem('accessToken');
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'API request failed');
    }

    return data;
  }, []);

  // Kategorileri yükle
  const loadCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await apiCall('/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('Failed to load categories:', error);
      toast({
        title: 'Hata',
        description: 'Kategoriler yüklenirken hata oluştu',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [apiCall, toast]);

  // Konuları getir
  const getTopics = useCallback(async (
    filters: TopicFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<Topic> | null> => {
    try {
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v));
          } else {
            params.append(key, value.toString());
          }
        }
      });
      
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const response = await apiCall(`/topics?${params.toString()}`);
      return {
        data: response.data,
        pagination: response.pagination
      };
    } catch (error) {
      console.error('Failed to get topics:', error);
      toast({
        title: 'Hata',
        description: 'Konular yüklenirken hata oluştu',
        variant: 'destructive',
      });
      return null;
    }
  }, [apiCall, toast]);

  // Konu detayını getir
  const getTopic = useCallback(async (slug: string): Promise<Topic | null> => {
    try {
      const response = await apiCall(`/topics/${slug}`);
      return response.data;
    } catch (error) {
      console.error('Failed to get topic:', error);
      if (error instanceof Error && error.message.includes('not found')) {
        return null;
      }
      toast({
        title: 'Hata',
        description: 'Konu yüklenirken hata oluştu',
        variant: 'destructive',
      });
      return null;
    }
  }, [apiCall, toast]);

  // Yeni konu oluştur
  const createTopic = useCallback(async (data: CreateTopicData): Promise<Topic | null> => {
    if (!isAuthenticated) {
      toast({
        title: 'Giriş Gerekli',
        description: 'Konu oluşturmak için giriş yapmalısınız',
        variant: 'destructive',
      });
      return null;
    }

    try {
      setIsLoading(true);
      const response = await apiCall('/topics', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      toast({
        title: 'Başarılı',
        description: 'Konu başarıyla oluşturuldu',
      });

      return response.data;
    } catch (error) {
      console.error('Failed to create topic:', error);
      toast({
        title: 'Hata',
        description: error instanceof Error ? error.message : 'Konu oluşturulurken hata oluştu',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [apiCall, isAuthenticated, toast]);

  // Konunun yorumlarını getir
  const getReplies = useCallback(async (
    topicId: string,
    page: number = 1,
    limit: number = 20,
    sortBy: 'oldest' | 'newest' | 'most_likes' = 'oldest'
  ): Promise<PaginatedResponse<Reply> | null> => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sortBy
      });

      const response = await apiCall(`/topics/${topicId}/replies?${params.toString()}`);
      return {
        data: response.data,
        pagination: response.pagination
      };
    } catch (error) {
      console.error('Failed to get replies:', error);
      toast({
        title: 'Hata',
        description: 'Yorumlar yüklenirken hata oluştu',
        variant: 'destructive',
      });
      return null;
    }
  }, [apiCall, toast]);

  // Yeni yorum oluştur
  const createReply = useCallback(async (
    topicId: string,
    data: CreateReplyData
  ): Promise<Reply | null> => {
    if (!isAuthenticated) {
      toast({
        title: 'Giriş Gerekli',
        description: 'Yorum yapmak için giriş yapmalısınız',
        variant: 'destructive',
      });
      return null;
    }

    try {
      setIsLoading(true);
      const response = await apiCall(`/topics/${topicId}/replies`, {
        method: 'POST',
        body: JSON.stringify(data),
      });

      toast({
        title: 'Başarılı',
        description: 'Yorum başarıyla eklendi',
      });

      return response.data;
    } catch (error) {
      console.error('Failed to create reply:', error);
      toast({
        title: 'Hata',
        description: error instanceof Error ? error.message : 'Yorum eklenirken hata oluştu',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [apiCall, isAuthenticated, toast]);

  // Beğeni ekle/kaldır
  const toggleLike = useCallback(async (
    targetType: 'topic' | 'reply',
    targetId: string
  ): Promise<boolean | null> => {
    if (!isAuthenticated) {
      toast({
        title: 'Giriş Gerekli',
        description: 'Beğenmek için giriş yapmalısınız',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const response = await apiCall('/like', {
        method: 'POST',
        body: JSON.stringify({ targetType, targetId }),
      });

      return response.data.isLiked;
    } catch (error) {
      console.error('Failed to toggle like:', error);
      toast({
        title: 'Hata',
        description: 'Beğeni işlemi başarısız',
        variant: 'destructive',
      });
      return null;
    }
  }, [apiCall, isAuthenticated, toast]);

  // Yer imi ekle/kaldır
  const toggleBookmark = useCallback(async (topicId: string): Promise<boolean | null> => {
    if (!isAuthenticated) {
      toast({
        title: 'Giriş Gerekli',
        description: 'Yer imi eklemek için giriş yapmalısınız',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const response = await apiCall('/bookmark', {
        method: 'POST',
        body: JSON.stringify({ topicId }),
      });

      toast({
        title: 'Başarılı',
        description: response.data.isBookmarked ? 'Yer imi eklendi' : 'Yer imi kaldırıldı',
      });

      return response.data.isBookmarked;
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
      toast({
        title: 'Hata',
        description: 'Yer imi işlemi başarısız',
        variant: 'destructive',
      });
      return null;
    }
  }, [apiCall, isAuthenticated, toast]);

  // Konu takibi ekle/kaldır
  const toggleSubscription = useCallback(async (topicId: string): Promise<boolean | null> => {
    if (!isAuthenticated) {
      toast({
        title: 'Giriş Gerekli',
        description: 'Takip etmek için giriş yapmalısınız',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const response = await apiCall('/subscribe', {
        method: 'POST',
        body: JSON.stringify({ topicId }),
      });

      toast({
        title: 'Başarılı',
        description: response.data.isSubscribed ? 'Konu takip ediliyor' : 'Konu takibi kaldırıldı',
      });

      return response.data.isSubscribed;
    } catch (error) {
      console.error('Failed to toggle subscription:', error);
      toast({
        title: 'Hata',
        description: 'Takip işlemi başarısız',
        variant: 'destructive',
      });
      return null;
    }
  }, [apiCall, isAuthenticated, toast]);

  // Forum içeriği arama
  const searchContent = useCallback(async (
    query: string,
    options: {
      type?: 'topics' | 'replies' | 'all';
      categoryId?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<PaginatedResponse<any> | null> => {
    try {
      const params = new URLSearchParams({
        q: query,
        type: options.type || 'all',
        page: (options.page || 1).toString(),
        limit: (options.limit || 20).toString()
      });

      if (options.categoryId) {
        params.append('categoryId', options.categoryId);
      }

      const response = await apiCall(`/search?${params.toString()}`);
      return {
        data: response.data,
        pagination: response.pagination
      };
    } catch (error) {
      console.error('Failed to search content:', error);
      toast({
        title: 'Hata',
        description: 'Arama işlemi başarısız',
        variant: 'destructive',
      });
      return null;
    }
  }, [apiCall, toast]);

  // Kategorileri ilk yüklemede getir
  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  return {
    // State
    categories,
    isLoading,

    // Methods
    loadCategories,
    getTopics,
    getTopic,
    createTopic,
    getReplies,
    createReply,
    toggleLike,
    toggleBookmark,
    toggleSubscription,
    searchContent,
  };
}
