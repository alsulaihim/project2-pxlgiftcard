"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ValidatedInput } from "@/components/ui/validated-input";
import { Send, User, Mail, MessageSquare } from "lucide-react";
import { parseFormattedBalance } from "@/lib/validation";

/**
 * PXL Transfer section for sending PXL to other users
 */
export function PXLTransferSection() {
  const [recipient, setRecipient] = React.useState<string>("");
  const [amount, setAmount] = React.useState<string>("");
  const [message, setMessage] = React.useState<string>("");
  const [recipientType, setRecipientType] = React.useState<"username" | "email">("username");

  // Mock user balance
  const availableBalance = 12450;
  const transferAmount = parseFormattedBalance(amount || "0");

  const handleTransfer = () => {
    // Would integrate with transfer API
    console.log("Transfer PXL:", { recipient, amount: transferAmount, message, recipientType });
  };

  const isValidTransfer = recipient && transferAmount > 0 && transferAmount <= availableBalance;

  return (
    <section className="rounded-xl border border-gray-800 bg-gray-950 p-4">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-white">Send PXL</h2>
        <p className="text-gray-400">Transfer PXL to other platform users</p>
      </div>

      <div className="space-y-4">
        {/* Recipient Type Toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Send to
          </label>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <button
              onClick={() => setRecipientType("username")}
              className={`flex items-center justify-center space-x-2 rounded-lg border py-2 px-3 transition-all ${
                recipientType === "username"
                  ? "bg-white text-black border-white"
                  : "bg-gray-900 text-gray-300 border-gray-700 hover:bg-gray-800 hover:border-gray-600"
              }`}
            >
              <User className="h-4 w-4" />
              <span className="text-sm font-medium">Username</span>
            </button>
            <button
              onClick={() => setRecipientType("email")}
              className={`flex items-center justify-center space-x-2 rounded-lg border py-2 px-3 transition-all ${
                recipientType === "email"
                  ? "bg-white text-black border-white"
                  : "bg-gray-900 text-gray-300 border-gray-700 hover:bg-gray-800 hover:border-gray-600"
              }`}
            >
              <Mail className="h-4 w-4" />
              <span className="text-sm font-medium">Email</span>
            </button>
          </div>

          {/* Recipient Input */}
          <div className="relative">
            {recipientType === "username" ? (
              <User className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 z-10" />
            ) : (
              <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 z-10" />
            )}
            <ValidatedInput
              type={recipientType === "username" ? "username" : "email"}
              value={recipient}
              onChange={setRecipient}
              placeholder={
                recipientType === "username" 
                  ? "Enter @username" 
                  : "Enter email address"
              }
              className="pl-10"
              required={false}
            />
          </div>
        </div>

        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Amount
          </label>
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-gray-400 font-medium z-10">
              PXL
            </span>
            <ValidatedInput
              type="amount"
              value={amount}
              onChange={setAmount}
              placeholder="0"
              className="pl-12"
              required={false}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs">
            <span className="text-gray-400">
              Available: PXL {availableBalance.toLocaleString()}
            </span>
            <button
              onClick={() => setAmount(availableBalance.toLocaleString('en-US'))}
              className="text-white hover:text-gray-300 font-medium"
            >
              Send All
            </button>
          </div>
        </div>

        {/* Message Input */}
        <div>
          <div className="relative">
            <MessageSquare className="absolute left-3 top-9 h-5 w-5 text-gray-400 z-10" />
            <ValidatedInput
              type="message"
              value={message}
              onChange={setMessage}
              placeholder="Add a personal message..."
              label="Message (Optional)"
              maxLength={200}
              className="pl-10"
              required={false}
            />
          </div>
        </div>

        {/* Transfer Summary */}
        {transferAmount > 0 && (
          <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
            <h4 className="font-medium text-white mb-3">Transfer Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Recipient</span>
                <span className="text-white">{recipient || "Not specified"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Amount</span>
                <span className="text-white">PXL {transferAmount.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Transfer fee</span>
                <span className="text-white">Free</span>
              </div>
              <div className="pt-2 border-t border-gray-800">
                <div className="flex items-center justify-between font-medium">
                  <span className="text-white">Remaining balance</span>
                  <span className="text-white">
                    PXL {(availableBalance - transferAmount).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transfer Button */}
        <Button
          onClick={handleTransfer}
          className="w-full"
          disabled={!isValidTransfer}
        >
          <Send className="h-4 w-4 mr-2" />
          Send PXL {transferAmount > 0 ? transferAmount.toLocaleString() : ""}
        </Button>

        {/* Transfer Limits Info */}
        <div className="text-xs text-gray-400 text-center">
          <p>Transfer limits: Min 1 PXL • Max 10,000 PXL per transaction</p>
          <p className="mt-1">Transfers are processed instantly and cannot be reversed</p>
        </div>
      </div>
    </section>
  );
}
