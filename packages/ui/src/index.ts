import { HeroSection } from './components/HeroSection';
import { StatsSection } from './components/StatsSection';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';
import { QuickLinksSection } from './components/QuickLinksSection';
import { StudentCard } from './components/StudentCard';
import { AnnouncementsWidget, type Announcement } from './components/AnnouncementsWidget';
import { ClassesWidget, type ScheduleItem } from './components/ClassesWidget';
import { Header } from './components/Header';
import { FeaturesSection } from './components/FeaturesSection';
import { GallerySection } from './components/GallerySection';
import { NewsSection } from './components/NewsSection';
import { ThemeProvider, useTheme } from './ThemeContext';
import { FloatingActionButton } from './components/FloatingActionButton';
import { ScrollToTopButton } from './components/ScrollToTopButton';

// Core UI Components
import { Button } from './components/Button';
import { Input } from './components/Input';
import { Badge } from './components/Badge';
import { Avatar } from './components/Avatar';
import { ThemeToggle } from './components/ThemeToggle';
import { Skeleton, SkeletonCard } from './components/Skeleton';

// Dashboard UI Components
import { Breadcrumbs } from './components/Breadcrumbs';
import { Sidebar } from './components/Sidebar';
import { Modal } from './components/Modal';
import { MetricCard } from './components/MetricCard';
import { DataTable } from './components/DataTable';
import { SectionPicker } from './components/SectionPicker';

// Student Card Feature
import { PrintableStudentCard, CARD_TEMPLATES } from './components/PrintableStudentCard';
import { PhotoUploader } from './components/PhotoUploader';
import { StudentIdentityForm } from './components/StudentIdentityForm';
import { CardTemplateSelector } from './components/CardTemplateSelector';

export { 
  // Sections
  HeroSection, StatsSection, ContactSection, Footer, StudentCard, AnnouncementsWidget, ClassesWidget,
  ThemeToggle, Header, FeaturesSection, GallerySection, NewsSection, QuickLinksSection, FloatingActionButton, ScrollToTopButton,
  
  // Elements
  Button, Input, Badge, Avatar, Skeleton, SkeletonCard,

  // Dashboard Atoms
  Breadcrumbs, Sidebar, Modal, MetricCard, DataTable, SectionPicker,

  // Student Card Feature
  PrintableStudentCard, CARD_TEMPLATES, PhotoUploader, StudentIdentityForm, CardTemplateSelector,

  // Contexts
  ThemeProvider, useTheme
};
export type { Announcement, ScheduleItem };
export type { NewsItem } from './components/NewsSection';
export type { PrintableCardTemplate, PrintableCardStudent, PrintableCardSettings, CardOrientation, CardTemplateName } from './components/PrintableStudentCard';
export type { PhotoUploaderProps } from './components/PhotoUploader';
export type { StudentFormData, StudentIdentityFormProps } from './components/StudentIdentityForm';
export type { CardTemplateSelectorProps } from './components/CardTemplateSelector';
export type { FooterProps } from './components/Footer';
