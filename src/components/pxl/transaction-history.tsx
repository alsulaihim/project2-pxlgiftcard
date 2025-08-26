"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  ShoppingBag, 
  CreditCard, 
  Gift,
  Star,
  Filter,
  Download,
  RefreshCcw,
  Zap
} from "lucide-react";
import { formatBalance } from "@/lib/validation";
import { formatPXL } from "@/lib/pxl-currency";
import { useAuth } from "@/contexts/auth-context";
import { db } from "@/lib/firebase-config";
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp, QuerySnapshot, DocumentData } from "firebase/firestore";

interface Transaction {
  id: string;
  type: "giftcard-purchase" | "pxl-purchase" | "pxl-transfer-sent" | "pxl-transfer-received" | "cashback" | "tier-bonus";
  amount: number;
  currency: "PXL" | "USD";
  description: string;
  timestamp: Timestamp;
  status: "completed" | "pending" | "failed";
  metadata?: {
    recipient?: string;
    sender?: string;
    giftcard?: string;
    paymentMethod?: string;
  };
}

/**
 * Transaction History component showing all PXL-related transactions
 */
export function TransactionHistory() {
  const { user } = useAuth();
  const [filter, setFilter] = React.useState<"all" | "purchases" | "transfers" | "rewards">("all");
  const [showAll, setShowAll] = React.useState(false);
  const [transactions, setTransactions] = React.useState<Transaction[]>([]);
  const [loading, setLoading] = React.useState(true);

  // Load transactions from Firestore
  React.useEffect(() => {
    if (!user) return;

    const transactionsQuery = query(
      collection(db, 'transactions'),
      where('userId', '==', user.uid),
      orderBy('timestamps.created', 'desc'),
      limit(showAll ? 100 : 10)
    );

    const unsubscribe = onSnapshot(
      transactionsQuery, 
      (snapshot: QuerySnapshot<DocumentData>) => {
      const txns: Transaction[] = snapshot.docs.map(doc => {
        const data = doc.data();
        
        // Map Firestore data to Transaction interface
        let description = '';
        let metadata: any = {};
        
        switch (data.type) {
          case 'pxl-purchase':
            description = `Purchased ${formatPXL(data.amounts.pxl)}`;
            metadata.paymentMethod = data.payment?.method || 'card';
            break;
          case 'pxl-transfer-sent':
            description = `Sent to ${data.transfer?.recipientUsername || 'Unknown'}`;
            metadata.recipient = data.transfer?.recipientUsername;
            break;
          case 'pxl-transfer-received':
            description = `Received from ${data.transfer?.senderUsername || 'Unknown'}`;
            metadata.sender = data.transfer?.senderUsername;
            break;
          case 'giftcard-purchase':
            description = `${data.giftcard?.brand || 'Giftcard'} - $${data.giftcard?.denomination || '0'}`;
            metadata.giftcard = data.giftcard?.brand;
            break;
          case 'cashback':
            description = 'Cashback reward';
            break;
          case 'tier-bonus':
            description = 'Tier progression bonus';
            break;
          default:
            description = data.type;
        }
        
        return {
          id: doc.id,
          type: data.type,
          amount: data.amounts.pxl,
          currency: 'PXL' as const,
          description,
          timestamp: data.timestamps.created,
          status: data.status,
          metadata
        };
      });
      
      setTransactions(txns);
      setLoading(false);
    },
    (error) => {
      console.error('Error loading transactions:', error);
      // Set loading to false even on error to show empty state
      setLoading(false);
      
      // If it's an index error, we can show a message but still allow the app to function
      if (error.code === 'failed-precondition' && error.message.includes('index')) {
        console.log('Indexes are being built. Transactions will appear once indexes are ready.');
      }
    });

    return () => unsubscribe();
  }, [user, showAll]);

  const formatDate = (timestamp: Timestamp) => {
    const date = timestamp.toDate();
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes === 0 ? 'Just now' : `${minutes} minutes ago`;
      }
      return `${hours} hours ago`;
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString('en-US');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "giftcard-purchase":
        return Gift;
      case "pxl-purchase":
        return CreditCard;
      case "pxl-transfer-sent":
        return ArrowUpRight;
      case "pxl-transfer-received":
        return ArrowDownLeft;
      case "cashback":
        return Zap;
      case "tier-bonus":
        return Star;
      default:
        return ShoppingBag;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case "pxl-transfer-sent":
      case "giftcard-purchase":
        return "text-red-400";
      case "pxl-transfer-received":
      case "pxl-purchase":
      case "cashback":
      case "tier-bonus":
        return "text-green-400";
      default:
        return "text-gray-400";
    }
  };

  // Filter transactions
  const filteredTransactions = React.useMemo(() => {
    if (filter === "all") return transactions;
    
    switch (filter) {
      case "purchases":
        return transactions.filter(tx => 
          tx.type === "giftcard-purchase" || tx.type === "pxl-purchase"
        );
      case "transfers":
        return transactions.filter(tx => 
          tx.type === "pxl-transfer-sent" || tx.type === "pxl-transfer-received"
        );
      case "rewards":
        return transactions.filter(tx => 
          tx.type === "cashback" || tx.type === "tier-bonus"
        );
      default:
        return transactions;
    }
  }, [transactions, filter]);

  const displayedTransactions = showAll ? filteredTransactions : filteredTransactions.slice(0, 5);

  const handleExport = () => {
    // Create CSV content
    const headers = ['Date', 'Type', 'Description', 'Amount', 'Status'];
    const rows = filteredTransactions.map(tx => [
      tx.timestamp.toDate().toISOString(),
      tx.type,
      tx.description,
      tx.amount,
      tx.status
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\\n');
    
    // Download CSV
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pxl-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <section className="rounded-xl border border-gray-800 bg-gray-950 p-4">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-white">Transaction History</h2>
          <p className="text-gray-400">Loading transactions...</p>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-gray-800 bg-gray-950 p-4">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-white">Transaction History</h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
        
        {/* Filter Tabs */}
        <div className="flex space-x-1 bg-gray-900 rounded-lg p-1">
          {[
            { value: "all", label: "All" },
            { value: "purchases", label: "Purchases" },
            { value: "transfers", label: "Transfers" },
            { value: "rewards", label: "Rewards" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value as any)}
              className={`flex-1 py-2 px-3 text-sm font-medium rounded-md transition-all ${
                filter === tab.value
                  ? "bg-white text-black"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction List */}
      <div className="space-y-3">
        {displayedTransactions.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No transactions found</p>
          </div>
        ) : (
          displayedTransactions.map((transaction) => {
            const Icon = getIcon(transaction.type);
            const iconColor = getIconColor(transaction.type);
            const isNegative = transaction.amount < 0;
            
            return (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-3 bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800 ${iconColor}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{transaction.description}</p>
                    <p className="text-sm text-gray-400">
                      {formatDate(transaction.timestamp)}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className={`font-medium ${
                    isNegative ? "text-red-400" : "text-green-400"
                  }`}>
                    {isNegative ? "-" : "+"}{formatPXL(Math.abs(transaction.amount))}
                  </p>
                  {transaction.status === "pending" && (
                    <p className="text-xs text-yellow-400">Pending</p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Show More Button */}
      {!showAll && filteredTransactions.length > 5 && (
        <div className="mt-4 text-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAll(true)}
          >
            View All Transactions ({filteredTransactions.length})
          </Button>
        </div>
      )}
    </section>
  );
}