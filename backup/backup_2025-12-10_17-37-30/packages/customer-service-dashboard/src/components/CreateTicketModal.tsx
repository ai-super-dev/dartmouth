import { useState, useEffect } from 'react'
import { X, Mail, Clipboard } from 'lucide-react'
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query'
import { ticketsApi, staffApi } from '../lib/api'
import { useAuthStore } from '../store/authStore'

interface StaffUser {
  id: string
  first_name: string
  last_name: string
  email: string
  status: string
}

interface CreateTicketModalProps {
  isOpen: boolean
  onClose: () => void
  parentTaskId?: string
  parentTaskNumber?: string
}

export default function CreateTicketModal({ isOpen, onClose, parentTaskId, parentTaskNumber }: CreateTicketModalProps) {
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'email' | 'task'>('email')
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [relatedTicket, setRelatedTicket] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent' | 'critical'>('normal')
  const [assignTo, setAssignTo] = useState<string>('')
  const [deadlineDate, setDeadlineDate] = useState('')
  const [deadlineHour, setDeadlineHour] = useState('17')
  const [deadlineMinute, setDeadlineMinute] = useState('00')

  // Set default assignee to current user for both tabs
  useEffect(() => {
    if (user?.id) {
      setAssignTo(user.id)
    }
  }, [user?.id, activeTab])

  // Fetch staff list for assignment
  const { data: staffData } = useQuery({
    queryKey: ['staff-users'],
    queryFn: async () => {
      const response = await staffApi.list()
      return response.data
    },
  })

  const staffList = (staffData?.staff || []) as StaffUser[]

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await ticketsApi.createManual(data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      onClose()
      resetForm()
    },
  })

  const resetForm = () => {
    setCustomerName('')
    setCustomerEmail('')
    setCustomerPhone('')
    setRelatedTicket('')
    setSubject('')
    setMessage('')
    setPriority('normal')
    setDeadlineDate('')
    setDeadlineHour('17')
    setDeadlineMinute('00')
    if (user?.id) {
      setAssignTo(user.id)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Build deadline if set
    let deadline = null
    if (effectiveTab === 'task' && deadlineDate) {
      deadline = `${deadlineDate}T${deadlineHour}:${deadlineMinute}:00`
    }
    
    // Clean related ticket - remove @ prefix if present, convert @123 to TKT-123
    let cleanedRelatedTicket = relatedTicket?.trim() || null
    if (cleanedRelatedTicket) {
      if (cleanedRelatedTicket.startsWith('@')) {
        // @123 -> TKT-123
        cleanedRelatedTicket = `TKT-${cleanedRelatedTicket.substring(1)}`
      }
      // If it's already in TKT-123 or TSK-123 format, keep it as is
    }
    
    createMutation.mutate({
      customer_name: customerName || (effectiveTab === 'task' ? 'Internal Task' : ''),
      customer_email: customerEmail || (effectiveTab === 'task' ? 'task@internal' : ''),
      customer_phone: customerPhone,
      subject,
      message,
      channel: effectiveTab, // 'email' or 'task'
      priority,
      assign_to: assignTo === 'auto' ? null : assignTo,
      related_ticket: cleanedRelatedTicket,
      deadline: deadline,
      parent_task_id: parentTaskId || null,
    })
  }

  if (!isOpen) return null

  // If creating sub-task, force task tab and set default values
  const isSubTask = !!parentTaskId
  const effectiveTab = isSubTask ? 'task' : activeTab

  // Generate hour options
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'))
  const minutes = ['00', '15', '30', '45']

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
        {/* Backdrop */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
          {/* Header */}
          <div className="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold leading-6 text-gray-900">
                {isSubTask ? `Create Sub-Task for ${parentTaskNumber}` : effectiveTab === 'email' ? 'Create Email Ticket' : 'Create Task'}
              </h3>
              <button
                onClick={onClose}
                className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Tabs - hide when creating sub-task */}
            {!isSubTask && (
              <div className="flex border-b border-gray-200 mb-4">
                <button
                  type="button"
                  onClick={() => setActiveTab('email')}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    activeTab === 'email'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Mail className="w-4 h-4 text-gray-500" />
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('task')}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                    activeTab === 'task'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Clipboard className="w-4 h-4 text-gray-500" />
                  Task
                </button>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* EMAIL TAB FIELDS */}
              {effectiveTab === 'email' && (
                <>
                  {/* Customer Name */}
                  <div>
                    <label htmlFor="customerName" className="block text-sm font-medium text-gray-700">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      id="customerName"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                      placeholder="John Smith"
                    />
                  </div>

                  {/* Customer Email & Phone */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700">
                        Customer Email *
                      </label>
                      <input
                        type="email"
                        id="customerEmail"
                        required
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                        placeholder="john@example.com"
                      />
                    </div>

                    <div>
                      <label htmlFor="customerPhone" className="block text-sm font-medium text-gray-700">
                        Customer Phone
                      </label>
                      <input
                        type="tel"
                        id="customerPhone"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                        placeholder="0412 345 678"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* TASK TAB FIELDS */}
              {effectiveTab === 'task' && (
                <>
                  {/* Customer (optional) & Ticket Number (optional) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="customerName" className="block text-sm font-medium text-gray-700">
                        Customer (optional)
                      </label>
                      <input
                        type="text"
                        id="customerName"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                        placeholder="Customer name"
                      />
                    </div>

                    <div>
                      <label htmlFor="relatedTicket" className="block text-sm font-medium text-gray-700">
                        Ticket Number (optional)
                      </label>
                      <input
                        type="text"
                        id="relatedTicket"
                        value={relatedTicket}
                        onChange={(e) => setRelatedTicket(e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                        placeholder="TKT-123 or @123"
                      />
                    </div>
                  </div>

                  {/* Deadline Date & Time */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Deadline (optional)
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={deadlineDate}
                        onChange={(e) => setDeadlineDate(e.target.value)}
                        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                      />
                      <div className="flex items-center gap-1">
                        <select
                          value={deadlineHour}
                          onChange={(e) => setDeadlineHour(e.target.value)}
                          className="w-16 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-2 py-2 border"
                        >
                          {hours.map(h => (
                            <option key={h} value={h}>{h}</option>
                          ))}
                        </select>
                        <span className="text-gray-500 font-medium">:</span>
                        <select
                          value={deadlineMinute}
                          onChange={(e) => setDeadlineMinute(e.target.value)}
                          className="w-16 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-2 py-2 border"
                        >
                          {minutes.map(m => (
                            <option key={m} value={m}>{m}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Priority & Assign To (Both tabs) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                    Priority *
                  </label>
                  <select
                    id="priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="assignTo" className="block text-sm font-medium text-gray-700">
                    Assign To
                  </label>
                  <select
                    id="assignTo"
                    value={assignTo}
                    onChange={(e) => setAssignTo(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                  >
                    {staffList
                      .filter((staff: StaffUser) => staff.id !== 'ai-agent-001')
                      .map((staff: StaffUser) => (
                        <option key={staff.id} value={staff.id}>
                          {staff.first_name} {staff.last_name}
                        </option>
                      ))}
                    <option value="ai-agent-001">McCarthy AI</option>
                  </select>
                </div>
              </div>

              {/* Subject / Task Title */}
              <div>
                <label htmlFor="subject" className="block text-sm font-medium text-gray-700">
                  {effectiveTab === 'email' ? 'Subject *' : 'Task Subject Title *'}
                </label>
                <input
                  type="text"
                  id="subject"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                  placeholder={effectiveTab === 'email' ? 'Order status inquiry' : 'Update shipping info for order #12345'}
                />
              </div>

              {/* Message / Task Description */}
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                  {effectiveTab === 'email' ? 'Email Message *' : 'Task Description *'}
                </label>
                <textarea
                  id="message"
                  required
                  rows={6}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm px-3 py-2 border"
                  placeholder={effectiveTab === 'email' 
                    ? 'Your email message to the customer...' 
                    : 'Describe what needs to be done...'}
                />
              </div>

              {/* Info Message - Email only */}
              {effectiveTab === 'email' && (
                <div className="rounded-md bg-blue-50 p-3 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-500 flex-shrink-0" />
                  <p className="text-sm text-blue-800">
                    This will send an email to the customer and create a ticket.
                  </p>
                </div>
              )}

              {/* Error Message */}
              {createMutation.isError && (
                <div className="rounded-md bg-red-50 p-4">
                  <p className="text-sm text-red-800">
                    Failed to create {effectiveTab === 'email' ? 'ticket' : 'task'}. Please try again.
                  </p>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createMutation.isPending 
                    ? 'Creating...' 
                    : effectiveTab === 'email' 
                      ? 'Send Email & Create Ticket' 
                      : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
