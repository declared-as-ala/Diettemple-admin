'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface SupportTicket {
  _id: string;
  name: string;
  email: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  message: string;
  adminNotes?: string;
  createdAt: string;
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    loadTickets();
  }, [filterStatus, filterPriority]);

  const loadTickets = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (filterStatus) params.status = filterStatus;
      if (filterPriority) params.priority = filterPriority;

      const data = await api.getSupport(params);
      setTickets(data.tickets);
    } catch (error) {
      console.error('Failed to load tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTicket = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    setAdminNotes(ticket.adminNotes || '');
  };

  const handleUpdateTicket = async (status?: string, priority?: string) => {
    if (!selectedTicket) return;

    setUpdatingId(selectedTicket._id);
    try {
      const updates: any = {};
      if (status !== undefined) updates.status = status;
      if (priority !== undefined) updates.priority = priority;
      if (adminNotes !== undefined) updates.adminNotes = adminNotes;

      const response = await api.updateSupportTicket(selectedTicket._id, updates);

      if (response.ticket) {
        setSelectedTicket(response.ticket as any);
        setTickets(
          tickets.map((t) => (t._id === selectedTicket._id ? (response.ticket as any) : t))
        );
      }
    } catch (error) {
      console.error('Failed to update ticket:', error);
    } finally {
      setUpdatingId(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-500';
      case 'in-progress':
        return 'bg-purple-500';
      case 'resolved':
        return 'bg-green-500';
      case 'closed':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
      {/* Tickets List */}
      <Card className="md:col-span-1">
        <CardHeader>
          <CardTitle>Support Tickets</CardTitle>
          <CardDescription>Total: {tickets.length}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="space-y-3">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in-progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Priority</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tickets */}
          <div className="space-y-2 max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="text-center text-sm text-gray-500">Loading...</div>
            ) : tickets.length === 0 ? (
              <div className="text-center text-sm text-gray-500">No tickets found</div>
            ) : (
              tickets.map((ticket) => (
                <button
                  key={ticket._id}
                  onClick={() => handleSelectTicket(ticket)}
                  className={`w-full text-left p-3 rounded border cursor-pointer transition ${
                    selectedTicket?._id === ticket._id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-sm truncate">{ticket.subject}</div>
                  <div className="text-xs text-gray-600 mt-1">{ticket.name}</div>
                  <div className="flex gap-2 mt-2">
                    <Badge className={`text-xs ${getStatusColor(ticket.status)}`}>
                      {ticket.status}
                    </Badge>
                    <Badge className={`text-xs ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </Badge>
                  </div>
                </button>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Ticket Detail */}
      <Card className="md:col-span-2">
        {selectedTicket ? (
          <>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{selectedTicket.subject}</CardTitle>
                  <CardDescription>{selectedTicket.email}</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Badge className={`${getStatusColor(selectedTicket.status)}`}>
                    {selectedTicket.status}
                  </Badge>
                  <Badge className={`${getPriorityColor(selectedTicket.priority)}`}>
                    {selectedTicket.priority}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Ticket Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium text-gray-600">From</div>
                  <div>{selectedTicket.name}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-600">Email</div>
                  <div className="break-all">{selectedTicket.email}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-600">Category</div>
                  <div className="capitalize">{selectedTicket.category}</div>
                </div>
                <div>
                  <div className="font-medium text-gray-600">Submitted</div>
                  <div>{new Date(selectedTicket.createdAt).toLocaleDateString()}</div>
                </div>
              </div>

              {/* Message */}
              <div>
                <div className="font-medium text-sm mb-2">Message</div>
                <div className="bg-gray-50 p-3 rounded text-sm whitespace-pre-wrap">
                  {selectedTicket.message}
                </div>
              </div>

              {/* Admin Actions */}
              <div className="space-y-4 border-t pt-4">
                <div>
                  <label className="text-sm font-medium block mb-2">Update Status</label>
                  <Select
                    value={selectedTicket.status}
                    onValueChange={(value) => handleUpdateTicket(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">Update Priority</label>
                  <Select
                    value={selectedTicket.priority}
                    onValueChange={(value) => handleUpdateTicket(undefined, value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium block mb-2">Admin Notes</label>
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add internal notes..."
                    className="min-h-20 text-sm"
                  />
                  <Button
                    onClick={() => handleUpdateTicket()}
                    disabled={updatingId === selectedTicket._id}
                    className="mt-2"
                  >
                    {updatingId === selectedTicket._id ? 'Saving...' : 'Save Notes'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </>
        ) : (
          <CardContent className="pt-6">
            <div className="text-center text-gray-500">
              Select a ticket to view details
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
