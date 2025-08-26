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
  Download
} from "lucide-react";
import { formatBalance } from "@/lib/validation";

interface Transaction {
  id: string;
  type: "giftcard-purchase" | "pxl-purchase" | "pxl-transfer-sent" | "pxl-transfer-received" | "cashback" | "tier-bonus";
  amount: number;
  currency: "PXL" | "USD";
  description: string;
  timestamp: string;
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
  const [filter, setFilter] = React.useState<"all" | "purchases" | "transfers" | "rewards">("all");
  const [showAll, setShowAll] = React.useState(false);

  // Mock transaction data
  const allTransactions: Transaction[] = [
    {
      id: "tx-001",
      type: "giftcard-purchase",
      amount: -2450,
      currency: "PXL",
      description: "Amazon Gift Card - $25",
      timestamp: "2024-01-15T10:30:00Z",
      status: "completed",
      metadata: { giftcard: "Amazon" }
    },
    {
      id: "tx-002",
      type: "cashback",
      amount: 73,
      currency: "PXL",
      description: "Cashback from Amazon purchase",
      timestamp: "2024-01-15T10:30:00Z",
      status: "completed",
    },
    {
      id: "tx-003",
      type: "pxl-purchase",
      amount: 4980,
      currency: "PXL",
      description: "Purchased PXL with credit card",
      timestamp: "2024-01-14T15:45:00Z",
      status: "completed",
      metadata: { paymentMethod: "Credit Card" }
    },
    {
      id: "tx-004",
      type: "pxl-transfer-received",
      amount: 1000,
      currency: "PXL",
      description: "Received from @john_doe",
      timestamp: "2024-01-13T09:15:00Z",
      status: "completed",
      metadata: { sender: "@john_doe" }
    },
    {
      id: "tx-005",
      type: "tier-bonus",
      amount: 500,
      currency: "PXL",
      description: "Pro tier advancement bonus",
      timestamp: "2024-01-12T14:20:00Z",
      status: "completed",
    },
    {
      id: "tx-006",
      type: "pxl-transfer-sent",
      amount: -2000,
      currency: "PXL",
      description: "Sent to @alice_smith",
      timestamp: "2024-01-11T11:30:00Z",
      status: "completed",
      metadata: { recipient: "@alice_smith" }
    },
    {
      id: "tx-007",
      type: "giftcard-purchase",
      amount: -1470,
      currency: "PXL",
      description: "Netflix Gift Card - $15",
      timestamp: "2024-01-10T16:45:00Z",
      status: "completed",
      metadata: { giftcard: "Netflix" }
    },
    {
      id: "tx-008",
      type: "pxl-purchase",
      amount: 9976,
      currency: "PXL",
      description: "Purchased PXL with PayPal",
      timestamp: "2024-01-09T12:00:00Z",
      status: "completed",
      metadata: { paymentMethod: "PayPal" }
    },
  ];

  const filteredTransactions = allTransactions.filter(tx => {
    if (filter === "all") return true;
    if (filter === "purchases") return tx.type === "giftcard-purchase" || tx.type === "pxl-purchase";
    if (filter === "transfers") return tx.type === "pxl-transfer-sent" || tx.type === "pxl-transfer-received";
    if (filter === "rewards") return tx.type === "cashback" || tx.type === "tier-bonus";
    return true;
  });

  const displayedTransactions = showAll ? filteredTransactions : filteredTransactions.slice(0, 5);

  const getTransactionIcon = (type: Transaction["type"]) => {
    switch (type) {
      case "giftcard-purchase":
        return <ShoppingBag className="h-5 w-5 text-gray-400" />;
      case "pxl-purchase":
        return <CreditCard className="h-5 w-5 text-gray-400" />;
      case "pxl-transfer-sent":
        return <ArrowUpRight className="h-5 w-5 text-red-400" />;
      case "pxl-transfer-received":
        return <ArrowDownLeft className="h-5 w-5 text-green-400" />;
      case "cashback":
        return <Gift className="h-5 w-5 text-green-400" />;
      case "tier-bonus":
        return <Star className="h-5 w-5 text-yellow-400" />;
      default:
        return <div className="h-5 w-5 rounded-full bg-gray-400" />;
    }
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <section className="rounded-xl border border-gray-800 bg-gray-950 p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-white">Transaction History</h2>
          <p className="text-gray-400">Your PXL activity and transactions</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center space-x-2 mb-4">
        <Filter className="h-5 w-5 text-gray-400" />
        <div className="flex space-x-2">
          {[
            { id: "all", label: "All" },
            { id: "purchases", label: "Purchases" },
            { id: "transfers", label: "Transfers" },
            { id: "rewards", label: "Rewards" },
          ].map((filterOption) => (
            <button
              key={filterOption.id}
              onClick={() => setFilter(filterOption.id as any)}
              className={`rounded-lg border py-1.5 px-3 text-sm font-medium transition-all ${
                filter === filterOption.id
                  ? "bg-white text-black border-white"
                  : "bg-gray-900 text-gray-300 border-gray-700 hover:bg-gray-800 hover:border-gray-600"
              }`}
            >
              {filterOption.label}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction List */}
      <div className="space-y-2">
        {displayedTransactions.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-400">No transactions found</p>
          </div>
        ) : (
          displayedTransactions.map((transaction) => (
            <div
              key={transaction.id}
              className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900 p-3 hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-800 border border-gray-700">
                  {getTransactionIcon(transaction.type)}
                </div>
                <div>
                  <p className="font-medium text-white">{transaction.description}</p>
                  <p className="text-sm text-gray-400">{formatDate(transaction.timestamp)}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-medium ${
                  transaction.amount > 0 ? "text-green-400" : "text-white"
                }`}>
                  {transaction.amount > 0 ? "+" : ""}
                  {transaction.currency} {formatBalance(Math.abs(transaction.amount))}
                </p>
                <p className={`text-sm capitalize ${
                  transaction.status === "completed" 
                    ? "text-green-400" 
                    : transaction.status === "pending" 
                    ? "text-yellow-400" 
                    : "text-red-400"
                }`}>
                  {transaction.status}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Show More/Less Button */}
      {filteredTransactions.length > 5 && (
        <div className="mt-4 text-center">
          <Button
            variant="outline"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll ? "Show Less" : `Show All (${filteredTransactions.length})`}
          </Button>
        </div>
      )}
    </section>
  );
}
