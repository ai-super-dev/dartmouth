import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tagsApi } from '../lib/api';
import { Tag, Search, Hash, X, MessageSquare, StickyNote, Ticket, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface TagData {
  name: string;
  count: number;
}

export default function TagsPage() {
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentResultIndex, setCurrentResultIndex] = useState(0);

  // Fetch all tags (with optional search filter)
  const { data: tagsData, isLoading: tagsLoading } = useQuery({
    queryKey: ['tags', searchQuery],
    queryFn: async () => {
      const response = await tagsApi.getAllTags(searchQuery || undefined);
      return response.data;
    },
  });

  // Fetch content for selected tag
  const { data: tagContentData, isLoading: contentLoading } = useQuery({
    queryKey: ['tag-content', selectedTag],
    queryFn: async () => {
      if (!selectedTag) return { results: [] };
      const response = await tagsApi.searchTags(selectedTag);
      return response.data;
    },
    enabled: !!selectedTag,
  });

  const tags = tagsData?.tags || [];
  const tagResults = tagContentData?.results || [];
  const currentResult = tagResults[currentResultIndex];

  const handlePrevResult = () => {
    if (currentResultIndex > 0) {
      setCurrentResultIndex(currentResultIndex - 1);
    }
  };

  const handleNextResult = () => {
    if (currentResultIndex < tagResults.length - 1) {
      setCurrentResultIndex(currentResultIndex + 1);
    }
  };

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
              placeholder="Filter tags by name... (e.g., james-scott, urgent, team)"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              title="Clear search"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tags.map((tagData: TagData) => (
                  <button
                    key={tagData.name}
                    onClick={() => {
                      const newTag = tagData.name === selectedTag ? null : tagData.name;
                      setSelectedTag(newTag);
                      setCurrentResultIndex(0);
                    }}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedTag === tagData.name
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Hash className="w-5 h-5 text-blue-600" />
                        <span className="font-semibold text-gray-900">{tagData.name}</span>
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

              {/* Selected Tag Content */}
              {selectedTag && (
                <div className="mt-8">
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Hash className="w-5 h-5 text-blue-600" />
                        <h2 className="text-lg font-semibold text-gray-900">#{selectedTag}</h2>
                        <span className="text-sm text-gray-500">
                          ({tagResults.length} {tagResults.length === 1 ? 'reference' : 'references'})
                        </span>
                      </div>
                      <button
                        onClick={() => setSelectedTag(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {contentLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                        <p className="mt-2 text-gray-600">Loading content...</p>
                      </div>
                    ) : tagResults.length === 0 ? (
                      <p className="text-center text-gray-500 py-8">No content found with this tag.</p>
                    ) : (
                      <>
                        {/* Navigation */}
                        {tagResults.length > 1 && (
                          <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                            <span className="text-sm text-gray-600">
                              Showing {currentResultIndex + 1} of {tagResults.length}
                            </span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={handlePrevResult}
                                disabled={currentResultIndex === 0}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Previous"
                              >
                                <ChevronLeft className="w-5 h-5" />
                              </button>
                              <button
                                onClick={handleNextResult}
                                disabled={currentResultIndex === tagResults.length - 1}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Next"
                              >
                                <ChevronRight className="w-5 h-5" />
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Current Result */}
                        {currentResult && (
                          <div>
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
                                  <div className="flex flex-wrap gap-2 mb-4">
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
                                  <Link
                                    to="/memos"
                                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                  >
                                    View in @Memos →
                                  </Link>
                                )}
                                {currentResult.type === 'group_chat' && currentResult.channel_id && (
                                  <Link
                                    to={`/group-chat/${currentResult.channel_id}`}
                                    className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                                  >
                                    View in Group Chat →
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
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

