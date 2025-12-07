/**
 * AI Draft Feedback Modal
 * 
 * Captures staff feedback on AI-generated draft responses
 * This feedback is used to train and improve the AI over time (RLHF)
 */

import { useState } from 'react'
import { X, Star } from 'lucide-react'

interface AIDraftFeedbackModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (feedback: {
    qualityScore: number
    wasHelpful: boolean
    improvementNotes: string
  }) => Promise<void>
}

export function AIDraftFeedbackModal({
  isOpen,
  onClose,
  onSubmit
}: AIDraftFeedbackModalProps) {
  const [qualityScore, setQualityScore] = useState<number>(0)
  const [wasHelpful, setWasHelpful] = useState<boolean | null>(null)
  const [improvementNotes, setImprovementNotes] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [hoveredStar, setHoveredStar] = useState<number>(0)

  if (!isOpen) return null

  const handleSubmit = async () => {
    if (qualityScore === 0 || wasHelpful === null) {
      alert('Please rate the draft and indicate if it was helpful')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        qualityScore,
        wasHelpful,
        improvementNotes
      })
      onClose()
    } catch (error) {
      console.error('Failed to submit feedback:', error)
      alert('Failed to submit feedback. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSkip = () => {
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            📊 Help Improve the AI
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Quality Score */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              How good was the AI draft?
            </label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setQualityScore(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      star <= (hoveredStar || qualityScore)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                  />
                </button>
              ))}
              <span className="ml-2 text-sm text-gray-600">
                {qualityScore === 0 && 'Click to rate'}
                {qualityScore === 1 && 'Poor'}
                {qualityScore === 2 && 'Fair'}
                {qualityScore === 3 && 'Good'}
                {qualityScore === 4 && 'Very Good'}
                {qualityScore === 5 && 'Excellent'}
              </span>
            </div>
          </div>

          {/* Was Helpful */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Did the AI draft save you time?
            </label>
            <div className="flex gap-3">
              <button
                onClick={() => setWasHelpful(true)}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                  wasHelpful === true
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 text-gray-700 hover:border-green-300'
                }`}
              >
                👍 Yes
              </button>
              <button
                onClick={() => setWasHelpful(false)}
                className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
                  wasHelpful === false
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-300 text-gray-700 hover:border-red-300'
                }`}
              >
                👎 No
              </button>
            </div>
          </div>

          {/* Improvement Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              What could be improved? (Optional)
            </label>
            <textarea
              value={improvementNotes}
              onChange={(e) => setImprovementNotes(e.target.value)}
              placeholder="e.g., Too formal, missing product details, wrong tone..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              💡 <strong>Your feedback helps the AI learn!</strong> Every rating makes the AI smarter and more helpful for future tickets.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleSkip}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            disabled={isSubmitting}
          >
            Skip for now
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || qualityScore === 0 || wasHelpful === null}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
          </button>
        </div>
      </div>
    </div>
  )
}

