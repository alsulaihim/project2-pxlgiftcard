// BUG FIX: 2025-01-27 - Integrate navigation with auth context and add user avatar with tier ring
// Problem: Navigation doesn't integrate with auth, no user avatar, no tier ring display
// Solution: Add auth integration, user avatar with tier ring, proper authenticated navigation
// Impact: Users can navigate the app, see their avatar with tier status, access authenticated features

"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, X, User, LogOut, Settings, Coins, Store, Home, Grid3X3, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartIcon } from "@/components/ecommerce/cart-icon";
import { useAuth } from "@/contexts/auth-context";
import { formatPXL } from "@/lib/pxl-currency";

/**
 * Tier Ring Component - Shows tier status around user avatar
 */
function TierRing({ tier, size = 48 }: { tier: string; size?: number }) {
  const sizeClass = size === 48 ? 'w-12 h-12' : size === 40 ? 'w-10 h-10' : 'w-8 h-8';
  
  return (
    <div
      className={`rounded-full border-2 transition-all duration-150 ${sizeClass} ${
        tier === 'starter' ? 'border-gray-300' :
        tier === 'rising' ? 'border-blue-500 shadow-blue-500/30' :
        tier === 'pro' ? 'border-green-500 shadow-green-500/30' :
        tier === 'pixlbeast' ? 'border-amber-500 shadow-amber-500/40' :
        tier === 'pixlionaire' ? 'border-purple-500 shadow-purple-500/50' :
        'border-gray-300'
      }`}
    />
  );
}

/**
 * User Avatar Component with Tier Ring
 */
// BUG FIX: 2025-01-27 - Fix profile picture display and improve fallback
// Problem: Profile picture not showing and poor fallback display  
// Solution: Better fallback with user initials, improved styling, and debugging
// Impact: Users see proper avatar with initials when no picture uploaded

// BUG FIX: 2025-01-27 - Fix image loading error and improve avatar fallback
// Problem: Image component trying to load invalid/undefined avatarUrl causing console errors
// Solution: Better URL validation and improved error handling with fallback state
// Impact: No more console errors, proper fallback to initials when image fails

