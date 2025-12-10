import { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { memosApi } from '../lib/api';
import { StickyNote, Paperclip, X, Edit2, Trash2, Download, Send, Image, File, Loader2, Hash, Search, ChevronUp, ChevronDown } from 'lucide-react';
import { parseTagsFromStorage, TAG_HELP_TEXT } from '../utils/tagParser';

interface Memo {
  id: string;
  staff_id: string;
  content: string;
  tags: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  attachment_type: string | null;
  attachment_size: number | null;
  created_at: string;
  updated_at: string;
  edited_at: string | null;
  is_deleted: number;
  deleted_at: string | null;
}

export default function MemoPage() {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [memoInput, setMemoInput] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingMemoId, setEditingMemoId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [deleteAttachment, setDeleteAttachment] = useState(false);
  const [deleteConfirmMemoId, setDeleteConfirmMemoId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [highlightedMemoId, setHighlightedMemoId] = useState<string | null>(null);

  // Fetch memos
  const { data: memosData } = useQuery({
    queryKey: ['memos'],
    queryFn: async () => {
      const response = await memosApi.getMemos();
      return response.data;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const memos: Memo[] = memosData?.memos || [];

  // Auto-scroll to bottom when memos change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [memos]);

  // Scroll to bottom on initial load
  useEffect(() => {
    const timer = setTimeout(() => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'auto', block: 'end' });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Create memo mutation
  const createMemoMutation = useMutation({
    mutationFn: async (data: { content: string; attachment?: any }) => memosApi.createMemo(data),
    onSuccess: () => {
      setMemoInput('');
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ['memos'] });
    },
  });

  // Edit memo mutation
  const editMemoMutation = useMutation({
    mutationFn: ({ memoId, content, deleteAttachment }: { memoId: string; content: string; deleteAttachment?: boolean }) =>
      memosApi.editMemo(memoId, { content, deleteAttachment }),
    onSuccess: () => {
      setEditingMemoId(null);
      setDeleteAttachment(false);
      setEditingContent('');
      queryClient.invalidateQueries({ queryKey: ['memos'] });
    },
  });

  // Delete memo mutation
  const deleteMemoMutation = useMutation({
    mutationFn: (memoId: string) => memosApi.deleteMemo(memoId),
    onSuccess: () => {
      setDeleteConfirmMemoId(null);
      queryClient.invalidateQueries({ queryKey: ['memos'] });
    },
  });

  // Search function - searches both content and tags
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim() || !memos.length) {
      setSearchResults([]);
      setCurrentSearchIndex(0);
      return;
    }

    const lowerQuery = query.toLowerCase();
    const results: string[] = [];

    // Search through memos (from bottom to top, so reverse)
    [...memos].reverse().forEach((memo) => {
      let isMatch = false;

      // Search in content
      if (memo.content.toLowerCase().includes(lowerQuery)) {
        isMatch = true;
      }

      // Search in tags
      if (memo.tags) {
        const tags = memo.tags.split(',').map(t => t.trim().toLowerCase());
        if (tags.some(tag => tag.includes(lowerQuery))) {
          isMatch = true;
        }
      }

      if (isMatch) {
        results.push(memo.id);
      }
    });

    setSearchResults(results);
    setCurrentSearchIndex(0);

    // Scroll to first result
    if (results.length > 0) {
      scrollToMemo(results[0]);
    }
  };

  // Scroll to and highlight a specific memo
  const scrollToMemo = (memoId: string) => {
    setHighlightedMemoId(memoId);
    setTimeout(() => {
      const memoElement = document.getElementById(`memo-${memoId}`);
      if (memoElement) {
        memoElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
    
    // Clear highlight after 5 seconds
    setTimeout(() => {
      setHighlightedMemoId(null);
    }, 5000);
  };

  // Navigate to next search result
  const nextSearchResult = () => {
    if (searchResults.length === 0) return;
    const nextIndex = (currentSearchIndex + 1) % searchResults.length;
    setCurrentSearchIndex(nextIndex);
    scrollToMemo(searchResults[nextIndex]);
  };

  // Navigate to previous search result
  const prevSearchResult = () => {
    if (searchResults.length === 0) return;
    const prevIndex = currentSearchIndex === 0 ? searchResults.length - 1 : currentSearchIndex - 1;
    setCurrentSearchIndex(prevIndex);
    scrollToMemo(searchResults[prevIndex]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSendMemo = async () => {
    if (!memoInput.trim() && !selectedFile) return;
    if (createMemoMutation.isPending) return;

    let attachmentData = null;
    if (selectedFile) {
      const base64 = await fileToBase64(selectedFile);
      attachmentData = {
        data: base64,
        name: selectedFile.name,
        type: selectedFile.type,
        size: selectedFile.size,
      };
    }

    createMemoMutation.mutate({
      content: memoInput.trim() || '(Attachment)',
      attachment: attachmentData,
    });
  };

  const handleEditMemo = (memo: Memo) => {
    setEditingMemoId(memo.id);
    setEditingContent(memo.content);
    setDeleteAttachment(false);
  };

  const handleSaveEdit = () => {
    if (!editingMemoId || !editingContent.trim()) return;
    editMemoMutation.mutate({
      memoId: editingMemoId,
      content: editingContent,
      deleteAttachment,
    });
  };

  const handleDownloadFile = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  // Render content with clickable ticket links and highlighted mentions (same as Group Chat)
  const renderContentWithLinks = (text: string) => {
    // Split by both @mentions, ticket patterns, and task patterns
    const parts = text.split(/(@\w+|@\d+|#\d+|TKT-\d+|ticket\s+\d+|\*\d+(?:-\d+)?|TSK-\d+(?:-\d+)?)/gi);
    
    return parts.map((part, index) => {
      // Check if it's an @mention (staff) - NOT a ticket number
      if (part.match(/^@\w+$/) && !part.match(/^@\d+$/)) {
        return (
          <span key={index} className="bg-blue-100 text-blue-700 font-semibold px-1 rounded">
            {part}
          </span>
        );
      }
      
      // Check if it's a ticket reference (@237, #237, TKT-237, ticket 237)
      const ticketMatch = part.match(/^@(\d+)$|^#(\d+)$|^TKT-(\d+)$|^ticket\s+(\d+)$/i);
      if (ticketMatch) {
        const ticketNum = ticketMatch[1] || ticketMatch[2] || ticketMatch[3] || ticketMatch[4];
        return (
          <Link
            key={index}
            to={`/tickets?search=TKT-${ticketNum}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {part}
          </Link>
        );
      }
      
      // Check if it's a task reference (*123 or TSK-123, including sub-tasks)
      const taskMatch = part.match(/^\*(\d+)(?:-(\d+))?$|^TSK-(\d+)(?:-(\d+))?$/i);
      if (taskMatch) {
        const taskNum = taskMatch[1] || taskMatch[3];
        const subTaskNum = taskMatch[2] || taskMatch[4];
        const searchTerm = subTaskNum ? `TSK-${taskNum}-${subTaskNum}` : `TSK-${taskNum}`;
        return (
          <Link
            key={index}
            to={`/tickets?search=${searchTerm}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-amber-600 hover:text-amber-800 hover:underline font-medium"
            onClick={(e) => {
              e.stopPropagation();
            }}
          >
            {part}
          </Link>
        );
      }
      
      return part;
    });
  };

  // Helper to get full attachment URL
  const getAttachmentUrl = (path: string) => {
    if (path.startsWith('http')) return path;
    return `${import.meta.env.VITE_API_URL || 'https://dartmouth-os-worker.dartmouth.workers.dev'}/api/attachments/${path}`;
  };

  return (
    <div className="flex flex-col overflow-hidden bg-gray-50" style={{ height: 'calc(100vh - 3.5rem)' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StickyNote className="w-6 h-6 text-yellow-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">@Memos</h1>
              <p className="text-sm text-gray-600">Personal notes to yourself</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className={`p-2 rounded-lg ${showSearch ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}
              title="Search memos"
            >
              <Search className="w-5 h-5" />
            </button>
            <div className="text-sm text-gray-500">
              {memos.length} memo{memos.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
        
        {/* Search Bar */}
        {showSearch && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search memos and tags... (e.g., James Scott, #james-scott)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              {searchResults.length > 0 && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 bg-white px-2">
                  <span className="text-sm text-gray-600">
                    {currentSearchIndex + 1} / {searchResults.length}
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={prevSearchResult}
                      className="p-1 hover:bg-gray-100 rounded"
                      title="Previous result"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      onClick={nextSearchResult}
                      className="p-1 hover:bg-gray-100 rounded"
                      title="Next result"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={() => {
                setShowSearch(false);
                setSearchQuery('');
                setSearchResults([]);
                setCurrentSearchIndex(0);
              }}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              title="Close search"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Memos List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {memos.length === 0 ? (
          <div className="text-center py-12">
            <StickyNote className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No @Memos yet. Create your first note below!</p>
          </div>
        ) : (
          memos.map((memo) => {
            const isHighlighted = highlightedMemoId === memo.id;
            return (
            <div 
              key={memo.id} 
              id={`memo-${memo.id}`}
              className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 transition-colors duration-500 ${
                isHighlighted ? 'bg-yellow-100 border-yellow-400' : ''
              }`}
            >
              {editingMemoId === memo.id ? (
                // Edit mode
                <div className="space-y-3">
                  <textarea
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                  />
                  {memo.attachment_url && !deleteAttachment && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Paperclip className="w-4 h-4" />
                      <span>{memo.attachment_name}</span>
                      <button
                        onClick={() => setDeleteAttachment(true)}
                        className="text-red-600 hover:text-red-700 text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  {deleteAttachment && (
                    <div className="text-sm text-red-600">
                      Attachment will be removed when you save
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={handleSaveEdit}
                      disabled={!editingContent.trim()}
                      className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => {
                        setEditingMemoId(null);
                        setDeleteAttachment(false);
                      }}
                      className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                // View mode
                <>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-gray-900 whitespace-pre-wrap break-words">{renderContentWithLinks(memo.content)}</p>
                      {memo.tags && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {parseTagsFromStorage(memo.tags).map((tag, index) => (
                            <Link
                              key={index}
                              to={`/tags?tag=${encodeURIComponent(tag)}`}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded hover:bg-blue-200 transition-colors"
                            >
                              <Hash className="w-3 h-3" />
                              {tag}
                            </Link>
                          ))}
                        </div>
                      )}
                      {memo.attachment_url && (
                        <div className="mt-3">
                          {memo.attachment_type?.startsWith('image/') ? (
                            <div className="relative group inline-block">
                              <img
                                src={getAttachmentUrl(memo.attachment_url)}
                                alt={memo.attachment_name || 'Attachment'}
                                className="max-w-md max-h-64 rounded-lg border border-gray-200"
                              />
                              <div className="absolute top-2 right-2 bg-white rounded-full shadow-md p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleDownloadFile(getAttachmentUrl(memo.attachment_url!), memo.attachment_name || 'download')}
                                  className="text-gray-500 hover:text-blue-600"
                                  title="Download image"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <a
                                href={getAttachmentUrl(memo.attachment_url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm"
                              >
                                <Paperclip className="w-4 h-4" />
                                <span>{memo.attachment_name}</span>
                                {memo.attachment_size && (
                                  <span className="text-xs text-gray-500">
                                    ({(memo.attachment_size / 1024).toFixed(1)} KB)
                                  </span>
                                )}
                              </a>
                              <button
                                onClick={() => handleDownloadFile(getAttachmentUrl(memo.attachment_url!), memo.attachment_name || 'download')}
                                className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                                title="Download file"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditMemo(memo)}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        title="Edit memo"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmMemoId(memo.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete memo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                    <span>{new Date(memo.created_at).toLocaleString()}</span>
                    {memo.edited_at && (
                      <span className="italic">
                        (edited {new Date(memo.edited_at).toLocaleString([], { 
                          month: 'short', 
                          day: 'numeric', 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })})
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white p-4 flex-shrink-0">
        {selectedFile && (
          <div className="mb-3 flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
            {selectedFile.type.startsWith('image/') ? (
              <Image className="w-4 h-4 text-gray-600" />
            ) : (
              <File className="w-4 h-4 text-gray-600" />
            )}
            <span className="text-sm text-gray-700">{selectedFile.name}</span>
            <button
              onClick={() => setSelectedFile(null)}
              className="text-gray-400 hover:text-gray-600 ml-auto"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input
            value={memoInput}
            onChange={(e) => setMemoInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMemo();
              }
            }}
            placeholder="Write a note... Use #keyword to add tags (e.g., #james-scott, #artwork-issue)"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="absolute -top-6 left-0 text-xs text-gray-500">{TAG_HELP_TEXT}</span>
          <button
            onClick={handleSendMemo}
            disabled={(!memoInput.trim() && !selectedFile) || createMemoMutation.isPending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {createMemoMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Add
              </>
            )}
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmMemoId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Memo?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this memo? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmMemoId(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteConfirmMemoId && deleteMemoMutation.mutate(deleteConfirmMemoId)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

