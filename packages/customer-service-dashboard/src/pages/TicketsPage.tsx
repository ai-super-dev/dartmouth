import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ticketsApi } from '../lib/api'
import { formatDistanceToNow } from 'date-fns'

const statusColors = {
  open: 'bg-green-50 text-green-700 ring-green-600/20',
  pending: 'bg-yellow-50 text-yellow-700 ring-yellow-600/20',
  'in-progress': 'bg-blue-50 text-blue-700 ring-blue-600/20',
  resolved: 'bg-gray-50 text-gray-700 ring-gray-600/20',
  closed: 'bg-gray-50 text-gray-700 ring-gray-600/20',
  escalated: 'bg-red-50 text-red-700 ring-red-600/20',
  snoozed: 'bg-purple-50 text-purple-700 ring-purple-600/20',
}

const priorityColors = {
  low: 'text-gray-600',
  normal: 'text-blue-600',
  high: 'text-orange-600',
  critical: 'text-red-600',
  urgent: 'text-red-700 font-bold',
}

export default function TicketsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['tickets'],
    queryFn: async () => {
      const response = await ticketsApi.list()
      return response.data.tickets
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading tickets...</div>
      </div>
    )
  }

  const tickets = data || []

  return (
    <div>
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-2xl font-semibold leading-6 text-gray-900">Tickets</h1>
          <p className="mt-2 text-sm text-gray-700">
            A list of all customer service tickets including their status, priority, and assignment.
          </p>
        </div>
      </div>
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                    Ticket #
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Customer
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Subject
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Priority
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Created
                  </th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-0">
                    <span className="sr-only">View</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-sm text-gray-500">
                      No tickets found
                    </td>
                  </tr>
                ) : (
                  tickets.map((ticket: any) => (
                    <tr key={ticket.ticket_id}>
                      <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">
                        {ticket.ticket_number}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        <div>{ticket.customer_name}</div>
                        <div className="text-gray-400">{ticket.customer_email}</div>
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {ticket.subject || ticket.description || 'No subject'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${statusColors[ticket.status as keyof typeof statusColors] || statusColors.open}`}>
                          {ticket.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm">
                        <span className={priorityColors[ticket.priority as keyof typeof priorityColors] || priorityColors.normal}>
                          {ticket.priority}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                        {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                      </td>
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                        <Link to={`/tickets/${ticket.ticket_id}`} className="text-primary-600 hover:text-primary-900">
                          View<span className="sr-only">, {ticket.ticket_number}</span>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}


