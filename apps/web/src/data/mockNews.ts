import { NewsItem } from '../types/news';

export const INITIAL_NEWS_DATA: NewsItem[] = [
  {
    id: 'news-1',
    title: 'Midterm Examination Schedule for Semester 2',
    content: 'The midterm examinations will commence next Monday. Students are advised to prepare accordingly.',
    category: 'Academic',
    author: 'Principal Office',
    publishDate: '2026-03-05',
    status: 'Published',
  },
  {
    id: 'news-2',
    title: 'Annual Sports Day Registration Open',
    content: 'Registration for the 100m sprint, relay, and high jump is open until Wednesday.',
    category: 'Event',
    author: 'Sports Dept',
    publishDate: '2026-03-04',
    status: 'Published',
  },
  {
    id: 'news-3',
    title: 'Campus Network Maintenance',
    content: 'Wi-Fi services will be disrupted on Saturday from 2 AM to 5 AM for router upgrades.',
    category: 'Alert',
    author: 'IT Infrastructure',
    publishDate: '2026-03-03',
    status: 'Published',
  },
  {
    id: 'news-4',
    title: 'New Library Book Arrivals',
    content: 'We have restocked over 200 new science fiction novels. Feel free to borrow them starting tomorrow.',
    category: 'General',
    author: 'Library',
    publishDate: '2026-03-01',
    status: 'Draft',
  }
];
