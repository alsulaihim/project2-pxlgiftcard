'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ValidatedInput } from '@/components/ui/validated-input';
import { ProfilePictureUpload } from '@/components/ui/profile-picture-upload';
import { COUNTRIES, validatePhoneNumber, getCountriesSorted } from '@/data/countries-regions';

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, platformUser, signUp, signInWithGoogle, signInWithFacebook, signInWithApple, setupUserProfile } = useAuth();
  
  // Form state
  const [step, setStep] = useState<'auth' | 'profile'>('auth');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  
  // Authentication form data
  const [authData, setAuthData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  // Profile form data (all mandatory fields per PRD)
  const [profileData, setProfileData] = useState({
    username: '',
    firstName: '',
    lastName: '',
    phone: '',
    country: 'US',
    region: '',
    gender: '' as 'Male' | 'Female' | '',
    dateOfBirth: '',
    profilePicture: null as File | null,
    profilePictureUrl: undefined as string | undefined
  });

  // Validation states
  const [phoneError, setPhoneError] = useState('');
  const [usernameError, setUsernameError] = useState('');

  // Check if user is already authenticated and needs profile completion
  useEffect(() => {
    const stepParam = searchParams.get('step');
    if (user && !platformUser) {
      // User is authenticated but needs profile setup
      setStep('profile');
    } else if (user && platformUser) {
      // User is fully set up, redirect to dashboard
      router.push('/dashboard');
    } else if (stepParam === 'profile') {
      // URL indicates profile step but no authenticated user
      setStep('profile');
    }
  }, [user, platformUser, searchParams, router]);

  // Auto-select country code when country changes and validate phone
  React.useEffect(() => {
    const country = COUNTRIES[profileData.country];
    if (country) {
      // Auto-add country code if phone doesn't start with it
      if (profileData.phone && !profileData.phone.startsWith(country.phoneCode)) {
        const phoneDigits = profileData.phone.replace(/\D/g, '');
        setProfileData(prev => ({
          ...prev,
          phone: country.phoneCode + phoneDigits
        }));
      } else if (!profileData.phone) {
        setProfileData(prev => ({
          ...prev,
          phone: country.phoneCode
        }));
      }
      
      // Validate phone number
      if (profileData.phone && profileData.phone !== country.phoneCode) {
        const isValid = validatePhoneNumber(profileData.phone, profileData.country);
        setPhoneError(isValid ? '' : `Invalid phone format. Example: ${country.phoneExample}`);
      }
    }
  }, [profileData.country, profileData.phone]);

  // Handle email/password signup
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate passwords match
    if (authData.password !== authData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    // Validate password strength
    if (authData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    
    setLoading(true);
    
    try {
      await signUp(authData.email, authData.password);
      setStep('profile');
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  // Handle social login
  const handleSocialLogin = async (provider: 'google' | 'facebook' | 'apple') => {
    setError('');
    setLoading(true);
    
    try {
      let user;
      switch (provider) {
        case 'google':
          user = await signInWithGoogle();
          break;
        case 'facebook':
          user = await signInWithFacebook();
          break;
        case 'apple':
          user = await signInWithApple();
          break;
      }
      
      // Pre-fill profile data from social login
      if (user.displayName) {
        const [firstName, ...lastNameParts] = user.displayName.split(' ');
        setProfileData(prev => ({
          ...prev,
          firstName: firstName || '',
          lastName: lastNameParts.join(' ') || ''
        }));
      }
      
      setStep('profile');
    } catch (err: any) {
      setError(err.message || `Failed to sign in with ${provider}`);
    } finally {
      setLoading(false);
    }
  };

  // BUG FIX: 2025-01-27 - Add loading state and fix KYC status
  // Problem: Profile setup blinks before redirect, KYC status hardcoded to pending
  // Solution: Add loading state during profile setup, set KYC to verified after completion
  // Impact: Smooth transition to dashboard, correct KYC status display
  
  // Handle profile setup
  const handleProfileSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate required fields
    const requiredFields = ['username', 'firstName', 'lastName', 'phone', 'country', 'region', 'gender'];
    const missingFields = requiredFields.filter(field => !profileData[field as keyof typeof profileData]);
    
    if (missingFields.length > 0) {
      setError(`Please fill in all required fields: ${missingFields.join(', ')}`);
      return;
    }
    
    // Validate username format (@username)
    if (!profileData.username.startsWith('@') || profileData.username.length < 4) {
      setUsernameError('Username must start with @ and be at least 3 characters long');
      return;
    } else {
      setUsernameError('');
    }
    
    // Validate phone number using country-specific validation
    const country = COUNTRIES[profileData.country];
    if (!country || !validatePhoneNumber(profileData.phone, profileData.country)) {
      setPhoneError(`Invalid phone format. Example: ${country?.phoneExample || '+1 555 123 4567'}`);
      return;
    } else {
      setPhoneError('');
    }
    
    setLoading(true);
    
    try {
      const countryCode = country.phoneCode;
      
      await setupUserProfile(profileData.username, {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        phone: profileData.phone,
        countryCode,
        country: profileData.country,
        region: profileData.region,
        gender: profileData.gender as 'Male' | 'Female',
        dateOfBirth: profileData.dateOfBirth || undefined,
        avatarUrl: profileData.profilePictureUrl || undefined,
        kycStatus: 'verified' // Set to verified after completing profile setup
      });
      
      // Add loading state to prevent blink and ensure smooth transition
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Use replace instead of push to prevent back navigation issues
      router.replace('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to setup profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-900 border-gray-800">
        <div className="p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">
              {step === 'auth' ? 'Create Account' : 'Complete Your Profile'}
            </h1>
            <p className="text-gray-400">
              {step === 'auth' 
                ? 'Join PXL Platform and start earning rewards' 
                : 'Tell us about yourself to get started'
              }
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {step === 'auth' ? (
            <>
              {/* Social Login Buttons */}
              <div className="space-y-3 mb-6">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-white text-black border-white hover:bg-gray-100"
                  onClick={() => handleSocialLogin('google')}
                  disabled={loading}
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-black text-white border-white hover:bg-gray-900"
                  onClick={() => handleSocialLogin('apple')}
                  disabled={loading}
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                  </svg>
                  Continue with Apple
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
                  onClick={() => handleSocialLogin('facebook')}
                  disabled={loading}
                >
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Continue with Facebook
                </Button>
              </div>

              {/* Divider */}
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-700"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-gray-900 text-gray-400">Or continue with email</span>
                </div>
              </div>

              {/* Email/Password Form */}
              <form onSubmit={handleEmailSignUp} className="space-y-4">
                <ValidatedInput
                  type="email"
                  placeholder="Enter your email"
                  value={authData.email}
                  onChange={(value) => setAuthData(prev => ({ ...prev, email: value }))}
                  required
                />

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Create password"
                    value={authData.password}
                    onChange={(e) => setAuthData(prev => ({ ...prev, password: e.target.value }))}
                    required
                    minLength={8}
                    className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm password"
                    value={authData.confirmPassword}
                    onChange={(e) => setAuthData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                    minLength={8}
                    className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>
            </>
          ) : (
            /* Profile Setup Form */
            <form onSubmit={handleProfileSetup} className="space-y-4">
              {/* Profile Picture Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2 text-center">
                  Profile Picture (Optional)
                </label>
                <ProfilePictureUpload
                  value={profileData.profilePictureUrl}
                  onChange={(file, previewUrl) => setProfileData(prev => ({
                    ...prev,
                    profilePicture: file,
                    profilePictureUrl: previewUrl || undefined
                  }))}
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <ValidatedInput
                  type="text"
                  placeholder="First name *"
                  value={profileData.firstName}
                  onChange={(value) => setProfileData(prev => ({ ...prev, firstName: value }))}
                  required
                />
                
                <ValidatedInput
                  type="text"
                  placeholder="Last name *"
                  value={profileData.lastName}
                  onChange={(value) => setProfileData(prev => ({ ...prev, lastName: value }))}
                  required
                />
              </div>

              <div>
                <ValidatedInput
                  type="username"
                  placeholder="@username *"
                  value={profileData.username}
                  onChange={(value) => setProfileData(prev => ({ ...prev, username: value }))}
                  required
                />
                {usernameError && (
                  <p className="text-red-400 text-sm mt-1">{usernameError}</p>
                )}
              </div>

              <div>
                <input
                  type="tel"
                  placeholder={`Phone number * (${COUNTRIES[profileData.country]?.phoneExample || '+1 555 123 4567'})`}
                  value={profileData.phone}
                  onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                  required
                  className={`w-full px-3 py-2 bg-black border rounded-lg text-white placeholder-gray-400 focus:outline-none ${
                    phoneError ? 'border-red-500 focus:border-red-500' : 'border-gray-700 focus:border-blue-500'
                  }`}
                />
                {phoneError && (
                  <p className="text-red-400 text-sm mt-1">{phoneError}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <select
                  className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  value={profileData.country}
                  onChange={(e) => setProfileData(prev => ({ ...prev, country: e.target.value, region: '' }))}
                  required
                  title="Select your country"
                  aria-label="Select your country"
                >
                  <option value="">Select Country *</option>
                  {getCountriesSorted().map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.name}
                    </option>
                  ))}
                </select>

                <select
                  className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  value={profileData.region}
                  onChange={(e) => setProfileData(prev => ({ ...prev, region: e.target.value }))}
                  required
                  title="Select your region"
                  aria-label="Select your region"
                  disabled={!profileData.country}
                >
                  <option value="">Select Region *</option>
                  {profileData.country && COUNTRIES[profileData.country]?.regions.map((region) => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <select
                  className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                  value={profileData.gender}
                  onChange={(e) => setProfileData(prev => ({ ...prev, gender: e.target.value as 'Male' | 'Female' }))}
                  required
                  title="Select your gender"
                  aria-label="Select your gender"
                >
                  <option value="">Select Gender *</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>

                <input
                  type="date"
                  placeholder="Date of Birth"
                  value={profileData.dateOfBirth}
                  onChange={(e) => setProfileData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                  className="w-full px-3 py-2 bg-black border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={loading}
              >
                {loading ? 'Setting up Profile...' : 'Complete Setup'}
              </Button>
            </form>
          )}

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-gray-400 text-sm">
              Already have an account?{' '}
              <Link href="/auth/signin" className="text-blue-400 hover:text-blue-300">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
