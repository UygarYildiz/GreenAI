import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Topic } from '@/types/forum.types';
import { formatDate, formatNumber } from '@/lib/utils';
import { MessageCircle, Eye, Heart, Pin, CheckCircle, User } from 'lucide-react';

interface TopicCardProps {
  topic: Topic;
  showCategory?: boolean;
  variant?: 'default' | 'compact' | 'featured';
}

export default function TopicCard({ 
  topic, 
  showCategory = true, 
  variant = 'default' 
}: TopicCardProps) {
  const isCompact = variant === 'compact';
  const isFeatured = variant === 'featured';

  return (
    <Card className={`hover:shadow-md transition-shadow group ${isFeatured ? 'border-green-200 bg-green-50/50' : ''}`}>
      <CardHeader className={isCompact ? "pb-2" : "pb-3"}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            {/* Başlık ve Pinned/Solved badges */}
            <div className="flex items-start gap-2 mb-2">
              <Link 
                href={`/forum/topics/${topic.slug}`}
                className="flex-1 min-w-0"
              >
                <h3 className={`font-semibold text-gray-900 group-hover:text-green-600 transition-colors line-clamp-2 ${isCompact ? 'text-sm' : 'text-lg'}`}>
                  {topic.title}
                </h3>
              </Link>
              
              <div className="flex gap-1 flex-shrink-0">
                {topic.isPinned && (
                  <Badge variant="warning" className="text-xs">
                    <Pin className="w-3 h-3 mr-1" />
                    Sabitlenmiş
                  </Badge>
                )}
                {topic.isSolved && (
                  <Badge variant="success" className="text-xs">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Çözüldü
                  </Badge>
                )}
              </div>
            </div>

            {/* Excerpt */}
            {!isCompact && (
              <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                {topic.excerpt}
              </p>
            )}

            {/* Kategori */}
            {showCategory && topic.category && (
              <Link href={`/forum/categories/${topic.category.slug}`}>
                <Badge 
                  variant="outline" 
                  className="text-xs mb-3 hover:bg-gray-100 transition-colors"
                >
                  {topic.category.icon} {topic.category.name}
                </Badge>
              </Link>
            )}

            {/* Yazar ve tarih */}
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span className="font-medium text-gray-700">
                  {topic.author.fullName || topic.author.username}
                </span>
                {topic.author.isVerified && (
                  <Badge variant="info" className="text-xs">
                    ✓
                  </Badge>
                )}
              </div>
              <span>{formatDate(topic.createdAt)}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* İstatistikler */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>{formatNumber(topic.viewCount)}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageCircle className="w-4 h-4" />
              <span>{formatNumber(topic.replyCount)}</span>
            </div>
            <div className="flex items-center gap-1">
              <Heart className="w-4 h-4" />
              <span>{formatNumber(topic.likeCount)}</span>
            </div>
          </div>

          {/* Yazar tipi badge */}
          <Badge 
            variant={topic.author.userType === 'expert' ? 'success' : 'secondary'}
            className="text-xs"
          >
            {topic.author.userType === 'expert' ? '🎓 Uzman' : 
             topic.author.userType === 'farmer' ? '🌾 Çiftçi' : 
             '👤 Kullanıcı'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
