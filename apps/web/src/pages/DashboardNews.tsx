import React, { useState } from 'react';
import { Button, Input, Badge, DataTable, Skeleton } from '@mandaapp/ui';
import { useAuth } from '../contexts/AuthContext';
import { type NewsItem, type AnnouncementCategory } from '../types/news';
import { useNews } from '../hooks/api/useNews';
import JoditEditor from 'jodit-react';
import { useRef } from 'react';
export const DashboardNews = () => {
  const { queryAllAdmin, createMutation, updateMutation, deleteMutation } = useNews();
  const allNews: NewsItem[] = queryAllAdmin.data || [];
  const isLoading = queryAllAdmin.isLoading;

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  
  const { user } = useAuth();
  const editor = useRef(null);
  
  const STAFF_ROLES = ['admin', 'kepala_madrasah', 'wakil_kepala', 'kepala_unit', 'wali_kelas', 'pembina_ekstra', 'guru'];
  const AUDIT_ROLES = ['admin', 'kepala_madrasah', 'wakil_kepala'];
  const canManageNews = STAFF_ROLES.includes(user?.role || '');
  const canSeeAllNews = AUDIT_ROLES.includes(user?.role || '');

  const [formData, setFormData] = useState<Partial<NewsItem>>({
    title: '',
    content: '',
    category: 'General',
    status: 'Draft'
  });

  // Filter news by ownership: audit roles see all, others see only their own
  const newsList = canSeeAllNews
    ? allNews
    : allNews.filter(news => news.authorId === user?.id);

  const filteredNews = newsList.filter(news => 
    news.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    news.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryBadgeVariant = (category: string) => {
    switch(category) {
      case 'Academic': return 'primary';
      case 'Event': return 'success';
      case 'Alert': return 'danger';
      default: return 'default';
    }
  };

  const columns = [
    {
      header: 'Title',
      accessorKey: (row: NewsItem) => {
        // Strip HTML tags for preview and truncate
        const stripHtml = (html: string) => {
          const doc = new DOMParser().parseFromString(html, 'text/html');
          return doc.body.textContent || "";
        };
        const plainText = stripHtml(row.content);
        
        return (
          <div>
            <p className="font-medium text-text-primary dark:text-text-darkPrimary">{row.title}</p>
            <p className="text-xs text-text-secondary truncate max-w-sm mt-0.5">{plainText.substring(0, 60)}...</p>
          </div>
        )
      },
    },
    {
      header: 'Category',
      accessorKey: (row: NewsItem) => (
        <Badge variant={getCategoryBadgeVariant(row.category) as any}>{row.category}</Badge>
      ),
    },
    {
      header: 'Publish Date',
      accessorKey: 'publishDate' as keyof NewsItem,
    },
    {
      header: 'Author',
      accessorKey: 'author' as keyof NewsItem,
    },
    {
      header: 'Status',
      accessorKey: (row: NewsItem) => (
        <Badge variant={row.status === 'Published' ? 'success' : 'outline'}>{row.status}</Badge>
      ),
    },
    ...(canManageNews ? [{
      header: '',
      accessorKey: (row: NewsItem) => (
        <div className="flex justify-end gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              setEditingNewsId(row.id);
              setFormData({
                title: row.title,
                content: row.content,
                category: row.category,
                status: row.status
              });
              setIsModalOpen(true);
            }}
          >
            Edit
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-red-500 hover:text-red-600 dark:hover:text-red-400"
            onClick={() => deleteMutation.mutate(row.id)}
            disabled={deleteMutation.isPending}
          >
            Delete
          </Button>
        </div>
      ),
      className: 'text-right'
    }] : [])
  ];

  const handleSaveNews = (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    
    // Check if rich text is empty (ignoring empty tags/spaces like <p><br></p>)
    const cleanContent = formData.content?.replace(/<[^>]*>?/gm, '').trim();
    
    if (!formData.title?.trim()) {
      alert("Please enter a title for the announcement.");
      return;
    }
    
    if (!cleanContent) {
      alert("Please enter the content for the announcement.");
      return;
    }
    
    const payload = {
      title: formData.title,
      content: formData.content,
      category: formData.category as AnnouncementCategory,
      status: formData.status as 'Published' | 'Draft',
    };

    if (editingNewsId) {
      updateMutation.mutate({ id: editingNewsId, data: payload }, {
        onSuccess: () => {
          setIsModalOpen(false);
          setEditingNewsId(null);
          setFormData({ title: '', content: '', category: 'General', status: 'Draft' });
        },
        onError: (error) => {
          alert(`Failed to update news: ${error.message}`);
        }
      });
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          setIsModalOpen(false);
          setFormData({ title: '', content: '', category: 'General', status: 'Draft' });
        },
        onError: (error) => {
          alert(`Failed to create news: ${error.message}`);
        }
      });
    }
  };

  const joditConfig = {
    readonly: false,
    placeholder: 'Write your announcement here...',
    height: '100%',
    style: {
      background: 'transparent',
      color: 'inherit'
    },
    toolbarSticky: false,
    showCharsCounter: true,
    showWordsCounter: true,
    showXPathInStatusbar: false,
    zIndex: 1000,
    uploader: {
      insertImageAsBase64URI: true
    },
    buttons: [
      'source', '|',
      'bold', 'strikethrough', 'underline', 'italic', '|',
      'ul', 'ol', '|',
      'outdent', 'indent', '|',
      'font', 'fontsize', 'brush', 'paragraph', '|',
      'image', 'file', 'video', 'table', 'link', '|',
      'align', 'undo', 'redo', '|',
      'hr', 'eraser', 'copyformat', '|',
      'symbol', 'fullsize'
    ],
    theme: 'default'
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-background-dark p-6 rounded-2xl border border-border-light dark:border-border-dark shadow-sm">
        <div>
          <h2 className="text-xl font-heading font-semibold text-text-primary dark:text-text-darkPrimary">News & Announcements</h2>
          <p className="text-sm text-text-secondary mt-1">Manage school-wide broadcast messages and information.</p>
        </div>
        {canManageNews && (
          <Button onClick={() => {
            setEditingNewsId(null);
            setFormData({ title: '', content: '', category: 'General', status: 'Draft' });
            setIsModalOpen(true);
          }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Add News
          </Button>
        )}
      </div>

      {/* Filter Section */}
      <div className="bg-white dark:bg-background-dark p-4 rounded-xl border border-border-light dark:border-border-dark shadow-sm flex items-center gap-4">
        <div className="w-full sm:w-96">
          <Input 
            placeholder="Search news by title or category..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>}
          />
        </div>
      </div>

      {/* Data Table */}
      {isLoading ? (
        <div className="bg-white dark:bg-[#0a0a0a] rounded-xl border border-border-light dark:border-border-dark p-4 space-y-4 flex flex-col">
           {/* Skeleton Header */}
           <div className="flex justify-between border-b border-border-light dark:border-border-dark pb-4 px-2">
             <Skeleton className="h-4 w-24" />
             <Skeleton className="h-4 w-24" />
             <Skeleton className="h-4 w-24" />
             <Skeleton className="h-4 w-24" />
             <Skeleton className="h-4 w-12" />
           </div>
           {/* Skeleton Rows */}
           {[1, 2, 3, 4, 5].map((i) => (
             <div key={i} className="flex justify-between items-center py-3 px-2">
               <div className="flex flex-col gap-2 w-1/4">
                 <Skeleton className="h-5 w-3/4" />
                 <Skeleton className="h-3 w-1/2" />
               </div>
               <Skeleton className="h-6 w-16 rounded-full" />
               <Skeleton className="h-4 w-20" />
               <Skeleton className="h-4 w-24" />
               <Skeleton className="h-6 w-16 rounded-full" />
               <div className="flex gap-2">
                 <Skeleton className="h-8 w-12 rounded-md" />
                 <Skeleton className="h-8 w-16 rounded-md" />
               </div>
             </div>
           ))}
        </div>
      ) : (
        <DataTable 
          data={filteredNews}
          columns={columns}
          keyExtractor={(item) => item.id}
        />
      )}

      {/* Side Drawer for Add / Edit News */}
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${isModalOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={() => setIsModalOpen(false)} 
      />
      
      {/* Drawer Panel */}
      <div className={`fixed top-0 right-0 bottom-0 z-[70] w-full max-w-[800px] sm:max-w-[70%] bg-white dark:bg-[#121212] shadow-2xl transition-transform duration-300 transform flex flex-col ${isModalOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        
        {/* Drawer Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-light dark:border-border-dark shrink-0">
          <div>
            <h2 className="text-xl font-heading font-bold text-text-primary dark:text-text-darkPrimary">
              {editingNewsId ? "Edit Announcement" : "Create Announcement"}
            </h2>
            <p className="text-sm text-text-secondary mt-1">
              {editingNewsId ? "Update the details of the selected announcement." : "Draft a new message to be broadcasted to students and teachers."}
            </p>
          </div>
          <button 
            type="button"
            onClick={() => setIsModalOpen(false)}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
          </button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto" id="add-news-form">
          <div className="flex flex-col min-h-full px-6 py-6">
            <div className="space-y-1.5 shrink-0 mb-6">
              <label className="text-sm font-medium text-text-primary dark:text-text-darkPrimary">Title</label>
              <Input 
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                placeholder="E.g., Flag Ceremony Protocol" 
              />
            </div>
            
            {/* Rich Text Editor */}
            <div className="space-y-1.5 flex flex-col flex-1 mb-8">
              <label className="text-sm font-medium text-text-primary dark:text-text-darkPrimary flex justify-between">
                <span>Content</span>
                <span className="text-xs text-text-secondary font-normal">Use the toolbar to format, add images, or tables</span>
              </label>
              
              <div className="flex-1 bg-white dark:bg-[#1a1a1a] text-text-primary dark:text-text-darkPrimary rounded-lg border border-border-light dark:border-border-dark jodit-editor-container">
                <JoditEditor
                  ref={editor}
                  value={formData.content || ''}
                  config={joditConfig}
                  onBlur={newContent => setFormData({...formData, content: newContent})}
                />
              </div>
              
              <style>{`
                .jodit-editor-container .jodit-container {
                  border: none !important;
                }
                .jodit-editor-container .jodit-workplace {
                  min-height: 500px !important;
                }
                /* Ensure popups are not clipped */
                .jodit-editor-container .jodit-container {
                   overflow: visible !important;
                }
                .jodit-editor-container .jodit-popup-container {
                  z-index: 1001 !important;
                }
                /* Sticky Toolbar */
                .jodit-editor-container .jodit-toolbar__box {
                  position: sticky !important;
                  top: 0 !important;
                  z-index: 50 !important;
                  background-color: var(--bg-surface);
                  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                }
                /* Dark mode adjustments for Jodit */
                .dark .jodit-editor-container .jodit-toolbar__box {
                  background-color: #1a1a1a !important;
                  border-bottom: 1px solid var(--border-dark) !important;
                }
                .dark .jodit-editor-container .jodit-toolbar-button__button {
                  color: #e5e5e5 !important;
                }
                .dark .jodit-editor-container .jodit-toolbar-button__button:hover {
                  background-color: #3f3f3f !important;
                }
                .dark .jodit-editor-container .jodit-wysiwyg {
                  background-color: #1a1a1a !important;
                  color: #e5e5e5 !important;
                }
                .dark .jodit-editor-container .jodit-status-bar {
                  background-color: #1a1a1a !important;
                  color: #a3a3a3 !important;
                  border-top: 1px solid var(--border-dark) !important;
                }
              `}</style>
            </div>
            
            <div className="grid grid-cols-2 gap-4 shrink-0 mt-auto">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary dark:text-text-darkPrimary">Category</label>
                <select 
                  className="w-full h-11 px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-[#1a1a1a] text-sm text-text-primary dark:text-text-darkPrimary focus:ring-2 focus:ring-primary focus:outline-none"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value as AnnouncementCategory})}
                >
                  <option value="Academic">Academic</option>
                  <option value="Event">Event</option>
                  <option value="Alert">Alert</option>
                  <option value="General">General</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-text-primary dark:text-text-darkPrimary">Status</label>
                <select 
                  className="w-full h-11 px-3 py-2 border border-border-light dark:border-border-dark rounded-lg bg-white dark:bg-[#1a1a1a] text-sm text-text-primary dark:text-text-darkPrimary focus:ring-2 focus:ring-primary focus:outline-none"
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value as 'Published' | 'Draft'})}
                >
                  <option value="Published">Published</option>
                  <option value="Draft">Draft</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="px-6 py-5 border-t border-border-light dark:border-border-dark shrink-0 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 bg-gray-50/50 dark:bg-[#121212]">
          <button 
            type="button" 
            className="px-5 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            onClick={() => setIsModalOpen(false)}
          >
            Cancel
          </button>
          <button 
            type="button"
            onClick={handleSaveNews}
            disabled={createMutation.isPending || updateMutation.isPending}
            className="px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-opacity-90 transition-colors shadow-sm disabled:opacity-50"
          >
            {createMutation.isPending || updateMutation.isPending ? "Saving..." : (editingNewsId ? "Save Changes" : "Publish Announcement")}
          </button>
        </div>
      </div>
    </div>
  );
};
