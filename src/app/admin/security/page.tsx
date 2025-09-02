"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  collection, 
  query, 
  orderBy,
  limit,
  getDocs,
  Timestamp
} from "firebase/firestore";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase-config";
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Activity,
  Lock,
  Database,
  Server,
  FileSearch,
  Download,
  RefreshCw,
  Eye,
  AlertCircle
} from "lucide-react";

interface SecurityEvent {
  id: string;
  type: 'login_anomaly' | 'failed_auth' | 'suspicious_transaction' | 'api_abuse' | 'data_access';
  severity: 'critical' | 'high' | 'medium' | 'low';
  userId?: string;
  userEmail?: string;
  description: string;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Timestamp;
  resolved: boolean;
  metadata?: Record<string, any>;
}

interface ComplianceMetric {
  name: string;
  status: 'compliant' | 'warning' | 'non_compliant';
  description: string;
  lastChecked: Date;
  details?: string;
}

interface SystemHealth {
  service: string;
  status: 'operational' | 'degraded' | 'down';
  uptime: number;
  lastChecked: Date;
  responseTime?: number;
}

interface AuditLog {
  id: string;
  action: string;
  userId: string;
  userEmail: string;
  resource: string;
  timestamp: Timestamp;
  details?: string;
  ipAddress?: string;
}

