'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { 
  CreditCard, 
  Coins, 
  ShoppingBag, 
  Check, 
  AlertCircle,
  ArrowLeft,
  Lock,
  Zap
} from 'lucide-react';
import StripePayment from '@/components/payments/stripe-payment';
import PayPalPayment from '@/components/payments/paypal-payment';
import { useCart, cartActions } from '@/contexts/cart-context';
import { Button } from '@/components/ui/button';
import { ValidatedInput } from '@/components/ui/validated-input';
import { formatBalance } from '@/lib/validation';
import { useAuth } from '@/contexts/auth-context';
import { db } from '@/lib/firebase-config';
import { collection, addDoc, serverTimestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { createOrder, processOrderPayment } from '@/lib/order-service';

export default function CheckoutForm() {
  const router = useRouter();
  const { state, dispatch } = useCart();
  const { user, platformUser, refreshUserData } = useAuth();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'pxl' | 'stripe' | 'paypal'>('pxl');
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [paymentResult, setPaymentResult] = useState<any>(null);
  const [cancellationMessage, setCancellationMessage] = useState<string>('');
  const [orderId, setOrderId] = useState<string>('');

  // Get user tier benefits
  const userTier = platformUser?.tier?.current || 'starter';
  const userPxlBalance = platformUser?.wallets?.pxl?.balance || 0;
  const tierBenefits = platformUser?.tier?.tierBenefits || {
    discountPercentage: 0,
    cashbackPercentage: 0
  };

  // Calculate if user has sufficient PXL
  const hasSufficientPXL = userPxlBalance >= state.totals.pxl;

  // Payment success handler
  const handlePaymentSuccess = async (paymentDetails: any) => {
    try {
      // Ensure user is authenticated
      if (!user?.uid) {
        throw new Error('User must be authenticated to place an order');
      }

      // Create order with inventory reservation
      const orderData = {
        userId: user.uid,
        items: state.items.map(item => ({
          productId: item.giftcardId, // Using giftcardId as productId
          brand: item.brand,
          productName: item.productName,
          denomination: item.denomination,
          quantity: item.quantity
        })),
        payment: {
          method: selectedPaymentMethod,
          amount: selectedPaymentMethod === 'pxl' ? state.totals.pxl : state.totals.usd,
          currency: selectedPaymentMethod === 'pxl' ? 'PXL' : 'USD'
        },
        totals: {
          subtotal: state.totals.usd,
          discount: state.totals.savings,
          cashback: selectedPaymentMethod === 'pxl' ? state.totals.cashback : 0,
          total: selectedPaymentMethod === 'pxl' ? state.totals.pxl : state.totals.usd
        }
      };

      // Create order with inventory reservation
      console.log('Creating order with data:', orderData);
      const orderResult = await createOrder(orderData);
      
      if (!orderResult.success) {
        console.error('Order creation failed:', orderResult.error);
        throw new Error(orderResult.error || 'Failed to create order');
      }
      
      const orderId = orderResult.orderId!;
      setOrderId(orderId);
      
      // Process payment and confirm inventory
      const paymentResult = await processOrderPayment(orderId, paymentDetails);
      
      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Failed to process payment');
      }
      
      setPaymentResult(paymentDetails);
      setSuccess(true);
      setIsProcessing(false);
      setErrors([]);
      setCancellationMessage('');
      
      // Clear cart after successful payment
      dispatch(cartActions.clearCart());
      
      console.log('Payment successful, order created:', orderId);
      
      // Redirect to order confirmation page
      setTimeout(() => {
        router.push(`/order-confirmation/${orderId}`);
      }, 2000);
    } catch (error) {
      console.error('Error creating order:', error);
      handlePaymentError('Failed to create order. Please contact support.');
    }
  };

  // Payment error handler
  const handlePaymentError = (error: string) => {
    setErrors([error]);
    setIsProcessing(false);
    setSuccess(false);
    setCancellationMessage('');
    console.error('Payment error:', error);
  };

  // Payment cancellation handler
  const handlePaymentCancellation = (reason: string = 'Payment was cancelled by user') => {
    setErrors([]); // Don't show cancellation as an error
    setCancellationMessage('Payment was cancelled. You can try again or choose a different payment method.');
    setIsProcessing(false);
    setSuccess(false);
    console.log('Payment cancelled:', reason); // Log as info, not error
  };

  // Handle checkout process (PXL payment)
  const handleCheckout = async () => {
    if (!user) {
      setErrors(['Please sign in to complete your purchase']);
      return;
    }

    if (!hasSufficientPXL) {
      setErrors(['Insufficient PXL balance']);
      return;
    }

    setIsProcessing(true);
    setErrors([]);
    setCancellationMessage('');

    try {
      // Deduct PXL from user's balance and add cashback
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User document not found');
      }
      
      const userData = userDoc.data();
      const currentBalance = userData.wallets?.pxl?.balance || 0;
      const totalSpent = userData.wallets?.pxl?.totalSpent || 0;
      
      // Calculate final amount after cashback
      const pxlToDeduct = state.totals.pxl;
      const cashbackAmount = state.totals.cashback || 0;
      const netDeduction = pxlToDeduct - cashbackAmount;
      
      if (currentBalance < netDeduction) {
        throw new Error('Insufficient PXL balance after calculation');
      }
      
      // Update user's PXL balance
      await updateDoc(userRef, {
        'wallets.pxl.balance': currentBalance - netDeduction,
        'wallets.pxl.totalSpent': totalSpent + pxlToDeduct,
        'timestamps.updated': serverTimestamp()
      });
      
      // Create PXL payment transaction record
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        type: 'giftcard-purchase',
        amounts: {
          pxl: -pxlToDeduct,
          usd: state.totals.usd,
          exchangeRate: 100 // Current rate
        },
        payment: {
          method: 'pxl',
          provider: 'firebase'
        },
        giftcard: {
          itemCount: state.items.length,
          brands: [...new Set(state.items.map(item => item.brand))]
        },
        tier: {
          userTier: userTier,
          discountApplied: state.totals.savings,
          cashbackEarned: cashbackAmount
        },
        status: 'completed',
        timestamps: {
          created: serverTimestamp(),
          updated: serverTimestamp(),
          completed: serverTimestamp()
        }
      });
      
      // If there's cashback, create a separate cashback transaction
      if (cashbackAmount > 0) {
        await addDoc(collection(db, 'transactions'), {
          userId: user.uid,
          type: 'cashback',
          amounts: {
            pxl: cashbackAmount,
            usd: 0,
            exchangeRate: 100
          },
          relatedTo: 'giftcard-purchase',
          status: 'completed',
          timestamps: {
            created: serverTimestamp(),
            updated: serverTimestamp(),
            completed: serverTimestamp()
          }
        });
      }
      
      // Process PXL payment by creating the order
      await handlePaymentSuccess({
        method: 'pxl',
        amount: state.totals.pxl,
        currency: 'PXL',
        id: `pxl_${Date.now()}`
      });
      
      // Refresh user data to show updated balance
      if (refreshUserData) {
        await refreshUserData();
      }
    } catch (error) {
      console.error('PXL checkout error:', error);
      setErrors(['Payment processing failed. Please try again.']);
      setIsProcessing(false);
    }
  };

  // BUG FIX: Show loading state during hydration to prevent flash
  if (!state.isHydrated) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-white mb-2">Loading checkout...</h2>
        <p className="text-gray-400">Please wait while we load your cart</p>
      </div>
    );
  }

  // Redirect if cart is empty (only after hydration)
  if (state.items.length === 0 && !success) {
    return (
      <div className="text-center py-12">
        <ShoppingBag className="h-16 w-16 text-gray-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Your cart is empty</h2>
        <p className="text-gray-400 mb-6">Add some items to your cart to checkout</p>
        <Button onClick={() => router.push('/marketplace')}>
          Continue Shopping
        </Button>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Payment Successful!</h2>
        <p className="text-gray-400 mb-6">
          Your order has been processed and you'll receive a confirmation email shortly.
        </p>
        <div className="text-sm text-gray-500">
          Redirecting to your orders...
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* Order Summary */}
      <div className="order-2 lg:order-1">
        <div className="bg-gray-950 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Order Summary</h3>
          
          {/* Cart Items */}
          <div className="space-y-3 mb-6">
            {state.items.map((item) => (
              <div key={item.id} className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                  {item.imageUrl && (item.imageUrl.startsWith('http') || item.imageUrl.startsWith('/')) ? (
                    <Image 
                      src={item.imageUrl} 
                      alt={item.productName}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    <span className="text-xs font-medium text-gray-400">
                      {item.imageUrl || item.brand.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{item.productName}</p>
                  <p className="text-xs text-gray-400">{item.brand} • ${item.denomination}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white">Qty: {item.quantity}</p>
                  <p className="text-xs text-gray-400">${formatBalance(item.denomination * item.quantity)}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Order Totals */}
          <div className="border-t border-gray-700 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Subtotal</span>
              <span className="text-white">${formatBalance(state.totals.usd)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Tier Discount ({userTier})</span>
              <span className="text-green-400">-${formatBalance(state.totals.savings)}</span>
            </div>
            <div className="flex justify-between text-lg font-semibold border-t border-gray-700 pt-2">
              <span className="text-white">Total</span>
              <span className="text-white">${formatBalance(state.totals.usd)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Form */}
      <div className="order-1 lg:order-2 relative -mt-8">
        {/* Back to Cart - Positioned absolutely to not affect container alignment */}
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="text-gray-400 hover:text-white px-2 py-1 mb-2 inline-flex items-center absolute -top-8 left-0 z-10 whitespace-nowrap"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Cart
        </Button>

        {/* Payment Method Selection - Aligned with Order Summary */}
        <div className="bg-gray-950 border border-gray-800 rounded-xl p-6 mt-8">
          <h3 className="text-lg font-semibold text-white mb-4">Payment Method</h3>
          <div className="grid grid-cols-1 gap-3">
            
            {/* PXL Payment Option */}
            <div 
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedPaymentMethod === 'pxl' 
                  ? 'border-blue-500 bg-blue-500/10' 
                  : 'border-gray-700 hover:border-gray-600'
              }`}
              onClick={() => setSelectedPaymentMethod('pxl')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Coins className="h-5 w-5 text-blue-400" />
                  <div>
                    <p className="font-medium text-white">Pay with PXL</p>
                    <p className="text-sm text-gray-400">
                      Balance: PXL {formatBalance(userPxlBalance)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-white">PXL {formatBalance(state.totals.pxl)}</p>
                  <p className="text-xs text-green-400">Save ${formatBalance(state.totals.savings)}</p>
                </div>
              </div>
              
              {!hasSufficientPXL && (
                <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded">
                  <p className="text-xs text-red-400">Insufficient PXL balance</p>
                </div>
              )}
            </div>

            {/* Credit Card Payment */}
            <div 
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedPaymentMethod === 'stripe' 
                  ? 'border-blue-500 bg-blue-500/10' 
                  : 'border-gray-700 hover:border-gray-600'
              }`}
              onClick={() => setSelectedPaymentMethod('stripe')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <CreditCard className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-white">Credit Card</p>
                    <p className="text-sm text-gray-400">Visa, Mastercard, Amex</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-white">${formatBalance(state.totals.usd)}</p>
                </div>
              </div>
            </div>

            {/* PayPal Payment */}
            <div 
              className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                selectedPaymentMethod === 'paypal' 
                  ? 'border-blue-500 bg-blue-500/10' 
                  : 'border-gray-700 hover:border-gray-600'
              }`}
              onClick={() => setSelectedPaymentMethod('paypal')}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 bg-blue-600 rounded flex items-center justify-center">
                    <span className="text-xs font-bold text-white">P</span>
                  </div>
                  <div>
                    <p className="font-medium text-white">PayPal</p>
                    <p className="text-sm text-gray-400">Pay with PayPal account</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium text-white">${formatBalance(state.totals.usd)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Forms */}
          {selectedPaymentMethod === 'stripe' && (
            <div className="mt-6">
              <StripePayment
                amount={state.totals.usd}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                loading={isProcessing}
              />
            </div>
          )}

          {selectedPaymentMethod === 'paypal' && (
            <div className="mt-6">
              <PayPalPayment
                amount={state.totals.usd}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
                onCancel={handlePaymentCancellation}
                loading={isProcessing}
              />
            </div>
          )}

          {selectedPaymentMethod === 'pxl' && (
            <div className="mt-6">
              <Button
                onClick={handleCheckout}
                disabled={isProcessing || !hasSufficientPXL}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
                size="lg"
              >
                {isProcessing ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processing PXL Payment...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Zap className="h-4 w-4" />
                    <span>Pay with PXL {formatBalance(state.totals.pxl)}</span>
                  </div>
                )}
              </Button>
            </div>
          )}

          {/* Error Messages */}
          {errors.length > 0 && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                <div className="text-sm text-red-400">
                  {errors.map((error, index) => (
                    <p key={index}>{error}</p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Cancellation Message */}
          {cancellationMessage && (
            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                <div className="text-sm text-yellow-400">
                  <p>{cancellationMessage}</p>
                </div>
              </div>
            </div>
          )}



          {/* Security Notice */}
          <div className="text-center text-xs text-gray-500 mt-6">
            <Lock className="h-3 w-3 inline mr-1" />
            Your payment information is secure and encrypted
          </div>
        </div>
      </div>
    </div>
  );
}
