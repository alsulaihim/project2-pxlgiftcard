"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ValidatedInput } from "@/components/ui/validated-input";
import { CreditCard, DollarSign, ArrowRight, Info, AlertCircle, TrendingUp } from "lucide-react";
import { parseFormattedBalance } from "@/lib/validation";
import StripePayment from "@/components/payments/stripe-payment";
import PayPalPayment from "@/components/payments/paypal-payment";
import { usePXLCurrency } from "@/hooks/use-pxl-currency";
import { formatPXL, formatUSD } from "@/lib/pxl-currency";
import { useAuth } from "@/contexts/auth-context";

/**
 * PXL Purchase section for converting USD to PXL
 */
export function PXLPurchaseSection() {
  const [usdAmount, setUsdAmount] = React.useState<string>("50");
  const [paymentMethod, setPaymentMethod] = React.useState<"stripe" | "paypal">("stripe");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [success, setSuccess] = React.useState(false);
  const [paymentResult, setPaymentResult] = React.useState<any>(null);
  const [cancellationMessage, setCancellationMessage] = React.useState<string>('');

  // Clear messages when amount or payment method changes
  React.useEffect(() => {
    setCancellationMessage('');
    setSuccess(false);
  }, [usdAmount, paymentMethod]);

  // Use real PXL currency data
  const { 
    currentRate, 
    calculatePXLAmount, 
    processPXLPurchase,
    userTier,
    purchaseDiscount,
    loading: currencyLoading 
  } = usePXLCurrency();
  
  const { refreshUserData } = useAuth();
  
  const parsedAmount = parseFormattedBalance(usdAmount || "0");
  const pxlCalculation = React.useMemo(() => {
    return calculatePXLAmount(parsedAmount);
  }, [parsedAmount, calculatePXLAmount]);

  const presetAmounts = [25, 50, 100, 250, 500];

  // Payment success handler
  const handlePaymentSuccess = async (result: any) => {
    console.log('PXL Purchase successful:', result);
    setPaymentResult(result);
    
    try {
      // Process the PXL purchase and update balances
      const txResult = await processPXLPurchase(
        parsedAmount,
        paymentMethod,
        result.id || result.paymentIntentId || result.orderId
      );
      
      console.log('PXL transaction completed:', txResult);
      setSuccess(true);
      
      // Refresh user data to update balances across the app
      await refreshUserData();
    } catch (error) {
      console.error('Failed to process PXL purchase:', error);
      handlePaymentError('Failed to credit PXL to your account. Please contact support.');
    }
    
    setIsProcessing(false);
    setCancellationMessage('');
  };

  // Payment error handler
  const handlePaymentError = (error: string) => {
    console.error('PXL Purchase error:', error);
    setIsProcessing(false);
    setSuccess(false);
    setCancellationMessage('');
    
    // Show user-friendly error message
    // Note: Actual error display would be implemented with a toast or error state
  };

  // Payment cancellation handler
  const handlePaymentCancellation = (message: string) => {
    console.info('PXL Purchase cancelled:', message);
    setCancellationMessage(message);
    setIsProcessing(false);
  };

  const handlePurchase = () => {
    // Legacy button handler - now payment is handled by individual components
    console.log("Purchase PXL:", { usdAmount, pxlAmount: pxlCalculation.totalPxl, paymentMethod });
  };

  if (currencyLoading) {
    return (
      <section className="rounded-xl border border-gray-800 bg-gray-950 p-4">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-white">Buy PXL</h2>
          <p className="text-gray-400">Loading exchange rates...</p>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-800 rounded"></div>
          <div className="h-32 bg-gray-800 rounded"></div>
          <div className="h-10 bg-gray-800 rounded"></div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-gray-800 bg-gray-950 p-4">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-white">Buy PXL</h2>
        <p className="text-gray-400">Convert USD to PXL currency</p>
      </div>

      <div className="space-y-4">
        {/* Amount Input */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            USD Amount
          </label>
          
          {/* Preset Amount Buttons */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {presetAmounts.map((amount) => (
              <button
                key={amount}
                onClick={() => setUsdAmount(amount.toLocaleString('en-US'))}
                className={`rounded-lg border py-2 px-3 text-sm font-medium transition-all ${
                  parseFormattedBalance(usdAmount) === amount
                    ? "bg-white text-black border-white"
                    : "bg-gray-900 text-gray-300 border-gray-700 hover:bg-gray-800 hover:border-gray-600"
                }`}
              >
                ${amount.toLocaleString('en-US')}
              </button>
            ))}
          </div>

          {/* Custom Amount Input */}
          <div className="relative">
            <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-gray-400 z-10" />
            <ValidatedInput
              type="amount"
              value={usdAmount}
              onChange={setUsdAmount}
              placeholder="Enter amount"
              className="pl-10"
              required={false}
            />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Minimum: $10 • Maximum: $1,000
          </p>
        </div>

        {/* Conversion Display */}
        <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-400">You pay</span>
            <span className="font-medium text-white">
              {formatUSD(parsedAmount)}
            </span>
          </div>
          
          {/* Show tier bonus if applicable */}
          {purchaseDiscount > 0 && (
            <div className="flex items-center justify-between mb-2 text-green-400">
              <span className="text-sm flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                {userTier} bonus (+{(purchaseDiscount * 100).toFixed(0)}%)
              </span>
              <span className="text-sm">
                +{formatPXL(pxlCalculation.bonusPxl)}
              </span>
            </div>
          )}
          
          <div className="flex items-center justify-center py-2">
            <ArrowRight className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">You receive</span>
            <span className="font-medium text-white text-lg">
              {formatPXL(pxlCalculation.totalPxl)}
            </span>
          </div>
          
          <div className="mt-3 pt-3 border-t border-gray-800 space-y-1">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Exchange rate</span>
              <span>1 USD = {currentRate.toFixed(2)} PXL</span>
            </div>
            {purchaseDiscount > 0 && (
              <div className="flex items-center justify-between text-xs text-green-400">
                <span>Effective rate</span>
                <span>1 USD = {pxlCalculation.effectiveRate.toFixed(2)} PXL</span>
              </div>
            )}
          </div>
        </div>

        {/* Payment Method */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Payment Method
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPaymentMethod("stripe")}
              className={`flex items-center justify-center space-x-2 rounded-lg border py-3 px-4 transition-all ${
                paymentMethod === "stripe"
                  ? "bg-white text-black border-white"
                  : "bg-gray-900 text-gray-300 border-gray-700 hover:bg-gray-800 hover:border-gray-600"
              }`}
            >
              <CreditCard className="h-5 w-5" />
              <span className="font-medium">Card</span>
            </button>
            <button
              onClick={() => setPaymentMethod("paypal")}
              className={`flex items-center justify-center space-x-2 rounded-lg border py-3 px-4 transition-all ${
                paymentMethod === "paypal"
                  ? "bg-white text-black border-white"
                  : "bg-gray-900 text-gray-300 border-gray-700 hover:bg-gray-800 hover:border-gray-600"
              }`}
            >
              <span className="font-medium">PayPal</span>
            </button>
          </div>
        </div>

        {/* Important Notice */}
        <div className="rounded-lg border border-gray-700 bg-gray-900 p-4">
          <div className="flex items-start space-x-3">
            <Info className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-white text-sm">One-way conversion</h4>
              <p className="text-xs text-gray-400 mt-1">
                PXL can only be converted from USD. PXL cannot be converted back to USD.
              </p>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {success && paymentResult && (
          <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <div className="text-sm text-green-400">
                <p className="font-medium">PXL Purchase Successful!</p>
                <p className="text-xs text-green-300 mt-1">
                  You've received PXL {Math.floor(pxlCalculation.totalPxl).toLocaleString()} in your wallet.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Cancellation Message */}
        {cancellationMessage && (
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                <div className="text-sm text-yellow-400">
                  <p className="font-medium">Payment Cancelled</p>
                  <p className="text-xs text-yellow-300 mt-0.5">{cancellationMessage}</p>
                  <p className="text-xs text-yellow-300 mt-1">You can try again or choose a different payment method.</p>
                </div>
              </div>
              <button
                onClick={() => setCancellationMessage('')}
                className="text-yellow-400 hover:text-yellow-300 p-1"
                aria-label="Dismiss message"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Payment Components */}
        {paymentMethod === "stripe" ? (
          <StripePayment
            amount={parseFormattedBalance(usdAmount || "0")}
            currency="usd"
            description={`Purchase ${formatPXL(pxlCalculation.totalPxl)}`}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            disabled={!usdAmount || parseFloat(usdAmount) < 10}
          />
        ) : (
          <PayPalPayment
            amount={parseFormattedBalance(usdAmount || "0")}
            onSuccess={handlePaymentSuccess}
            onError={handlePaymentError}
            onCancel={handlePaymentCancellation}
            loading={isProcessing}
          />
        )}
      </div>
    </section>
  );
}