function UserAvatar({ user, size = 48 }: { user: any; size?: number }) {
  const [imageError, setImageError] = React.useState(false);
  
  // Debug log to see what we're getting
  React.useEffect(() => {
    if (user?.profile?.avatarUrl) {
      console.log('[UserAvatar] Avatar URL:', user.profile.avatarUrl);
    }
  }, [user?.profile?.avatarUrl]);
  
  // Generate user initials as fallback
  const initials = user?.profile?.firstName && user?.profile?.lastName 
    ? `${user.profile.firstName[0]}${user.profile.lastName[0]}`.toUpperCase()
    : user?.username?.slice(1, 3).toUpperCase() || user?.email?.slice(0, 2).toUpperCase() || 'U';

  const sizeClass = size === 48 ? 'w-12 h-12' : size === 40 ? 'w-10 h-10' : 'w-8 h-8';
  
  // Check if we have a valid avatar URL
  // BUG FIX: [2025-01-27] - Fixed avatar URL validation
  // Problem: Firebase Storage URLs were being rejected by overly strict validation
  // Solution: Accept URLs that start with http:// or https:// or are data URLs
  // Impact: Profile pictures now display correctly from Firebase Storage
  const hasValidAvatarUrl = user?.profile?.avatarUrl && 
    typeof user.profile.avatarUrl === 'string' && 
    user.profile.avatarUrl.trim() !== '' &&
    (user.profile.avatarUrl.startsWith('http://') || 
     user.profile.avatarUrl.startsWith('https://') || 
     user.profile.avatarUrl.startsWith('data:image/')) &&
    !imageError;

  return (
    <div className="relative">
      <TierRing tier={user?.tier?.current || 'starter'} size={size} />
      <div className="absolute inset-0.5 rounded-full overflow-hidden flex items-center justify-center">
        {hasValidAvatarUrl ? (
          <Image
            src={user.profile.avatarUrl}
            alt={`${user.profile.firstName} ${user.profile.lastName}`}
            fill
            className="rounded-full object-cover"
            sizes="48px"
            onError={() => {
              console.error('[UserAvatar] Image failed to load:', user.profile.avatarUrl);
              setImageError(true);
            }}
          />
        ) : (
          <div className={`bg-gray-700 rounded-full flex items-center justify-center text-gray-300 ${sizeClass}`}>
            <span className={`font-semibold ${size >= 40 ? 'text-sm' : 'text-xs'}`}>
              {initials}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Navigation component with auth integration and tier-based avatar
 */
export function Navigation() {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false);
  const { user, platformUser, logout, isAdmin } = useAuth();

  const publicNavigationItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/marketplace", label: "Marketplace", icon: Store },
    { href: "/about", label: "About" },
  ];

  const authenticatedNavigationItems = [
    { href: "/", label: "Home", icon: Home },
    { href: "/dashboard", label: "Dashboard", icon: Grid3X3 },
    { href: "/marketplace", label: "Marketplace", icon: Store },
    { href: "/pxl", label: "PXL Wallet", icon: Coins },
    { href: "/orders", label: "Orders" },
  ];

  const navigationItems = user && platformUser ? authenticatedNavigationItems : publicNavigationItems;
  
  // Add admin link if user is admin
  const finalNavigationItems = [...navigationItems];
  if (isAdmin && user && platformUser) {
    finalNavigationItems.push({ href: "/admin", label: "Admin", icon: Settings });
  }

  const handleLogout = async () => {
    try {
      await logout();
      setIsUserMenuOpen(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-900 bg-black/50 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo - Vercel style */}
          <Link href={user && platformUser ? "/dashboard" : "/"} className="flex items-center space-x-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white">
              <span className="text-sm font-bold text-black">PXL</span>
            </div>
            <span className="text-lg font-semibold text-white">
              GiftCard Platform
            </span>
          </Link>

          {/* Desktop Navigation - Vercel style */}
          <nav className="hidden md:flex items-center space-x-8">
            {/* PXL Balance Display for logged-in users */}
            {user && platformUser && (
              <Link 
                href="/pxl" 
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-gray-900/50 border border-gray-800 hover:bg-gray-900 hover:border-gray-700 transition-all group"
              >
                <Wallet className="h-4 w-4 text-gray-400 group-hover:text-green-400 transition-colors" />
                <span className="text-xs text-gray-500">PXL Balance</span>
                <span className="text-sm font-medium text-white">
                  {formatPXL(platformUser.wallets?.pxl?.balance || 0)}
                </span>
              </Link>
            )}
            
            {finalNavigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Right Section - Vercel style */}
          <div className="flex items-center space-x-4">
            {/* Cart Icon */}
            <CartIcon />
            
            {user && platformUser ? (
              /* Authenticated User Menu */
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
                >
                  <UserAvatar user={platformUser} size={48} />
                  <div className="hidden md:block text-left">
                    <div className="text-sm text-white font-medium">
                      {platformUser.profile.firstName} {platformUser.profile.lastName}
                    </div>
                    <div className="text-xs text-gray-400 capitalize">
                      {platformUser.tier.current} Tier
                    </div>
                  </div>
                </button>

                {/* User Dropdown Menu */}
                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-gray-900 border border-gray-800 rounded-lg shadow-lg py-2">
                    <div className="px-4 py-3 border-b border-gray-800">
                      <div className="flex items-center space-x-3">
                        <UserAvatar user={platformUser} size={40} />
                        <div>
                          <div className="text-sm text-white font-medium">
                            {platformUser.profile.firstName} {platformUser.profile.lastName}
                          </div>
                          <div className="text-xs text-gray-400">
                            {platformUser.username}
                          </div>
                          <div className="text-xs text-blue-400 capitalize">
                            {platformUser.tier.current} Tier
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <Link
                      href="/dashboard"
                      className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <Home className="h-4 w-4 mr-3" />
                      Dashboard
                    </Link>
                    
                    <Link
                      href="/pxl"
                      className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <Coins className="h-4 w-4 mr-3" />
                      PXL Wallet
                    </Link>
                    
                    <Link
                      href="/profile"
                      className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                      onClick={() => setIsUserMenuOpen(false)}
                    >
                      <User className="h-4 w-4 mr-3" />
                      Profile
                    </Link>
                    
                    {isAdmin && (
                      <Link
                        href="/admin"
                        className="flex items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                        onClick={() => setIsUserMenuOpen(false)}
                      >
                        <Settings className="h-4 w-4 mr-3" />
                        Admin Dashboard
                      </Link>
                    )}
                    
                    <div className="border-t border-gray-800 mt-2 pt-2">
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Unauthenticated User Buttons */
              <div className="hidden md:flex items-center space-x-3">
                <Link href="/auth/signin">
                  <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button size="sm" className="bg-white text-black hover:bg-gray-200">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden text-gray-400 hover:text-white"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu - Vercel style */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-gray-900 bg-black/95 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-6 py-6">
            {/* PXL Balance Display for mobile - logged-in users */}
            {user && platformUser && (
              <Link 
                href="/pxl" 
                className="flex items-center justify-between mb-4 p-3 rounded-lg bg-gray-900/50 border border-gray-800"
                onClick={() => setIsMenuOpen(false)}
              >
                <div className="flex items-center space-x-2">
                  <Wallet className="h-5 w-5 text-gray-400" />
                  <span className="text-base font-medium text-white">PXL Balance</span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-base font-semibold text-white">
                    {formatPXL(platformUser.wallets?.pxl?.balance || 0)}
                  </span>
                  <span className="text-sm text-gray-500">PXL</span>
                </div>
              </Link>
            )}
            
            <nav className="space-y-4">
              {finalNavigationItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block text-base text-gray-400 hover:text-white transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
            
            {user && platformUser ? (
              <div className="mt-6 pt-6 border-t border-gray-900 space-y-3">
                <div className="flex items-center space-x-3 mb-4">
                  <UserAvatar user={platformUser} size={40} />
                  <div>
                    <div className="text-sm text-white font-medium">
                      {platformUser.profile.firstName} {platformUser.profile.lastName}
                    </div>
                    <div className="text-xs text-gray-400 capitalize">
                      {platformUser.tier.current} Tier
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-gray-400 hover:text-white"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            ) : (
              <div className="mt-6 pt-6 border-t border-gray-900 space-y-3">
                <Link href="/auth/signin">
                  <Button variant="ghost" className="w-full justify-start text-gray-400 hover:text-white">
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button className="w-full bg-white text-black hover:bg-gray-200">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Click outside to close user menu */}
      {isUserMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsUserMenuOpen(false)}
        />
      )}
    </header>
  );
}
