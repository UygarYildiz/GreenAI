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
  lastTopicId?: string;
  lastTopicAt?: string;
  createdAt: string;
  updatedAt: string;
  
  // Relations
  parent?: Category;
  children?: Category[];
  lastTopic?: Topic;
}

export interface Topic {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  authorId: string;
  categoryId: string;
  
  // Status flags
  isPinned: boolean;
  isLocked: boolean;
  isSolved: boolean;
  isFeatured: boolean;
  isApproved: boolean;
  
  // Statistics
  viewCount: number;
  replyCount: number;
  likeCount: number;
  bookmarkCount: number;
  
  // Last activity
  lastReplyAt?: string;
  lastReplyBy?: string;
  lastActivityAt: string;
  
  // SEO and metadata
  metaTitle?: string;
  metaDescription?: string;
  tags: string[];
  
  createdAt: string;
  updatedAt: string;
  
  // Relations
  author?: User;
  category?: Category;
  lastReplyUser?: User;
  replies?: Reply[];
  mediaFiles?: MediaFile[];
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
  
  // Status flags
  isSolution: boolean;
  isApproved: boolean;
  isEdited: boolean;
  
  // Statistics
  likeCount: number;
  replyCount: number;
  
  // Edit metadata
  editReason?: string;
  editedAt?: string;
  editedBy?: string;
  
  createdAt: string;
  updatedAt: string;
  
  // Relations
  author?: User;
  topic?: Topic;
  parent?: Reply;
  children?: Reply[];
  mediaFiles?: MediaFile[];
  isLiked?: boolean;
}

export interface Like {
  id: string;
  userId: string;
  targetType: 'topic' | 'reply';
  targetId: string;
  createdAt: string;
  
  // Relations
  user?: User;
}

export interface Bookmark {
  id: string;
  userId: string;
  topicId: string;
  createdAt: string;
  
  // Relations
  user?: User;
  topic?: Topic;
}

export interface TopicSubscription {
  id: string;
  userId: string;
  topicId: string;
  notificationType: 'all' | 'replies' | 'solutions';
  isActive: boolean;
  createdAt: string;
  
  // Relations
  user?: User;
  topic?: Topic;
}

export interface MediaFile {
  id: string;
  filename: string;
  originalName: string;
  fileType: 'image' | 'video' | 'document';
  fileSize: number;
  mimeType: string;
  storagePath: string;
  thumbnailPath?: string;
  altText?: string;
  
  // Relations
  uploadedBy: string;
  topicId?: string;
  replyId?: string;
  
  // Metadata
  width?: number;
  height?: number;
  duration?: number;
  
  createdAt: string;
  
  // Relations
  uploader?: User;
  topic?: Topic;
  reply?: Reply;
}

export interface UserBadge {
  id: string;
  userId: string;
  badgeType: string;
  badgeName: string;
  description?: string;
  iconUrl?: string;
  color?: string;
  earnedAt: string;
  awardedBy?: string;
  metadata: Record<string, any>;
  
  // Relations
  user?: User;
  awarder?: User;
}

// Request/Response types
export interface CreateCategoryRequest {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  parentId?: string;
  sortOrder?: number;
}

export interface UpdateCategoryRequest {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  parentId?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface CreateTopicRequest {
  title: string;
  content: string;
  categoryId: string;
  tags?: string[];
  metaTitle?: string;
  metaDescription?: string;
  mediaFiles?: string[]; // Media file IDs
}

export interface UpdateTopicRequest {
  title?: string;
  content?: string;
  categoryId?: string;
  tags?: string[];
  metaTitle?: string;
  metaDescription?: string;
  isPinned?: boolean;
  isLocked?: boolean;
  isSolved?: boolean;
  isFeatured?: boolean;
}

export interface CreateReplyRequest {
  content: string;
  topicId: string;
  parentId?: string;
  mediaFiles?: string[]; // Media file IDs
}

export interface UpdateReplyRequest {
  content?: string;
  editReason?: string;
  isSolution?: boolean;
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

export interface ReplyFilters {
  topicId?: string;
  authorId?: string;
  parentId?: string;
  isSolution?: boolean;
  sortBy?: 'oldest' | 'newest' | 'most_likes';
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
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

export interface ForumStats {
  totalTopics: number;
  totalReplies: number;
  totalUsers: number;
  totalCategories: number;
  todayTopics: number;
  todayReplies: number;
  activeUsers: number;
  popularTags: Array<{
    tag: string;
    count: number;
  }>;
}

export interface CategoryStats {
  id: string;
  name: string;
  topicCount: number;
  replyCount: number;
  lastActivity?: string;
  popularTags: string[];
  activeUsers: number;
}

export interface UserForumStats {
  userId: string;
  topicCount: number;
  replyCount: number;
  likeCount: number;
  solutionCount: number;
  reputationScore: number;
  badges: UserBadge[];
  joinedAt: string;
  lastActiveAt?: string;
}

export interface TopicSearchResult {
  id: string;
  title: string;
  excerpt: string;
  categoryName: string;
  authorUsername: string;
  replyCount: number;
  likeCount: number;
  createdAt: string;
  relevanceScore: number;
}

export interface NotificationPreferences {
  newReplies: boolean;
  newTopicsInSubscribedCategories: boolean;
  likesOnMyContent: boolean;
  solutionMarked: boolean;
  mentionsInContent: boolean;
  weeklyDigest: boolean;
}

// User interface (imported from auth types but extended for forum)
export interface User {
  id: string;
  email: string;
  username: string;
  fullName?: string;
  avatarUrl?: string;
  bio?: string;
  location?: string;
  expertiseAreas: string[];
  userType: 'farmer' | 'expert' | 'moderator' | 'admin';
  reputationScore: number;
  isVerified: boolean;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
  
  // Forum-specific fields
  forumStats?: UserForumStats;
  badges?: UserBadge[];
}

// Error types
export interface ForumError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

// Validation schemas
export interface TopicValidation {
  title: {
    minLength: number;
    maxLength: number;
    required: boolean;
  };
  content: {
    minLength: number;
    maxLength: number;
    required: boolean;
  };
  tags: {
    maxCount: number;
    maxLength: number;
  };
}

export interface ReplyValidation {
  content: {
    minLength: number;
    maxLength: number;
    required: boolean;
  };
  maxNestingLevel: number;
}

// Activity types for audit logging
export type ForumActivity = 
  | 'topic_created'
  | 'topic_updated'
  | 'topic_deleted'
  | 'topic_pinned'
  | 'topic_unpinned'
  | 'topic_locked'
  | 'topic_unlocked'
  | 'topic_solved'
  | 'topic_unsolved'
  | 'reply_created'
  | 'reply_updated'
  | 'reply_deleted'
  | 'reply_marked_solution'
  | 'reply_unmarked_solution'
  | 'like_added'
  | 'like_removed'
  | 'bookmark_added'
  | 'bookmark_removed'
  | 'subscription_added'
  | 'subscription_removed'
  | 'category_created'
  | 'category_updated'
  | 'category_deleted';

export interface ForumActivityLog {
  id: string;
  userId: string;
  activity: ForumActivity;
  targetType: 'topic' | 'reply' | 'category' | 'user';
  targetId: string;
  metadata: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}
