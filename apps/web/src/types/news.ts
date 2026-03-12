export type AnnouncementCategory = 'Academic' | 'Event' | 'Alert' | 'General';

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  author: string;
  authorId: string;
  publishDate: string;
  status: 'Published' | 'Draft';
}
