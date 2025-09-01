'use client';

import React, { useState } from 'react';
import { 
  Eye, 
  EyeOff, 
  Copy, 
  Share2, 
  Mail, 
  MessageCircle,
  Download,
  CheckCircle,
  Lock,
  Gift,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface GiftCardRevealProps {
  brand: string;
  productName: string;
  denomination: number;
  code: string;
  pin?: string;
  serialNumber?: string;
  orderId: string;
  index: number;
}

export default function GiftCardReveal({
  brand,
  productName,
  denomination,
  code,
  pin,
  serialNumber,
  orderId,
  index
}: GiftCardRevealProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showShareMenu, setShowShareMenu] = useState(false);

  // Copy to clipboard with feedback
  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Format code for display (add spaces for readability)
  const formatCode = (code: string) => {
    // Add spaces every 4 characters for better readability
    return code.match(/.{1,4}/g)?.join(' ') || code;
  };

  // Generate shareable message
  const getShareMessage = () => {
    let message = `🎁 ${brand} Gift Card\n`;
    message += `Value: $${denomination}\n`;
    message += `Code: ${code}\n`;
    if (pin) message += `PIN: ${pin}\n`;
    message += `\nOrder #${orderId.slice(-8)}`;
    return message;
  };

  // Share via Web Share API
  const handleWebShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${brand} Gift Card - $${denomination}`,
          text: getShareMessage(),
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    }
  };

  // Share via email
  const shareViaEmail = () => {
    const subject = encodeURIComponent(`Your ${brand} Gift Card - $${denomination}`);
    const body = encodeURIComponent(getShareMessage());
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  // Share via SMS
  const shareViaSMS = () => {
    const message = encodeURIComponent(getShareMessage());
    window.open(`sms:?body=${message}`);
  };

  // Download as text file
  const downloadAsText = () => {
    const content = getShareMessage();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${brand}_giftcard_${orderId.slice(-8)}.txt`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // Get brand initial for badge
  const getBrandInitial = () => {
    return brand.charAt(0).toUpperCase();
  };

  return (
    <div className="bg-[#111111] border border-[#262626] rounded-xl overflow-hidden hover:bg-[#1a1a1a] hover:border-[#333333] transition-all duration-150">
      {/* Card Header - Vercel-style minimal design */}
      <div className="p-6 border-b border-[#262626]">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Brand Badge - Vercel-style circle badge */}
            <div className="w-10 h-10 bg-[#0a0a0a] border border-[#262626] rounded-full flex items-center justify-center">
              <span className="text-[#e5e5e5] font-semibold text-sm">
                {getBrandInitial()}
              </span>
            </div>
            <div>
              <h3 className="text-base font-medium text-[#ffffff]">{brand}</h3>
              <p className="text-sm text-[#737373]">{productName}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-semibold text-[#ffffff]">${denomination}</p>
            <p className="text-xs text-[#737373] uppercase tracking-wide">Value</p>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-6">
        {!isRevealed ? (
          // Hidden State - Vercel minimal design
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-[#0a0a0a] border border-[#262626] rounded-full mb-4">
              <Lock className="h-5 w-5 text-[#737373]" />
            </div>
            <h4 className="text-base font-medium text-[#e5e5e5] mb-2">
              Gift Card Ready
            </h4>
            <p className="text-sm text-[#737373] mb-6 max-w-xs mx-auto">
              Click below to reveal your gift card details
            </p>
            <button
              onClick={() => setIsRevealed(true)}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#0070f3] text-white rounded-lg hover:bg-[#0051cc] transition-colors duration-150 text-sm font-medium"
            >
              <Eye className="h-4 w-4" />
              Reveal Gift Card
            </button>
          </div>
        ) : (
          // Revealed State - Vercel clean design
          <div className="space-y-4">
            {/* Code Display */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-[#737373] uppercase tracking-wide">
                  Gift Card Code
                </label>
                <button
                  onClick={() => setIsRevealed(false)}
                  className="p-1 text-[#737373] hover:text-[#ffffff] transition-colors"
                  title="Hide code"
                >
                  <EyeOff className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="relative group">
                <div className="font-mono text-sm text-[#ffffff] bg-[#000000] border border-[#333333] rounded-lg px-3 py-1.5 text-center">
                  {formatCode(code)}
                </div>
                <button
                  onClick={() => copyToClipboard(code, 'code')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-[#1a1a1a] hover:bg-[#262626] border border-[#333333] rounded-md transition-all opacity-0 group-hover:opacity-100"
                  title="Copy code"
                >
                  {copiedField === 'code' ? (
                    <CheckCircle className="h-3.5 w-3.5 text-[#00d72f]" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-[#a1a1a1]" />
                  )}
                </button>
              </div>
            </div>

            {/* PIN Display (if available) */}
            {pin && (
              <div>
                <label className="text-xs font-medium text-[#737373] uppercase tracking-wide block mb-2">
                  PIN
                </label>
                <div className="relative group">
                  <div className="font-mono text-sm text-[#ffffff] bg-[#000000] border border-[#333333] rounded-lg px-3 py-1.5 text-center">
                    {pin}
                  </div>
                  <button
                    onClick={() => copyToClipboard(pin, 'pin')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-[#1a1a1a] hover:bg-[#262626] border border-[#333333] rounded-md transition-all opacity-0 group-hover:opacity-100"
                    title="Copy PIN"
                  >
                    {copiedField === 'pin' ? (
                      <CheckCircle className="h-3.5 w-3.5 text-[#00d72f]" />
                    ) : (
                      <Copy className="h-3.5 w-3.5 text-[#a1a1a1]" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Serial Number (if available) */}
            {serialNumber && (
              <div className="pt-2 border-t border-[#262626]">
                <p className="text-xs text-[#737373]">
                  Serial: <span className="font-mono text-[#a1a1a1]">{serialNumber}</span>
                </p>
              </div>
            )}

            {/* Action Buttons - Vercel style */}
            <div className="flex gap-2 pt-4">
              <button
                onClick={() => copyToClipboard(`Code: ${code}${pin ? `\nPIN: ${pin}` : ''}`, 'all')}
                className="flex-1 px-4 py-2 bg-transparent border border-[#333333] text-[#ffffff] rounded-lg hover:bg-[#111111] hover:border-[#666666] transition-all duration-150 text-sm font-medium flex items-center justify-center gap-2"
              >
                {copiedField === 'all' ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-[#00d72f]" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy All
                  </>
                )}
              </button>
              
              <div className="relative">
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="px-4 py-2 bg-transparent border border-[#333333] text-[#ffffff] rounded-lg hover:bg-[#111111] hover:border-[#666666] transition-all duration-150 text-sm font-medium flex items-center gap-2"
                >
                  <Share2 className="h-4 w-4" />
                  Share
                </button>
                
                {showShareMenu && (
                  <>
                    {/* Backdrop to close menu */}
                    <div 
                      className="fixed inset-0 z-10" 
                      onClick={() => setShowShareMenu(false)}
                    />
                    {/* Share Menu - Vercel dropdown style */}
                    <div className="absolute right-0 mt-2 w-48 bg-[#0a0a0a] border border-[#262626] rounded-lg shadow-xl z-20 overflow-hidden">
                      {navigator.share && (
                        <button
                          onClick={() => {
                            handleWebShare();
                            setShowShareMenu(false);
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm text-[#a1a1a1] hover:bg-[#111111] hover:text-[#ffffff] flex items-center gap-3 transition-colors"
                        >
                          <Share2 className="h-4 w-4" />
                          Share...
                        </button>
                      )}
                      <button
                        onClick={() => {
                          shareViaEmail();
                          setShowShareMenu(false);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-[#a1a1a1] hover:bg-[#111111] hover:text-[#ffffff] flex items-center gap-3 transition-colors"
                      >
                        <Mail className="h-4 w-4" />
                        Email
                      </button>
                      <button
                        onClick={() => {
                          shareViaSMS();
                          setShowShareMenu(false);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-[#a1a1a1] hover:bg-[#111111] hover:text-[#ffffff] flex items-center gap-3 transition-colors"
                      >
                        <MessageCircle className="h-4 w-4" />
                        SMS
                      </button>
                      <button
                        onClick={() => {
                          downloadAsText();
                          setShowShareMenu(false);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-[#a1a1a1] hover:bg-[#111111] hover:text-[#ffffff] flex items-center gap-3 transition-colors border-t border-[#262626]"
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Security Notice - Vercel warning style */}
            <div className="mt-4 p-3 bg-[#331c00] border border-[#663c00] rounded-lg">
              <p className="text-xs text-[#f59e0b] leading-relaxed">
                Keep your gift card code secure. Anyone with access to this code can redeem its value.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}