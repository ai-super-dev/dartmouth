import React, { useState } from 'react';
import { CheckCircle, XCircle, Edit2, AlertTriangle, Sparkles, Clock } from 'lucide-react';

interface AIDraft {
  id: string;
  ticket_id: string;
  draft_content: string;
  confidence_score: number;
  intent: string;
  handler_used: string;
  reasoning: string;
  suggested_actions: string[];
  status: string;
  should_escalate: boolean;
  escalation_reason?: string;
  shopify_data?: any;
  perp_data?: any;
  processing_time_ms?: number;
  created_at: string;
}

interface AIDraftResponsePanelProps {
  ticketId: string;
  draft: AIDraft | null;
  loading: boolean;
  onApprove: () => Promise<void>;
  onEdit: (editedContent: string) => Promise<void>;
  onReject: (reason: string) => Promise<void>;
}

export const AIDraftResponsePanel: React.FC<AIDraftResponsePanelProps> = ({
  draft,
  loading,
  onApprove,
  onEdit,
  onReject,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center space-x-3">
          <Sparkles className="w-5 h-5 text-blue-500 animate-pulse" />
          <span className="text-gray-600">AI is analyzing this ticket...</span>
        </div>
      </div>
    );
  }

  if (!draft) {
    return null;
  }

  const confidencePercentage = Math.round(draft.confidence_score * 100);
  const confidenceColor =
    confidencePercentage >= 85
      ? 'text-green-600 bg-green-50'
      : confidencePercentage >= 70
      ? 'text-yellow-600 bg-yellow-50'
      : 'text-red-600 bg-red-50';

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await onApprove();
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!isEditing) {
      setEditedContent(draft.draft_content);
      setIsEditing(true);
      return;
    }

    setActionLoading(true);
    try {
      await onEdit(editedContent);
      setIsEditing(false);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      await onReject(rejectReason);
      setShowRejectModal(false);
      setRejectReason('');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow-lg p-6 border-2 border-blue-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <Sparkles className="w-6 h-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI Draft Response</h3>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${confidenceColor}`}>
            {confidencePercentage}% Confidence
          </span>
        </div>
        {draft.processing_time_ms && draft.processing_time_ms > 0 && (
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <Clock className="w-4 h-4" />
            <span>{draft.processing_time_ms}ms</span>
          </div>
        )}
      </div>

      {/* Escalation Warning */}
      {draft.should_escalate === true && (
        <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
            <div>
              <p className="text-sm font-medium text-yellow-800">Escalation Recommended</p>
              <p className="text-sm text-yellow-700 mt-1">{draft.escalation_reason}</p>
            </div>
          </div>
        </div>
      )}

      {/* Draft Content */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Draft Response:</label>
        {isEditing ? (
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={8}
          />
        ) : (
          <div className="bg-white p-4 rounded-lg border border-gray-200 whitespace-pre-wrap">
            {draft.draft_content}
          </div>
        )}
      </div>

      {/* AI Reasoning */}
      <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
        <p className="text-sm font-medium text-gray-700 mb-2">AI Reasoning:</p>
        <p className="text-sm text-gray-600">{draft.reasoning}</p>
        <div className="mt-3">
          <p className="text-xs text-gray-500">
            Intent: <span className="font-medium">{draft.intent}</span> | Handler: <span className="font-medium">{draft.handler_used}</span>
          </p>
        </div>
      </div>

      {/* Suggested Actions */}
      {draft.suggested_actions && draft.suggested_actions.length > 0 && (
        <div className="mb-4 p-4 bg-white rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-700 mb-2">Suggested Actions:</p>
          <ul className="space-y-1">
            {draft.suggested_actions.map((action, index) => (
              <li key={index} className="text-sm text-gray-600 flex items-start">
                <span className="text-blue-500 mr-2">•</span>
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center space-x-3">
        <button
          onClick={handleApprove}
          disabled={actionLoading || isEditing}
          className="flex-1 flex items-center justify-center px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          {actionLoading ? 'Sending...' : 'Approve & Send'}
        </button>

        <button
          onClick={handleEdit}
          disabled={actionLoading}
          className="flex-1 flex items-center justify-center px-4 py-2 bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg hover:bg-yellow-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          <Edit2 className="w-4 h-4 mr-2" />
          {isEditing ? (actionLoading ? 'Sending...' : 'Send Edited') : 'Edit & Send'}
        </button>

        <button
          onClick={() => setShowRejectModal(true)}
          disabled={actionLoading || isEditing}
          className="flex-1 flex items-center justify-center px-4 py-2 bg-gray-100 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          <XCircle className="w-4 h-4 mr-2" />
          Reject
        </button>
      </div>

      {isEditing && (
        <button
          onClick={() => {
            setIsEditing(false);
            setEditedContent('');
          }}
          className="mt-2 w-full px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
        >
          Cancel Editing
        </button>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Reject AI Draft</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejecting this draft (optional):
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g., Incorrect information, wrong tone, missing details..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
              rows={3}
            />
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {actionLoading ? 'Rejecting...' : 'Reject Draft'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

