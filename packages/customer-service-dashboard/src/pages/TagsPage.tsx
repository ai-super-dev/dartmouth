import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tagsApi, memosApi, groupChatApi } from '../lib/api';
import { Tag, Search, Hash, MessageSquare, StickyNote, Ticket, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TagData {
  tag: string;
  count: number;
}

export default function TagsPage() {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [currentResultIndex, setCurrentResultIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  // Fetch all tags
  const { data: tagsData, isLoading: tagsLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await tagsApi.getAllTags();
      return response.data;
    },
  });

  // Search within a selected tag
  const handleSearch = async () => {
    if (!selectedTag && !searchQuery) return;
    
    setIsSearching(true);
    try {
      const results: any[] = [];

      // Search in memos
      const memosResponse = await memosApi.getMemos({ 
        tag: selectedTag || undefined, 
        search: searchQuery || undefined 
      });
      const memos = memosResponse.data.memos || [];
      memos.forEach((memo: any) => {
        results.push({
          type: 'memo',
          id: memo.id,
          content: memo.content,
          tags: memo.tags,
          created_at: memo.created_at,
        });
      });

      // Search in group chat (we'll need to fetch from all channels user has access to)
      // For now, we'll skip this and implement it later when we have a better way to search across all channels

      setSearchResults(results);
      setCurrentResultIndex(0);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handlePrevResult = () => {
    if (currentResultIndex > 0) {
      setCurrentResultIndex(currentResultIndex - 1);
    }
  };

  const handleNextResult = () => {
    if (currentResultIndex < searchResults.length - 1) {
      setCurrentResultIndex(currentResultIndex + 1);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setCurrentResultIndex(0);
  };

  const tags = tagsData?.tags || [];
  const currentResult = searchResults[currentResultIndex];

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Tag className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Tags</h1>
          </div>
          <div className="text-sm text-gray-500">
            {tags.length} {tags.length === 1 ? 'tag' : 'tags'} found
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-4 flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch();
                }
              }}
              placeholder="Search within tags... (e.g., James Scott, or just James)"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isSearching || (!selectedTag && !searchQuery)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
          {searchResults.length > 0 && (
            <button
              onClick={handleClearSearch}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              title="Clear search"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Search Results Navigation */}
        {searchResults.length > 0 && (
          <div className="mt-3 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
            <div className="text-sm text-blue-900">
              <strong>{searchResults.length}</strong> {searchResults.length === 1 ? 'result' : 'results'} found
              {selectedTag && <span className="ml-2">in <strong>#{selectedTag}</strong></span>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-blue-700">
                {currentResultIndex + 1} of {searchResults.length}
              </span>
              <button
                onClick={handlePrevResult}
                disabled={currentResultIndex === 0}
                className="p-1 text-blue-600 hover:bg-blue-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                title="Previous result"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNextResult}
                disabled={currentResultIndex === searchResults.length - 1}
                className="p-1 text-blue-600 hover:bg-blue-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                title="Next result"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto">
          {tagsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading tags...</p>
            </div>
          ) : tags.length === 0 ? (
            <div className="text-center py-12">
              <Tag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No tags yet</h3>
              <p className="text-gray-600">
                Tags will appear here when you add them to memos or group chat messages.
              </p>
            </div>
          ) : (
            <>
              {/* Tags Grid */}
              {!currentResult && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {tags.map((tagData: TagData) => (
                    <button
                      key={tagData.tag}
                      onClick={() => {
                        setSelectedTag(tagData.tag === selectedTag ? null : tagData.tag);
                        setSearchResults([]);
                        setCurrentResultIndex(0);
                      }}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${
                        selectedTag === tagData.tag
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Hash className="w-5 h-5 text-blue-600" />
                          <span className="font-semibold text-gray-900">{tagData.tag}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {tagData.count}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {tagData.count} {tagData.count === 1 ? 'reference' : 'references'}
                      </p>
                    </button>
                  ))}
                </div>
              )}

              {/* Current Search Result */}
              {currentResult && (
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {currentResult.type === 'memo' ? (
                        <StickyNote className="w-6 h-6 text-yellow-600" />
                      ) : currentResult.type === 'group_chat' ? (
                        <MessageSquare className="w-6 h-6 text-blue-600" />
                      ) : (
                        <Ticket className="w-6 h-6 text-green-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-medium text-gray-500 uppercase">
                          {currentResult.type === 'memo' ? '@Memos' : currentResult.type === 'group_chat' ? 'Group Chat' : 'Ticket'}
                        </span>
                        <span className="text-sm text-gray-400">•</span>
                        <span className="text-sm text-gray-500">
                          {new Date(currentResult.created_at).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-gray-900 whitespace-pre-wrap mb-4">{currentResult.content}</p>
                      {currentResult.tags && (
                        <div className="flex flex-wrap gap-2">
                          {currentResult.tags.split(',').map((tag: string, index: number) => (
                            <span
                              key={index}
                              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-sm rounded"
                            >
                              <Hash className="w-3 h-3" />
                              {tag.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                      {currentResult.type === 'memo' && (
                        <div className="mt-4">
                          <Link
                            to="/memos"
                            className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                          >
                            View in @Memos →
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

