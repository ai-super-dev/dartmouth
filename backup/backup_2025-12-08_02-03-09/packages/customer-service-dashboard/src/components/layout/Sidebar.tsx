import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../lib/api'

interface StaffMember {
  id: string
  first_name: string
  last_name: string
  availability_status: string
}

interface SidebarProps {
  ticketCounts?: {
    all: number
    myTickets: number
    pending: number
    unassigned: number
    snoozed: number
    resolved: number
    escalated: number
    escalatedToMe: number
    vip: number
    allAssigned: number
    staffCounts?: Record<string, number>
  }
  isCollapsed: boolean
  onToggle: () => void
}

export default function Sidebar({ 
  ticketCounts = { all: 0, myTickets: 0, pending: 0, unassigned: 0, snoozed: 0, resolved: 0, escalated: 0, escalatedToMe: 0, vip: 0, allAssigned: 0, staffCounts: {} },
  isCollapsed,
  onToggle
}: SidebarProps) {
  // Fetch staff list
  const { data: staffData } = useQuery({
    queryKey: ['staff-list-sidebar'],
    queryFn: async () => {
      const response = await api.get('/api/staff')
      return response.data
    },
    staleTime: 60000, // Cache for 1 minute
  })
  const staffList: StaffMember[] = staffData?.staff || []
  const location = useLocation()
  const navigate = useNavigate()
  
  // All sections collapsed by default
  const [isTicketsExpanded, setIsTicketsExpanded] = useState(false)
  const [isCustomersExpanded, setIsCustomersExpanded] = useState(false)
  const [isStaffExpanded, setIsStaffExpanded] = useState(false)
  const [isGroupChatExpanded, setIsGroupChatExpanded] = useState(false)
  const [isSettingsExpanded, setIsSettingsExpanded] = useState(false)
  const [isAssignedExpanded, setIsAssignedExpanded] = useState(false)
  // Settings submenus
  const [isIntegrationsExpanded, setIsIntegrationsExpanded] = useState(false)
  const [isMetaExpanded, setIsMetaExpanded] = useState(false)
  const [isGeneralExpanded, setIsGeneralExpanded] = useState(false)
  const [isBillingExpanded, setIsBillingExpanded] = useState(false)
  const [isBusinessExpanded, setIsBusinessExpanded] = useState(false)
  const [isAIAgentExpanded, setIsAIAgentExpanded] = useState(false)

  const isActive = (path: string) => location.pathname === path

  // Collapsible section component
  const CollapsibleSection = ({ 
    title, 
    icon, 
    isExpanded, 
    onToggle: toggleSection, 
    children,
    hasSubmenu = true 
  }: { 
    title: string
    icon: React.ReactNode | null
    isExpanded: boolean
    onToggle: () => void
    children?: React.ReactNode
    hasSubmenu?: boolean
  }) => (
    <div className="mb-2">
      <button
        onClick={toggleSection}
        className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-gray-50 transition-colors"
      >
        <span className="flex items-center text-gray-700 font-medium">
          {icon}
          <span className={icon ? "ml-2" : ""}>{title}</span>
        </span>
        {hasSubmenu && (
          isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )
        )}
      </button>
      {isExpanded && children && (
        <div className="ml-6 mt-1 space-y-1">
          {children}
        </div>
      )}
    </div>
  )

  // Simple nav link - improved matching logic
  const NavLink = ({ to, children, count }: { to: string; children: React.ReactNode; count?: number }) => {
    // Check if this link is active
    const checkIsActive = () => {
      const [linkPath, linkQuery] = to.split('?');
      const currentPath = location.pathname;
      const currentSearch = location.search;
      
      // For links with query params (e.g., /tickets?filter=my)
      if (linkQuery) {
        return currentPath === linkPath && currentSearch.includes(linkQuery);
      }
      
      // For plain links (e.g., /tickets) - only match if NO query params
      return currentPath === linkPath && !currentSearch;
    };
    
    return (
      <Link
        to={to}
        preventScrollReset={true}
        className={`flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
          checkIsActive()
            ? 'bg-indigo-50 text-indigo-700 font-medium'
            : 'text-gray-600 hover:bg-gray-50'
        }`}
      >
        <span>{children}</span>
        {count !== undefined && (
          <span className="px-2 py-0.5 text-xs rounded-full bg-gray-200 text-gray-700">
            {count}
          </span>
        )}
      </Link>
    );
  }

  // Sub-nav link (indented)
  const SubNavLink = ({ to, children }: { to: string; children: React.ReactNode }) => (
    <Link
      to={to}
      preventScrollReset={true}
      className={`block px-3 py-1.5 text-sm rounded-lg transition-colors ${
        isActive(to)
          ? 'bg-indigo-50 text-indigo-700 font-medium'
          : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
      }`}
    >
      {children}
    </Link>
  )

  // Icons
  const TicketsIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  )
  
  const AIChatIcon = () => (
    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
      <path d="M7 9h10v2H7zm0-3h10v2H7z"/>
    </svg>
  )
  
  const GroupChatIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
    </svg>
  )
  
  const StaffIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
  
  const CustomersIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  )
  
  const AnalyticsIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
  
  const SettingsIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  )

  return (
    <div className={`bg-white border-r border-gray-200 h-screen flex flex-col transition-all duration-300 ${
      isCollapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Header with hamburger - h-14 matches main header */}
      <div className="flex-shrink-0 h-14 flex items-center px-4 border-b border-gray-200">
        <button
          onClick={onToggle}
          className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          title={isCollapsed ? "Expand Navigation" : "Collapse Navigation"}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {isCollapsed ? (
        /* Collapsed View - All 7 icons */
        <div className="flex flex-col items-center py-4 space-y-3">
          {/* Tickets */}
          <button 
            onClick={() => { onToggle(); navigate('/tickets'); setIsTicketsExpanded(true); }} 
            className={`p-2 rounded-lg transition-colors ${
              location.pathname === '/tickets' || location.pathname.startsWith('/tickets/')
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
            }`} 
            title="Tickets"
          >
            <TicketsIcon />
          </button>
          
          {/* AI Chat */}
          <button 
            onClick={() => { onToggle(); navigate('/chat'); }} 
            className={`p-2 rounded-lg transition-colors ${
              location.pathname === '/chat'
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
            }`} 
            title="AI Chat"
          >
            <AIChatIcon />
          </button>
          
          {/* Group Chat */}
          <button 
            onClick={() => { onToggle(); navigate('/group-chat'); setIsGroupChatExpanded(true); }} 
            className={`p-2 rounded-lg transition-colors ${
              location.pathname.startsWith('/group-chat') || location.pathname === '/notifications' || location.pathname === '/mentions'
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
            }`} 
            title="Group Chat"
          >
            <GroupChatIcon />
          </button>
          
          {/* Staff */}
          <button 
            onClick={() => { onToggle(); navigate('/staff'); setIsStaffExpanded(true); }} 
            className={`p-2 rounded-lg transition-colors ${
              location.pathname.startsWith('/staff')
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
            }`} 
            title="Staff"
          >
            <StaffIcon />
          </button>
          
          {/* Customers */}
          <button 
            onClick={() => { onToggle(); navigate('/customers'); setIsCustomersExpanded(true); }} 
            className={`p-2 rounded-lg transition-colors ${
              location.pathname.startsWith('/customers')
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
            }`} 
            title="Customers"
          >
            <CustomersIcon />
          </button>
          
          {/* Analytics */}
          <button 
            onClick={() => { onToggle(); navigate('/analytics/ai-agent'); }} 
            className={`p-2 rounded-lg transition-colors ${
              location.pathname.startsWith('/analytics')
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
            }`} 
            title="Analytics"
          >
            <AnalyticsIcon />
          </button>
          
          {/* Settings */}
          <button 
            onClick={() => { onToggle(); navigate('/settings'); setIsSettingsExpanded(true); }} 
            className={`p-2 rounded-lg transition-colors ${
              location.pathname.startsWith('/settings') || location.pathname.startsWith('/ai-agent')
                ? 'bg-indigo-50 text-indigo-600'
                : 'text-gray-600 hover:bg-indigo-50 hover:text-indigo-600'
            }`} 
            title="Settings"
          >
            <SettingsIcon />
          </button>
        </div>
      ) : (
        /* Expanded View */
        <div className="overflow-y-auto flex-1 p-3">
          
          {/* Tickets Section */}
          <CollapsibleSection
            title="Tickets"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
            isExpanded={isTicketsExpanded}
            onToggle={() => setIsTicketsExpanded(!isTicketsExpanded)}
          >
            <NavLink to="/tickets" count={ticketCounts.all}>All Tickets</NavLink>
            <NavLink to="/tickets?filter=my" count={ticketCounts.myTickets}>My Tickets</NavLink>
            <NavLink to="/tickets?status=open" count={ticketCounts.pending}>Open (in-progress)</NavLink>
            
            {/* Assigned - Nested collapsible under Open */}
            <div>
              <button
                onClick={() => setIsAssignedExpanded(!isAssignedExpanded)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-gray-600">Assigned</span>
                {isAssignedExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {isAssignedExpanded && (
                <div className="ml-4 mt-1 space-y-1">
                  <NavLink to="/tickets?filter=all-assigned" count={ticketCounts.allAssigned}>All</NavLink>
                  {/* Dynamic staff list */}
                  {staffList
                    .filter(staff => staff.id !== 'ai-agent-001') // Exclude AI from assigned staff
                    .map(staff => (
                      <NavLink 
                        key={staff.id} 
                        to={`/tickets?assigned=${staff.id}`} 
                        count={ticketCounts.staffCounts?.[staff.id] || 0}
                      >
                        {staff.first_name}
                      </NavLink>
                    ))
                  }
                  {/* McCarthy AI */}
                  <NavLink 
                    to="/tickets?assigned=ai-agent-001" 
                    count={ticketCounts.staffCounts?.['ai-agent-001'] || 0}
                  >
                    McCarthy AI
                  </NavLink>
                </div>
              )}
            </div>
            
            <NavLink to="/tickets?filter=unassigned" count={ticketCounts.unassigned}>Unassigned</NavLink>
            <NavLink to="/tickets?status=snoozed" count={ticketCounts.snoozed}>Snoozed</NavLink>
            <NavLink to="/tickets?filter=vip" count={ticketCounts.vip}>VIP</NavLink>
            <NavLink to="/tickets?status=resolved" count={ticketCounts.resolved}>Resolved</NavLink>
          </CollapsibleSection>

          {/* AI Chat - Direct Link */}
          <Link
            to="/chat"
            className={`flex items-center px-3 py-2 mb-2 text-sm rounded-lg transition-colors ${
              isActive('/chat')
                ? 'bg-indigo-50 text-indigo-700 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z"/>
              <path d="M7 9h10v2H7zm0-3h10v2H7z"/>
            </svg>
            AI Chat
          </Link>

          {/* Group Chat Section */}
          <CollapsibleSection
            title="Group Chat"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>}
            isExpanded={isGroupChatExpanded}
            onToggle={() => setIsGroupChatExpanded(!isGroupChatExpanded)}
          >
            <SubNavLink to="/group-chat">All Chats</SubNavLink>
            <SubNavLink to="/mentions">@Mentions</SubNavLink>
          </CollapsibleSection>

          {/* Staff Section */}
          <CollapsibleSection
            title="Staff"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
            isExpanded={isStaffExpanded}
            onToggle={() => setIsStaffExpanded(!isStaffExpanded)}
          >
            <SubNavLink to="/staff">List</SubNavLink>
            <SubNavLink to="/staff/hours">Hours</SubNavLink>
            <SubNavLink to="/staff/assignment">Assignment</SubNavLink>
            <SubNavLink to="/staff/performance">Performance</SubNavLink>
            <SubNavLink to="/staff/views">Private Views</SubNavLink>
          </CollapsibleSection>

          {/* Customers Section */}
          <CollapsibleSection
            title="Customers"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
            isExpanded={isCustomersExpanded}
            onToggle={() => setIsCustomersExpanded(!isCustomersExpanded)}
          >
            <SubNavLink to="/customers">All Customers</SubNavLink>
            <SubNavLink to="/customers/vip">VIP Customers</SubNavLink>
          </CollapsibleSection>

          {/* Analytics - Direct Link */}
          <Link
            to="/analytics/ai-agent"
            className={`flex items-center px-3 py-2 mb-2 text-sm rounded-lg transition-colors ${
              location.pathname.startsWith('/analytics')
                ? 'bg-indigo-50 text-indigo-700 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Analytics
          </Link>

          {/* Settings Section */}
          <CollapsibleSection
            title="Settings"
            icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
            isExpanded={isSettingsExpanded}
            onToggle={() => setIsSettingsExpanded(!isSettingsExpanded)}
          >
            {/* Dartmouth OS - System Settings */}
            <SubNavLink to="/settings/dartmouth-os">Dartmouth OS</SubNavLink>
            
            {/* Business submenu */}
            <div className="mb-1">
              <button
                onClick={() => setIsBusinessExpanded(!isBusinessExpanded)}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                  location.pathname.startsWith('/settings/business')
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>Business</span>
                {isBusinessExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {isBusinessExpanded && (
                <div className="ml-4 mt-1 space-y-1">
                  <SubNavLink to="/settings/business-hours">Operational Hours</SubNavLink>
                  <SubNavLink to="/settings/auto-assignment">Auto-Assignment</SubNavLink>
                </div>
              )}
            </div>
            
            {/* AI Agent submenu */}
            <div className="mb-1">
              <button
                onClick={() => setIsAIAgentExpanded(!isAIAgentExpanded)}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                  location.pathname.startsWith('/ai-agent')
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>AI Agent</span>
                {isAIAgentExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {isAIAgentExpanded && (
                <div className="ml-4 mt-1 space-y-1">
                  <SubNavLink to="/ai-agent/widget">Widget & Embed</SubNavLink>
                  <SubNavLink to="/ai-agent/knowledge">RAG Knowledge</SubNavLink>
                  <SubNavLink to="/ai-agent/system-message">System Message</SubNavLink>
                  <SubNavLink to="/ai-agent/regional-overrides">Regional Overrides</SubNavLink>
                </div>
              )}
            </div>
            
            {/* Group Chat Settings */}
            <SubNavLink to="/settings/group-chat">Group Chat</SubNavLink>

            {/* Integrations submenu */}
            <div className="mb-1">
              <button
                onClick={() => setIsIntegrationsExpanded(!isIntegrationsExpanded)}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                  location.pathname.startsWith('/settings/integrations')
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>Integrations</span>
                {isIntegrationsExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {isIntegrationsExpanded && (
                <div className="ml-4 mt-1 space-y-1">
                  <SubNavLink to="/settings/integrations/perp">Print ERP</SubNavLink>
                  <SubNavLink to="/settings/integrations/shopify">Shopify</SubNavLink>
                </div>
              )}
            </div>
            
            {/* Meta submenu */}
            <div className="mb-1">
              <button
                onClick={() => setIsMetaExpanded(!isMetaExpanded)}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                  location.pathname.startsWith('/settings/meta')
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>Meta</span>
                {isMetaExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {isMetaExpanded && (
                <div className="ml-4 mt-1 space-y-1">
                  <SubNavLink to="/settings/meta/facebook">Facebook</SubNavLink>
                  <SubNavLink to="/settings/meta/instagram">Instagram</SubNavLink>
                  <SubNavLink to="/settings/meta/messenger">Messenger</SubNavLink>
                  <SubNavLink to="/settings/meta/whatsapp">WhatsApp</SubNavLink>
                </div>
              )}
            </div>
            
            {/* General submenu */}
            <div className="mb-1">
              <button
                onClick={() => setIsGeneralExpanded(!isGeneralExpanded)}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                  location.pathname.startsWith('/settings/general')
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>General</span>
                {isGeneralExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {isGeneralExpanded && (
                <div className="ml-4 mt-1 space-y-1">
                  <SubNavLink to="/settings/general/auth">Auth & Security</SubNavLink>
                  <SubNavLink to="/settings/general/templates">Templates</SubNavLink>
                  <SubNavLink to="/settings/general/tags">Tags</SubNavLink>
                </div>
              )}
            </div>
            
            {/* Billing submenu */}
            <div className="mb-1">
              <button
                onClick={() => setIsBillingExpanded(!isBillingExpanded)}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors ${
                  location.pathname.startsWith('/settings/billing')
                    ? 'bg-indigo-50 text-indigo-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>Billing</span>
                {isBillingExpanded ? (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                )}
              </button>
              {isBillingExpanded && (
                <div className="ml-4 mt-1 space-y-1">
                  <SubNavLink to="/settings/billing/subscription">Subscription</SubNavLink>
                  <SubNavLink to="/settings/billing/transactions">Transactions</SubNavLink>
                </div>
              )}
            </div>
          </CollapsibleSection>

        </div>
      )}
    </div>
  )
}
