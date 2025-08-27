"use client";

import React, { useState, useEffect } from "react";
import { 
  MessageSquare, 
  User, 
  Clock, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Filter,
  Search,
  ExternalLink,
  X
} from "lucide-react";
import { db } from "@/lib/firebase-config";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc,
  Timestamp 
} from "firebase/firestore";
import { formatDistanceToNow } from "date-fns";

interface SupportTicket {
  id: string;
  sessionId: string;
  userId: string | null;
  userEmail: string;
  userName: string;
  userTier: string;
  issue: string;
  status: "open" | "in-progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  createdAt: Timestamp;
  assignedTo?: string;
  notes?: string;
  messages: Array<{
    content: string;
    sender: string;
    timestamp: Timestamp;
  }>;
}

const statusColors = {
  open: "bg-yellow-500",
  "in-progress": "bg-blue-500",
  resolved: "bg-green-500",
  closed: "bg-gray-500",
};

const priorityColors = {
  low: "text-gray-400",
  medium: "text-yellow-400",
  high: "text-orange-400",
  urgent: "text-red-400",
};

const tierColors = {
  guest: "text-gray-400",
  starter: "text-white",
  rising: "text-blue-400",
  pro: "text-purple-400",
  pixlbeast: "text-yellow-400",
  pixlionaire: "text-red-400",
};

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);

  useEffect(() => {
    const q = query(
      collection(db, "support-tickets"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ticketData: SupportTicket[] = [];
      snapshot.forEach((doc) => {
        ticketData.push({ id: doc.id, ...doc.data() } as SupportTicket);
      });
      setTickets(ticketData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleStatusUpdate = async (ticketId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, "support-tickets", ticketId), {
        status: newStatus,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error("Error updating ticket status:", error);
    }
  };

  const handlePriorityUpdate = async (ticketId: string, newPriority: string) => {
    try {
      await updateDoc(doc(db, "support-tickets", ticketId), {
        priority: newPriority,
        updatedAt: Timestamp.now(),
      });
    } catch (error) {
      console.error("Error updating ticket priority:", error);
    }
  };

  const filteredTickets = tickets.filter((ticket) => {
    const matchesStatus = filterStatus === "all" || ticket.status === filterStatus;
    const matchesPriority = filterPriority === "all" || ticket.priority === filterPriority;
    const matchesSearch = searchTerm === "" || 
      ticket.issue.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.userName.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesPriority && matchesSearch;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "open":
        return <AlertCircle className="h-4 w-4" />;
      case "in-progress":
        return <Clock className="h-4 w-4" />;
      case "resolved":
        return <CheckCircle className="h-4 w-4" />;
      case "closed":
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Support Tickets</h2>
        <p className="text-gray-400">
          Manage customer support tickets and chat sessions
        </p>
      </div>

      {/* Filters and Search */}
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-gray-600"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-600"
              aria-label="Filter by status"
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="in-progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          {/* Priority Filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-600"
            aria-label="Filter by priority"
          >
            <option value="all">All Priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Ticket
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Issue
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredTickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-mono text-gray-300">
                      #{ticket.id.slice(-6).toUpperCase()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8 bg-gray-700 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-white">
                          {ticket.userName}
                        </div>
                        <div className="text-xs text-gray-400">
                          {ticket.userEmail}
                        </div>
                        <div className={`text-xs font-medium ${tierColors[ticket.userTier]}`}>
                          {ticket.userTier.charAt(0).toUpperCase() + ticket.userTier.slice(1)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-300 max-w-xs truncate">
                      {ticket.issue}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={ticket.status}
                      onChange={(e) => handleStatusUpdate(ticket.id, e.target.value)}
                      className={`px-3 py-1 text-xs font-medium rounded-full ${
                        statusColors[ticket.status]
                      } text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900`}
                      aria-label="Ticket status"
                    >
                      <option value="open">Open</option>
                      <option value="in-progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="closed">Closed</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <select
                      value={ticket.priority}
                      onChange={(e) => handlePriorityUpdate(ticket.id, e.target.value)}
                      className={`px-3 py-1 text-xs font-medium rounded-lg bg-gray-800 ${
                        priorityColors[ticket.priority]
                      } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900`}
                      aria-label="Ticket priority"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {formatDistanceToNow(ticket.createdAt.toDate(), { addSuffix: true })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => setSelectedTicket(ticket)}
                      className="text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                    >
                      <span>View</span>
                      <ExternalLink className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTickets.length === 0 && (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No tickets found</p>
          </div>
        )}
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-white">
                  Ticket #{selectedTicket.id.slice(-6).toUpperCase()}
                </h3>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="text-gray-400 hover:text-white"
                  aria-label="Close ticket details"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* User Info */}
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">User Information</h4>
                  <div className="bg-gray-800 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Name:</span>
                      <span className="text-white">{selectedTicket.userName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Email:</span>
                      <span className="text-white">{selectedTicket.userEmail}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Tier:</span>
                      <span className={tierColors[selectedTicket.userTier]}>
                        {selectedTicket.userTier.charAt(0).toUpperCase() + selectedTicket.userTier.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Issue */}
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Issue Description</h4>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <p className="text-white">{selectedTicket.issue}</p>
                  </div>
                </div>

                {/* Chat History */}
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Chat History</h4>
                  <div className="bg-gray-800 rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
                    {selectedTicket.messages.map((message, index) => (
                      <div
                        key={index}
                        className={`flex ${
                          message.sender === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg ${
                            message.sender === "user"
                              ? "bg-blue-600 text-white"
                              : "bg-gray-700 text-gray-200"
                          }`}
                        >
                          <p className="text-sm">{message.content}</p>
                          <p className="text-xs opacity-70 mt-1">
                            {formatDistanceToNow(message.timestamp.toDate(), { addSuffix: true })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-800">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    // In a real app, this would open a chat interface
                    alert("Opening chat interface...");
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  Reply to User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
