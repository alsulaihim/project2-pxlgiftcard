"use client";

import React, { useState } from 'react';
import { X, Send, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ValidatedInput } from '@/components/ui/validated-input';
import { useAuth } from '@/contexts/auth-context';
import { usePXLCurrency } from '@/hooks/use-pxl-currency';
import { formatPXL } from '@/lib/pxl-currency';
import { db } from '@/lib/firebase-config';
import { collection, query, where, getDocs, doc, writeBatch, Timestamp, serverTimestamp } from 'firebase/firestore';

interface PXLTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PXLTransferModal({ isOpen, onClose }: PXLTransferModalProps) {
  const { user, platformUser } = useAuth();
  const { currentRate } = usePXLCurrency();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [verifyingRecipient, setVerifyingRecipient] = useState(false);
  const [recipientData, setRecipientData] = useState<any>(null);

  const userBalance = platformUser?.wallets?.pxl?.balance || 0;
  const parsedAmount = parseFloat(amount) || 0;

  // Verify recipient exists
  const verifyRecipient = async () => {
    if (!recipient) {
      setRecipientData(null);
      return;
    }

    setVerifyingRecipient(true);
    setError('');
    
    try {
      // Check if recipient is username or email
      const isEmail = recipient.includes('@') && !recipient.startsWith('@');
      
      const q = isEmail
        ? query(collection(db, 'users'), where('email', '==', recipient))
        : query(collection(db, 'users'), where('username', '==', recipient));
      
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) {
        // BUG FIX: 2024-01-27 - Provide helpful error messages for user not found
        if (!isEmail && !recipient.startsWith('@')) {
          setError('Username must start with @ (e.g., @johndoe)');
        } else if (isEmail) {
          setError('No user found with this email address');
        } else {
          setError('No user found with this username');
        }
        setRecipientData(null);
      } else {
        const recipientDoc = snapshot.docs[0];
        const data = recipientDoc.data();
        setRecipientData({ id: recipientDoc.id, ...data });
      }
    } catch (err: any) {
      // BUG FIX: 2024-01-27 - Show actual error message for debugging
      if (err.code === 'permission-denied') {
        setError('Permission denied: Cannot search for users');
      } else {
        setError(`Failed to verify recipient: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setVerifyingRecipient(false);
    }
  };

  // Debounce recipient verification
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (recipient) {
        verifyRecipient();
      }
    }, 500);
    
    return () => clearTimeout(timer);
  }, [recipient]);

  const handleTransfer = async () => {
    if (!recipientData || !parsedAmount || parsedAmount <= 0) {
      setError('Please enter a valid recipient and amount');
      return;
    }

    if (parsedAmount > userBalance) {
      setError('Insufficient PXL balance');
      return;
    }

    if (recipientData.id === user?.uid) {
      setError('Cannot transfer to yourself');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const batch = writeBatch(db);
      const transferId = `trf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const timestamp = Timestamp.now();

      // Create transfer document
      const transferRef = doc(db, 'pxl-transfers', transferId);
      batch.set(transferRef, {
        senderUserId: user!.uid,
        senderUsername: platformUser!.username,
        recipientUserId: recipientData.id,
        recipientUsername: recipientData.username,
        recipientEmail: recipientData.email,
        amount: parsedAmount,
        message: message || null,
        status: 'completed',
        createdAt: timestamp,
        completedAt: timestamp,
        senderTransactionId: `txn_${Date.now()}_sender`,
        recipientTransactionId: `txn_${Date.now()}_recipient`,
      });

      // Update sender's balance
      const senderRef = doc(db, 'users', user!.uid);
      batch.update(senderRef, {
        'wallets.pxl.balance': userBalance - parsedAmount,
        'wallets.pxl.totalSent': (platformUser?.wallets?.pxl?.totalSent || 0) + parsedAmount,
        'timestamps.updated': serverTimestamp(),
      });

      // Update recipient's balance
      const recipientRef = doc(db, 'users', recipientData.id);
      const recipientBalance = recipientData.wallets?.pxl?.balance || 0;
      const recipientTotalReceived = recipientData.wallets?.pxl?.totalReceived || 0;
      
      batch.update(recipientRef, {
        'wallets.pxl.balance': recipientBalance + parsedAmount,
        'wallets.pxl.totalReceived': recipientTotalReceived + parsedAmount,
        'timestamps.updated': serverTimestamp(),
      });

      // Create transaction records
      const senderTxnRef = doc(collection(db, 'transactions'));
      batch.set(senderTxnRef, {
        userId: user!.uid,
        type: 'pxl-transfer-sent',
        amounts: {
          pxl: -parsedAmount,
          usd: 0,
          exchangeRate: currentRate,
        },
        transfer: {
          recipientUserId: recipientData.id,
          recipientUsername: recipientData.username,
          recipientEmail: recipientData.email,
          message: message || null,
          transferStatus: 'completed',
        },
        status: 'completed',
        timestamps: {
          created: timestamp,
          updated: timestamp,
          completed: timestamp,
        },
      });

      const recipientTxnRef = doc(collection(db, 'transactions'));
      batch.set(recipientTxnRef, {
        userId: recipientData.id,
        type: 'pxl-transfer-received',
        amounts: {
          pxl: parsedAmount,
          usd: 0,
          exchangeRate: currentRate,
        },
        transfer: {
          senderUserId: user!.uid,
          senderUsername: platformUser!.username,
          message: message || null,
          transferStatus: 'completed',
        },
        status: 'completed',
        timestamps: {
          created: timestamp,
          updated: timestamp,
          completed: timestamp,
        },
      });

      await batch.commit();
      setSuccess(true);
      
      // Reset form after success
      setTimeout(() => {
        setRecipient('');
        setAmount('');
        setMessage('');
        setSuccess(false);
        setRecipientData(null);
        onClose();
      }, 2000);
      
    } catch (err) {
      console.error('Transfer failed:', err);
      setError('Failed to complete transfer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
          aria-label="Close modal"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-xl font-semibold text-white mb-6">Send PXL</h2>

        {success ? (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <p className="text-lg text-white mb-2">Transfer Successful!</p>
            <p className="text-gray-400">
              {formatPXL(parsedAmount)} sent to {recipientData.username}
            </p>
          </div>
        ) : (
          <>
            {/* Recipient Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Recipient (Username or Email)
              </label>
              <ValidatedInput
                type="text"
                value={recipient}
                onChange={setRecipient}
                placeholder="@username or email@example.com"
                className="w-full bg-gray-800 border-gray-700"
                disabled={loading}
              />
              {verifyingRecipient && (
                <p className="text-xs text-gray-400 mt-1">Verifying recipient...</p>
              )}
              {recipientData && !verifyingRecipient && (
                <p className="text-xs text-green-400 mt-1">
                  ✓ {recipientData.username} ({recipientData.profile.firstName} {recipientData.profile.lastName})
                </p>
              )}
            </div>

            {/* Amount Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Amount (PXL)
              </label>
              <ValidatedInput
                type="number"
                value={amount}
                onChange={setAmount}
                placeholder="0"
                min="1"
                max={userBalance.toString()}
                className="w-full bg-gray-800 border-gray-700"
                disabled={loading}
              />
              <p className="text-xs text-gray-400 mt-1">
                Available: {formatPXL(userBalance)}
              </p>
            </div>

            {/* Message Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Message (Optional)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Add a note..."
                maxLength={200}
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-md px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={loading}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-800 rounded-md">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleTransfer}
                disabled={loading || !recipientData || !parsedAmount || parsedAmount <= 0 || parsedAmount > userBalance}
                className="flex-1"
              >
                {loading ? (
                  <span>Sending...</span>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send PXL
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
