import { useParams } from 'react-router-dom'

export default function TicketDetailPage() {
  const { id } = useParams()

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900">Ticket Detail</h1>
      <p className="mt-2 text-sm text-gray-700">Ticket ID: {id}</p>
      <div className="mt-4 text-gray-500">Coming soon...</div>
    </div>
  )
}


