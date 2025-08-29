/**
 * Message Status Component - Shows delivery and read receipts
 * WhatsApp-style single/double checkmarks
 */

import React from 'react';
import { Check, CheckCheck } from 'lucide-react';

interface MessageStatusProps {
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
  className?: string;
}

export const MessageStatus: React.FC<MessageStatusProps> = ({ 
  status = 'sending', 
  className = '' 
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'sending':
        return (
          <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
        );
      
      case 'sent':
        return (
          <Check className="w-4 h-4 text-gray-400" />
        );
      
      case 'delivered':
        return (
          <CheckCheck className="w-4 h-4 text-gray-400" />
        );
      
      case 'read':
        return (
          <CheckCheck className="w-4 h-4 text-blue-500" />
        );
      
      case 'failed':
        return (
          <div className="flex items-center gap-1">
            <span className="text-red-500 text-xs">!</span>
            <span className="text-red-500 text-xs">Failed</span>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={`inline-flex items-center ${className}`}>
      {getStatusIcon()}
    </div>
  );
};

export default MessageStatus;