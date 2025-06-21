export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  topicCount: number;
  replyCount: number;
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  userType: 'farmer' | 'expert' | 'admin';
  isVerified: boolean;
  avatar?: string;
}

export interface Topic {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  categoryId: string;
  category?: Category;
  author: User;
  viewCount: number;
  replyCount: number;
  likeCount: number;
  createdAt: string;
  updatedAt?: string;
  isPinned: boolean;
  isSolved: boolean;
  isLocked?: boolean;
  isFeatured?: boolean;
  tags?: string[];
}

export interface Reply {
  id: string;
  content: string;
  author: User;
  topicId: string;
  parentId?: string;
  likeCount: number;
  createdAt: string;
  updatedAt?: string;
  isAccepted?: boolean;
  replies?: Reply[];
}

export interface TopicWithReplies extends Topic {
  content: string;
  replies: Reply[];
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
  page?: number;
  limit?: number;
  sortBy?: 'newest' | 'oldest' | 'most_replies' | 'most_likes' | 'most_views';
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
  topicId: string;
  parentId?: string;
}
