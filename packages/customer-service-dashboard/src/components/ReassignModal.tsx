import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ticketsApi, api } from '../lib/api'
import { Sparkles } from 'lucide-react'

interface ReassignModalProps {
  isOpen: boolean
  onClose: () => void
  onReassign: (staffId: string | null, staffName: string, reason?: string) => void
  currentAssignment?: string
  // For bulk mode
  bulkMode?: boolean
  selectedTickets?: Array<{ ticket_id: string; ticket_number: string; subject: string }>
}

interface StaffMember {
  id: string
  name: string
  role: string
  online: boolean
  openTickets: number
  availability_status: string
}

export default function ReassignModal({ isOpen, onClose, onReassign, currentAssignment, bulkMode, selectedTickets }: ReassignModalProps) {
  const [selectedStaff, setSelectedStaff] = useState<string>('')
  const [reassignReason, setReassignReason] = useState<string>('')
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])

  // Fetch staff list with real online status
  const { data: staffData } = useQuery({
    queryKey: ['staff-list'],
    queryFn: async () => {
      const response = await api.get('/api/staff')
      return response.data?.staff || []
    },
    enabled: isOpen
  })

  // Fetch all tickets to calculate open counts
  const { data: tickets } = useQuery({
    queryKey: ['tickets-for-reassign'],
    queryFn: async () => {
      const response = await ticketsApi.list({ limit: 1000 })
      return response.data?.tickets || []
    },
    enabled: isOpen
  })

  useEffect(() => {
    if (staffData && tickets) {
      // Include all staff including McCarthy AI
      const staffWithCounts = staffData
        .map((staff: any) => {
          const openCount = tickets.filter((t: any) => 
            t.assigned_to === staff.id && 
            (t.status === 'open' || t.status === 'in-progress')
          ).length
          
          return {
            id: staff.id,
            name: `${staff.first_name} ${staff.last_name}`,
            role: staff.title || 'Staff',
            online: staff.availability_status === 'online',
            availability_status: staff.availability_status || 'offline',
            openTickets: openCount
          }
        })
      setStaffMembers(staffWithCounts)
    }
  }, [staffData, tickets])

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedStaff('')
      setReassignReason('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const onlineStaff = staffMembers.filter(s => s.online)
  const isOnlyStaffOnline = onlineStaff.length === 1

  const handleReassign = () => {
    if (!selectedStaff) return
    
    if (selectedStaff === 'unassigned') {
      onReassign(null, 'Unassigned', reassignReason || undefined)
    } else {
      const staff = staffMembers.find(s => s.id === selectedStaff)
      if (staff) {
        onReassign(staff.id, staff.name, reassignReason || undefined)
      }
    }
    onClose()
  }

  const ticketCount = bulkMode && selectedTickets ? selectedTickets.length : 1

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Fixed Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900">
            {bulkMode ? `Reassign ${ticketCount} Ticket${ticketCount > 1 ? 's' : ''}` : 'Reassign Ticket'}
          </h3>
        </div>

        {/* Scrollable Content */}
        <div className="px-6 py-4 overflow-y-auto flex-1">
          {bulkMode && selectedTickets && selectedTickets.length > 0 ? (
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Reassign the following ticket{ticketCount > 1 ? 's' : ''} to another staff member:
              </p>
              <div className="bg-gray-50 rounded-lg p-3 max-h-32 overflow-y-auto">
                <ul className="space-y-1">
                  {selectedTickets.map((ticket) => (
                    <li key={ticket.ticket_id} className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-900">{ticket.ticket_number}</span>
                      <span className="text-gray-500 truncate">- {ticket.subject}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600 mb-4">
              Reassign ticket #{currentAssignment || 'Unassigned'} to another staff member:
            </p>
          )}

          {isOnlyStaffOnline && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm text-amber-800">
                ℹ️ You're the only staff member online
              </p>
            </div>
          )}

          <div className="space-y-2">
            {/* McCarthy AI option - shown first */}
            {staffMembers.filter(s => s.id === 'ai-agent-001').map((staff) => (
              <label
                key={staff.id}
                className={`flex items-center p-3 border rounded-lg transition-colors cursor-pointer hover:bg-gray-50 ${
                  selectedStaff === staff.id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="staff"
                  value={staff.id}
                  checked={selectedStaff === staff.id}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 flex-shrink-0 mr-3"
                />
                <div className="w-2 h-2 rounded-full mr-3 bg-green-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    McCarthy AI
                  </p>
                  <p className="text-xs text-gray-500">Return to AI handling</p>
                </div>
                <div className="text-right min-w-[60px]">
                  <p className="text-xs text-gray-500">{staff.openTickets} open</p>
                </div>
              </label>
            ))}

            {/* Staff members - excluding McCarthy AI */}
            {staffMembers.filter(s => s.id !== 'ai-agent-001').map((staff) => (
              <label
                key={staff.id}
                className={`flex items-center p-3 border rounded-lg transition-colors cursor-pointer hover:bg-gray-50 ${
                  selectedStaff === staff.id
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="staff"
                  value={staff.id}
                  checked={selectedStaff === staff.id}
                  onChange={(e) => setSelectedStaff(e.target.value)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 flex-shrink-0 mr-3"
                />
                <div className={`w-2 h-2 rounded-full mr-3 ${
                  staff.availability_status === 'online' ? 'bg-green-500' : 
                  staff.availability_status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
                }`} />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{staff.name}</p>
                  <p className="text-xs text-gray-500 capitalize">{staff.availability_status || 'Offline'}</p>
                </div>
                <div className="text-right min-w-[60px]">
                  <p className="text-xs text-gray-500">{staff.openTickets} open</p>
                </div>
              </label>
            ))}

          </div>

          {/* Unassigned option */}
          <div className="mt-2">
            <label
              className={`flex items-center p-3 border rounded-lg transition-colors cursor-pointer hover:bg-gray-50 ${
                selectedStaff === 'unassigned'
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="staff"
                value="unassigned"
                checked={selectedStaff === 'unassigned'}
                onChange={(e) => setSelectedStaff(e.target.value)}
                className="h-4 w-4 text-amber-600 focus:ring-amber-500 flex-shrink-0 mr-3"
              />
              <div className="w-2 h-2 rounded-full mr-3 bg-gray-400" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">Remove Assignment</p>
                <p className="text-xs text-gray-500">Ticket will be unassigned</p>
              </div>
            </label>
          </div>

          {/* Reason field - at the bottom */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
            <textarea
              value={reassignReason}
              onChange={(e) => setReassignReason(e.target.value)}
              placeholder="e.g., Sales inquiry, needs technical support..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex justify-end gap-3 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleReassign}
            disabled={!selectedStaff}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {bulkMode ? `Reassign ${ticketCount} Ticket${ticketCount > 1 ? 's' : ''}` : 'Reassign Ticket'}
          </button>
        </div>
      </div>
    </div>
  )
}
