"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Send, Users, Clock, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { formatPXL } from "@/lib/pxl-currency";
import { PXLTransferModal } from "./pxl-transfer-modal";
import { db } from "@/lib/firebase-config";
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp } from "firebase/firestore";

/**
 * PXL Transfer section for sending PXL to other users
 */
export function PXLTransferSection() {
  const { user, platformUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [recentTransfers, setRecentTransfers] = React.useState<any[]>([]);
  
  const userBalance = platformUser?.wallets?.pxl?.balance || 0;

  // Load recent transfers
  React.useEffect(() => {
    if (!user) return;

    // Query for sent and received transfers
    const transfersQuery = query(
      collection(db, 'pxl-transfers'),
      where('senderUserId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    const receivedQuery = query(
      collection(db, 'pxl-transfers'),
      where('recipientUserId', '==', user.uid),
      orderBy('createdAt', 'desc'),
      limit(5)
    );

    // Subscribe to transfers
    const unsubscribeSent = onSnapshot(
      transfersQuery, 
      (snapshot) => {
        const sentTransfers = snapshot.docs.map(doc => ({
          id: doc.id,
          type: 'sent',
          ...doc.data()
        }));
        
        setRecentTransfers(prev => {
          const received = prev.filter(t => t.type === 'received');
          return [...sentTransfers, ...received].sort((a, b) => 
            (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)
          ).slice(0, 5);
        });
      },
      (error) => {
        console.error('Error loading sent transfers:', error);
        if (error.code === 'failed-precondition' && error.message.includes('index')) {
          console.log('Transfer indexes are being built. Recent transfers will appear once indexes are ready.');
        }
      }
    );

    const unsubscribeReceived = onSnapshot(
      receivedQuery,
      (snapshot) => {
        const receivedTransfers = snapshot.docs.map(doc => ({
          id: doc.id,
          type: 'received',
          ...doc.data()
        }));
        
        setRecentTransfers(prev => {
          const sent = prev.filter(t => t.type === 'sent');
          return [...sent, ...receivedTransfers].sort((a, b) => 
            (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)
          ).slice(0, 5);
        });
      },
      (error) => {
        console.error('Error loading received transfers:', error);
        if (error.code === 'failed-precondition' && error.message.includes('index')) {
          console.log('Transfer indexes are being built. Recent transfers will appear once indexes are ready.');
        }
      }
    );

    return () => {
      unsubscribeSent();
      unsubscribeReceived();
    };
  }, [user]);

  const formatTimeAgo = (timestamp: Timestamp) => {
    const seconds = Math.floor((Date.now() - timestamp.toMillis()) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return timestamp.toDate().toLocaleDateString('en-US');
  };

  return (
    <>
      <section className="rounded-xl border border-gray-800 bg-gray-950 p-4">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-white">Send PXL</h2>
          <p className="text-sm text-gray-400">
            Transfer PXL to other users instantly
          </p>
        </div>

        {/* Current Balance */}
        <div className="mb-6 p-4 bg-gray-900 rounded-lg">
          <p className="text-sm text-gray-400 mb-1">Available Balance</p>
          <p className="text-2xl font-bold text-white">{formatPXL(userBalance)}</p>
        </div>

        {/* Send Button */}
        <Button
          onClick={() => setIsModalOpen(true)}
          className="w-full mb-6"
          disabled={userBalance === 0}
        >
          <Send className="h-4 w-4 mr-2" />
          Send PXL
        </Button>

        {/* Recent Transfers */}
        <div>
          <h3 className="text-sm font-medium text-white mb-3 flex items-center">
            <Clock className="h-4 w-4 mr-2 text-gray-400" />
            Recent Transfers
          </h3>
          
          {recentTransfers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              No transfers yet
            </p>
          ) : (
            <div className="space-y-2">
              {recentTransfers.map((transfer) => (
                <div
                  key={transfer.id}
                  className="flex items-center justify-between p-3 bg-gray-900 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    {transfer.type === 'sent' ? (
                      <ArrowUpRight className="h-4 w-4 text-red-400" />
                    ) : (
                      <ArrowDownLeft className="h-4 w-4 text-green-400" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-white">
                        {transfer.type === 'sent' 
                          ? `To ${transfer.recipientUsername}`
                          : `From ${transfer.senderUsername}`}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatTimeAgo(transfer.createdAt)}
                      </p>
                    </div>
                  </div>
                  <p className={`text-sm font-medium ${
                    transfer.type === 'sent' ? 'text-red-400' : 'text-green-400'
                  }`}>
                    {transfer.type === 'sent' ? '-' : '+'}{formatPXL(transfer.amount)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-4 text-xs text-gray-400 text-center">
          <p>Transfers are instant and free</p>
          <p className="mt-1">Min: 1 PXL • Max: 10,000 PXL per transfer</p>
        </div>
      </section>

      {/* Transfer Modal */}
      <PXLTransferModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}