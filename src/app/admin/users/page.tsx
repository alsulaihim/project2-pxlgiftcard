"use client";

import React, { useState, useEffect } from "react";
import { 
  Search, 
  Filter, 
  MoreVertical, 
  CheckCircle, 
  XCircle, 
  Clock,
  User,
  Mail,
  Phone,
  Calendar,
  Shield,
  Coins,
  Download
} from "lucide-react";
import { db } from "@/lib/firebase-config";
import { collection, query, getDocs, orderBy, updateDoc, doc, where } from "firebase/firestore";
import { formatPXL } from "@/lib/pxl-currency";

interface PlatformUser {
  id: string;
  uid: string;
  email: string;
  username: string;
  profile: {
    firstName: string;
    lastName: string;
    phone: string;
    country: string;
    kycStatus: 'pending' | 'verified' | 'rejected';
  };
  tier: {
    current: string;
  };
  wallets: {
    pxl: {
      balance: number;
    };
  };
  timestamps?: {
    created: any;
  };
  status?: 'active' | 'suspended' | 'banned';
}

export default function UserManagementPage() {
  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTier, setFilterTier] = useState("all");
  const [filterKYC, setFilterKYC] = useState("all");
  const [selectedUser, setSelectedUser] = useState<PlatformUser | null>(null);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, filterTier, filterKYC]);

  const loadUsers = async () => {
    try {
      const usersQuery = query(collection(db, 'users'), orderBy('timestamps.created', 'desc'));
      const snapshot = await getDocs(usersQuery);
      const userData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as PlatformUser));
      setUsers(userData);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${user.profile.firstName} ${user.profile.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Tier filter
    if (filterTier !== "all") {
      filtered = filtered.filter(user => user.tier.current === filterTier);
    }

    // KYC filter
    if (filterKYC !== "all") {
      filtered = filtered.filter(user => user.profile.kycStatus === filterKYC);
    }

    setFilteredUsers(filtered);
  };

  const updateUserKYC = async (userId: string, status: 'verified' | 'rejected') => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        'profile.kycStatus': status
      });
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, profile: { ...user.profile, kycStatus: status } }
          : user
      ));
      
      setShowActionMenu(null);
    } catch (error) {
      console.error('Error updating KYC status:', error);
    }
  };

  const updateUserStatus = async (userId: string, status: 'active' | 'suspended' | 'banned') => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        status: status
      });
      
      // Update local state
      setUsers(users.map(user => 
        user.id === userId 
          ? { ...user, status }
          : user
      ));
      
      setShowActionMenu(null);
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  const exportUsers = () => {
    const csv = [
      ['Email', 'Username', 'Name', 'Tier', 'PXL Balance', 'KYC Status', 'Status', 'Created'],
      ...filteredUsers.map(user => [
        user.email,
        user.username,
        `${user.profile.firstName} ${user.profile.lastName}`,
        user.tier.current,
        user.wallets.pxl.balance,
        user.profile.kycStatus,
        user.status || 'active',
        user.timestamps?.created ? new Date(user.timestamps.created.seconds * 1000).toLocaleDateString() : 'N/A'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getKYCBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <span className="flex items-center text-green-400"><CheckCircle className="h-4 w-4 mr-1" /> Verified</span>;
      case 'rejected':
        return <span className="flex items-center text-red-400"><XCircle className="h-4 w-4 mr-1" /> Rejected</span>;
      default:
        return <span className="flex items-center text-yellow-400"><Clock className="h-4 w-4 mr-1" /> Pending</span>;
    }
  };

  const getTierBadge = (tier: string) => {
    const colors = {
      starter: 'bg-gray-700 text-gray-300',
      rising: 'bg-blue-900 text-blue-300',
      pro: 'bg-green-900 text-green-300',
      pixlbeast: 'bg-amber-900 text-amber-300',
      pixlionaire: 'bg-purple-900 text-purple-300'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${colors[tier as keyof typeof colors] || colors.starter}`}>
        {tier}
      </span>
    );
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">User Management</h2>
          <p className="text-gray-400 mt-1">
            {filteredUsers.length} users found
          </p>
        </div>
        <button
          onClick={exportUsers}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
        >
          <Download className="h-4 w-4 text-gray-400" />
          <span className="text-sm text-gray-300">Export CSV</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-600"
            />
          </div>

          {/* Tier Filter */}
          <select
            value={filterTier}
            onChange={(e) => setFilterTier(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-600"
            aria-label="Filter by tier"
          >
            <option value="all">All Tiers</option>
            <option value="starter">Starter</option>
            <option value="rising">Rising</option>
            <option value="pro">Pro</option>
            <option value="pixlbeast">Pixlbeast</option>
            <option value="pixlionaire">Pixlionaire</option>
          </select>

          {/* KYC Filter */}
          <select
            value={filterKYC}
            onChange={(e) => setFilterKYC(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-gray-600"
            aria-label="Filter by KYC status"
          >
            <option value="all">All KYC Status</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-950 border-b border-gray-800">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Tier
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Balance
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  KYC Status
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-950/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-white">
                        {user.profile.firstName} {user.profile.lastName}
                      </div>
                      <div className="text-sm text-gray-400">{user.username}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">
                      <div className="flex items-center text-gray-300">
                        <Mail className="h-3 w-3 mr-1" />
                        {user.email}
                      </div>
                      <div className="flex items-center text-gray-500 mt-1">
                        <Phone className="h-3 w-3 mr-1" />
                        {user.profile.phone || 'N/A'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getTierBadge(user.tier.current)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-white font-medium">
                      {formatPXL(user.wallets.pxl.balance)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {getKYCBadge(user.profile.kycStatus)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                    {user.timestamps?.created 
                      ? new Date(user.timestamps.created.seconds * 1000).toLocaleDateString()
                      : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm relative">
                    <button
                      onClick={() => setShowActionMenu(showActionMenu === user.id ? null : user.id)}
                      className="text-gray-400 hover:text-white"
                      aria-label="User actions menu"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>
                    
                    {showActionMenu === user.id && (
                      <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-10">
                        <div className="py-1">
                          {user.profile.kycStatus === 'pending' && (
                            <>
                              <button
                                onClick={() => updateUserKYC(user.id, 'verified')}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                              >
                                Approve KYC
                              </button>
                              <button
                                onClick={() => updateUserKYC(user.id, 'rejected')}
                                className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                              >
                                Reject KYC
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                          >
                            View Details
                          </button>
                          {user.status !== 'suspended' && (
                            <button
                              onClick={() => updateUserStatus(user.id, 'suspended')}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                            >
                              Suspend User
                            </button>
                          )}
                          {user.status === 'suspended' && (
                            <button
                              onClick={() => updateUserStatus(user.id, 'active')}
                              className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                            >
                              Reactivate User
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="bg-gray-900 rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">User Details</h3>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-gray-400 hover:text-white"
                aria-label="Close user details"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Basic Info */}
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-3">Basic Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Name</p>
                    <p className="text-sm text-white">
                      {selectedUser.profile.firstName} {selectedUser.profile.lastName}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Username</p>
                    <p className="text-sm text-white">{selectedUser.username}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm text-white">{selectedUser.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm text-white">{selectedUser.profile.phone || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Account Info */}
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-3">Account Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500">Tier</p>
                    <div className="mt-1">{getTierBadge(selectedUser.tier.current)}</div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">PXL Balance</p>
                    <p className="text-sm text-white font-medium">
                      {formatPXL(selectedUser.wallets.pxl.balance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">KYC Status</p>
                    <div className="mt-1">{getKYCBadge(selectedUser.profile.kycStatus)}</div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Account Status</p>
                    <p className="text-sm text-white capitalize">
                      {selectedUser.status || 'Active'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