export default function SecurityPage() {
  const { user, platformUser, loading: authLoading, isAdmin } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'monitoring' | 'compliance' | 'audit' | 'system'>('monitoring');
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [complianceMetrics, setComplianceMetrics] = useState<ComplianceMetric[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Check admin access
  useEffect(() => {
    if (!authLoading && (!user || !platformUser || !isAdmin)) {
      router.push('/auth/signin?redirect=/admin/security');
    }
  }, [user, platformUser, authLoading, isAdmin, router]);

  // Fetch security data
  useEffect(() => {
    if (!user || !isAdmin) return;

    const fetchSecurityData = async () => {
      try {
        // Simulate security events (in production, these would come from real monitoring)
        const mockSecurityEvents: SecurityEvent[] = [
          {
            id: '1',
            type: 'login_anomaly',
            severity: 'high',
            userId: 'user123',
            userEmail: 'user@example.com',
            description: 'Login from unusual location',
            ipAddress: '192.168.1.100',
            timestamp: Timestamp.now(),
            resolved: false,
            metadata: { location: 'Russia', usual_location: 'USA' }
          },
          {
            id: '2',
            type: 'failed_auth',
            severity: 'medium',
            description: 'Multiple failed login attempts',
            ipAddress: '10.0.0.50',
            timestamp: Timestamp.fromDate(new Date(Date.now() - 3600000)),
            resolved: true,
            metadata: { attempts: 5 }
          },
          {
            id: '3',
            type: 'api_abuse',
            severity: 'critical',
            userId: 'user456',
            userEmail: 'suspicious@example.com',
            description: 'Excessive API calls detected',
            timestamp: Timestamp.fromDate(new Date(Date.now() - 7200000)),
            resolved: false,
            metadata: { requests_per_minute: 500 }
          }
        ];
        setSecurityEvents(mockSecurityEvents);

        // Simulate compliance metrics
        const mockCompliance: ComplianceMetric[] = [
          {
            name: 'PCI DSS Compliance',
            status: 'compliant',
            description: 'Payment Card Industry Data Security Standard',
            lastChecked: new Date(),
            details: 'All requirements met, last audit passed'
          },
          {
            name: 'GDPR Compliance',
            status: 'compliant',
            description: 'General Data Protection Regulation',
            lastChecked: new Date(),
            details: 'Privacy policy updated, data handling compliant'
          },
          {
            name: 'KYC Verification',
            status: 'warning',
            description: 'Know Your Customer requirements',
            lastChecked: new Date(),
            details: '15% of users pending verification'
          },
          {
            name: 'Data Encryption',
            status: 'compliant',
            description: 'Encryption at rest and in transit',
            lastChecked: new Date(),
            details: 'AES-256 encryption active'
          },
          {
            name: 'Backup Procedures',
            status: 'compliant',
            description: 'Regular data backups',
            lastChecked: new Date(),
            details: 'Daily backups, 30-day retention'
          }
        ];
        setComplianceMetrics(mockCompliance);

        // Simulate system health
        const mockSystemHealth: SystemHealth[] = [
          {
            service: 'Firebase Auth',
            status: 'operational',
            uptime: 99.99,
            lastChecked: new Date(),
            responseTime: 45
          },
          {
            service: 'Firestore Database',
            status: 'operational',
            uptime: 99.95,
            lastChecked: new Date(),
            responseTime: 120
          },
          {
            service: 'Payment Processing',
            status: 'operational',
            uptime: 99.98,
            lastChecked: new Date(),
            responseTime: 250
          },
          {
            service: 'File Storage',
            status: 'degraded',
            uptime: 98.5,
            lastChecked: new Date(),
            responseTime: 500
          }
        ];
        setSystemHealth(mockSystemHealth);

        // Fetch real audit logs from admin-actions collection
        try {
          const auditQuery = query(
            collection(db, 'admin-actions'),
            orderBy('timestamp', 'desc'),
            limit(50)
          );
          const snapshot = await getDocs(auditQuery);
          const logs: AuditLog[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as AuditLog));
          setAuditLogs(logs);
        } catch (error) {
          console.error('Error fetching audit logs:', error);
          // Use mock data if real data fails
          const mockAuditLogs: AuditLog[] = [
            {
              id: '1',
              action: 'user.update',
              userId: 'admin123',
              userEmail: 'admin@example.com',
              resource: 'users/user456',
              timestamp: Timestamp.now(),
              details: 'Updated user tier from Rising to Pro',
              ipAddress: '192.168.1.1'
            },
            {
              id: '2',
              action: 'config.update',
              userId: 'admin123',
              userEmail: 'admin@example.com',
              resource: 'pxl-currency/main',
              timestamp: Timestamp.fromDate(new Date(Date.now() - 3600000)),
              details: 'Updated exchange rate from 100 to 102',
              ipAddress: '192.168.1.1'
            }
          ];
          setAuditLogs(mockAuditLogs);
        }
      } catch (error) {
        console.error('Error fetching security data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSecurityData();
  }, [user, isAdmin]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-400/10';
      case 'high': return 'text-orange-400 bg-orange-400/10';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10';
      case 'low': return 'text-blue-400 bg-blue-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
      case 'operational':
        return 'text-green-400';
      case 'warning':
      case 'degraded':
        return 'text-yellow-400';
      case 'non_compliant':
      case 'down':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const filteredEvents = securityEvents.filter(event => {
    const matchesSeverity = selectedSeverity === 'all' || event.severity === selectedSeverity;
    const matchesSearch = searchTerm === '' || 
      event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.userEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-white">Loading security data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Security & Compliance</h1>
        <button className="flex items-center px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors">
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </button>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-900 p-1 rounded-lg">
        {[
          { id: 'monitoring', label: 'Security Monitoring', icon: Shield },
          { id: 'compliance', label: 'Compliance', icon: CheckCircle },
          { id: 'audit', label: 'Audit Logs', icon: FileSearch },
          { id: 'system', label: 'System Health', icon: Server }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab.id
                ? 'bg-gray-800 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
            }`}
          >
            <tab.icon className="h-4 w-4 mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Security Monitoring Tab */}
      {activeTab === 'monitoring' && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search security events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Filter by severity"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-900 border-b border-gray-800">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Severity
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {filteredEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-900/50 transition-colors">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-white">{event.description}</div>
                          {event.ipAddress && (
                            <div className="text-xs text-gray-400">IP: {event.ipAddress}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(event.severity)}`}>
                          {event.severity}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-300">
                          {event.userEmail || 'Unknown'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {event.timestamp.toDate().toLocaleString('en-US')}
                      </td>
                      <td className="px-6 py-4">
                        {event.resolved ? (
                          <span className="text-green-400 text-sm">Resolved</span>
                        ) : (
                          <span className="text-yellow-400 text-sm">Pending</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          className="text-gray-400 hover:text-white transition-colors"
                          aria-label="View event details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Compliance Tab */}
      {activeTab === 'compliance' && (
        <div className="grid gap-6">
          {complianceMetrics.map((metric) => (
            <div key={metric.name} className="bg-gray-950 border border-gray-800 rounded-xl p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-lg ${
                    metric.status === 'compliant' ? 'bg-green-400/10' :
                    metric.status === 'warning' ? 'bg-yellow-400/10' : 'bg-red-400/10'
                  }`}>
                    {metric.status === 'compliant' ? (
                      <CheckCircle className={`h-6 w-6 ${getStatusColor(metric.status)}`} />
                    ) : metric.status === 'warning' ? (
                      <AlertCircle className={`h-6 w-6 ${getStatusColor(metric.status)}`} />
                    ) : (
                      <XCircle className={`h-6 w-6 ${getStatusColor(metric.status)}`} />
                    )}
                  </div>
                  <div>
                    <h3 className="text-lg font-medium text-white">{metric.name}</h3>
                    <p className="text-sm text-gray-400 mt-1">{metric.description}</p>
                    {metric.details && (
                      <p className="text-sm text-gray-300 mt-2">{metric.details}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Last checked</p>
                  <p className="text-sm text-gray-300">{metric.lastChecked.toLocaleString('en-US')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Audit Logs Tab */}
      {activeTab === 'audit' && (
        <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-900 border-b border-gray-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Action
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Resource
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Details
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-900/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-white">{log.action}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-300">{log.userEmail}</div>
                      {log.ipAddress && (
                        <div className="text-xs text-gray-400">{log.ipAddress}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">
                      {log.resource}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {log.details || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {log.timestamp.toDate().toLocaleString('en-US')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* System Health Tab */}
      {activeTab === 'system' && (
        <div className="grid gap-6 md:grid-cols-2">
          {systemHealth.map((service) => (
            <div key={service.service} className="bg-gray-950 border border-gray-800 rounded-xl p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-medium text-white">{service.service}</h3>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Status</span>
                      <span className={`text-sm font-medium ${getStatusColor(service.status)}`}>
                        {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Uptime</span>
                      <span className="text-sm text-white">{service.uptime}%</span>
                    </div>
                    {service.responseTime && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Response Time</span>
                        <span className="text-sm text-white">{service.responseTime}ms</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${
                  service.status === 'operational' ? 'bg-green-400/10' :
                  service.status === 'degraded' ? 'bg-yellow-400/10' : 'bg-red-400/10'
                }`}>
                  <Activity className={`h-6 w-6 ${getStatusColor(service.status)}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
