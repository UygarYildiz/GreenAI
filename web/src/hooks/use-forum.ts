import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { forumService } from '@/services/forum-service';
import { TopicFilters, CreateTopicData, CreateReplyData } from '@/types/forum.types';

// Query keys
export const forumKeys = {
  all: ['forum'] as const,
  categories: () => [...forumKeys.all, 'categories'] as const,
  topics: (filters?: TopicFilters) => [...forumKeys.all, 'topics', filters] as const,
  topic: (slug: string) => [...forumKeys.all, 'topic', slug] as const,
  replies: (topicId: string) => [...forumKeys.all, 'replies', topicId] as const,
  search: (query: string, page?: number) => [...forumKeys.all, 'search', query, page] as const,
};

// Categories
export function useCategories() {
  return useQuery({
    queryKey: forumKeys.categories(),
    queryFn: forumService.getCategories,
    staleTime: 5 * 60 * 1000, // 5 dakika
  });
}

// Topics
export function useTopics(filters?: TopicFilters) {
  return useQuery({
    queryKey: forumKeys.topics(filters),
    queryFn: () => forumService.getTopics(filters),
    keepPreviousData: true,
  });
}

// Infinite topics for pagination
export function useInfiniteTopics(filters?: TopicFilters) {
  return useInfiniteQuery({
    queryKey: forumKeys.topics(filters),
    queryFn: ({ pageParam = 1 }) => 
      forumService.getTopics({ ...filters, page: pageParam }),
    getNextPageParam: (lastPage) => 
      lastPage.pagination.hasNext ? lastPage.pagination.page + 1 : undefined,
    keepPreviousData: true,
  });
}

// Single topic
export function useTopic(slug: string) {
  return useQuery({
    queryKey: forumKeys.topic(slug),
    queryFn: () => forumService.getTopic(slug),
    enabled: !!slug,
  });
}

// Topic replies
export function useTopicReplies(topicId: string, page = 1) {
  return useQuery({
    queryKey: forumKeys.replies(topicId),
    queryFn: () => forumService.getTopicReplies(topicId, page),
    enabled: !!topicId,
  });
}

// Search topics
export function useSearchTopics(query: string, page = 1) {
  return useQuery({
    queryKey: forumKeys.search(query, page),
    queryFn: () => forumService.searchTopics(query, page),
    enabled: query.length >= 2,
    keepPreviousData: true,
  });
}

// Mutations
export function useCreateTopic() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (topicData: CreateTopicData) => forumService.createTopic(topicData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: forumKeys.topics() });
    },
  });
}

export function useUpdateTopic() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ topicId, topicData }: { topicId: string; topicData: Partial<CreateTopicData> }) => 
      forumService.updateTopic(topicId, topicData),
    onSuccess: (_, { topicId }) => {
      queryClient.invalidateQueries({ queryKey: forumKeys.topics() });
      queryClient.invalidateQueries({ queryKey: forumKeys.topic(topicId) });
    },
  });
}

export function useDeleteTopic() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (topicId: string) => forumService.deleteTopic(topicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: forumKeys.topics() });
    },
  });
}

export function useCreateReply() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (replyData: CreateReplyData) => forumService.createReply(replyData),
    onSuccess: (_, { topicId }) => {
      queryClient.invalidateQueries({ queryKey: forumKeys.replies(topicId) });
      queryClient.invalidateQueries({ queryKey: forumKeys.topics() });
    },
  });
}

export function useToggleLike() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ targetType, targetId }: { targetType: 'topic' | 'reply'; targetId: string }) => 
      forumService.toggleLike(targetType, targetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: forumKeys.topics() });
    },
  });
}

export function useToggleBookmark() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (topicId: string) => forumService.toggleBookmark(topicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: forumKeys.topics() });
    },
  });
}

export function useToggleSubscription() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (topicId: string) => forumService.toggleSubscription(topicId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: forumKeys.topics() });
    },
  });
}
