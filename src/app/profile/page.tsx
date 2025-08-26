// BUG FIX: 2025-01-27 - Create profile page for user profile management
// Problem: Profile link in navigation and dashboard Edit Profile button not working
// Solution: Create dedicated profile page with user information and editing capabilities
// Impact: Users can access and manage their profile information

"use client";

import React, { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ValidatedInput } from '@/components/ui/validated-input';
import { ProfilePictureUpload } from '@/components/ui/profile-picture-upload';
import { User, Mail, Phone, MapPin, Calendar, Shield, Save, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { COUNTRIES, getCountriesSorted } from '@/data/countries-regions';
import { validateUsernameUniqueness } from '@/lib/validation';

/**
 * Profile page for user profile management and settings
 * Features profile editing, KYC status, and account information
 */
export default function ProfilePage() {
  const { user, platformUser, loading } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    username: platformUser?.username || '',
    firstName: platformUser?.profile.firstName || '',
    lastName: platformUser?.profile.lastName || '',
    phone: platformUser?.profile.phone || '',
    country: platformUser?.profile.country || '',
    region: platformUser?.profile.region || '',
    gender: platformUser?.profile.gender || '',
    avatarUrl: platformUser?.profile.avatarUrl || '',
  });
  const [usernameValidation, setUsernameValidation] = useState<{ isValid: boolean; error?: string }>({ isValid: true });
  const [isSaving, setIsSaving] = useState(false);

  // Show loading if not authenticated
  // Show loading while auth is initializing
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  // Redirect to sign in if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-gray-400 mb-6">Please sign in to access your profile.</p>
          <div className="space-x-4">
            <Link href="/auth/signin" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md">
              Sign In
            </Link>
            <Link href="/auth/signup" className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-md">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Show loading if user is authenticated but platform user data is still loading
  if (!platformUser) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-gray-400">Loading user data...</p>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    if (!user || !platformUser) return;
    
    try {
      setIsSaving(true);
      
      // Import Firebase functions
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('@/lib/firebase-config');
      
      // Update user document in Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        username: profileData.username,
        'profile.firstName': profileData.firstName,
        'profile.lastName': profileData.lastName,
        'profile.phone': profileData.phone,
        'profile.country': profileData.country,
        'profile.region': profileData.region,
        'profile.gender': profileData.gender,
        'profile.avatarUrl': profileData.avatarUrl,
        updatedAt: new Date()
      });
      
      // Update local state to reflect changes
      setIsEditing(false);
      
      // Show success message
      alert('Profile updated successfully!');
      
      // Refresh the page to get updated data from Firebase
      window.location.reload();
      
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Failed to save profile. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset form data
    setProfileData({
      username: platformUser?.username || '',
      firstName: platformUser?.profile.firstName || '',
      lastName: platformUser?.profile.lastName || '',
      phone: platformUser?.profile.phone || '',
      country: platformUser?.profile.country || '',
      region: platformUser?.profile.region || '',
      gender: platformUser?.profile.gender || '',
      avatarUrl: platformUser?.profile.avatarUrl || '',
    });
    setUsernameValidation({ isValid: true });
    setIsEditing(false);
  };

  const selectedCountry = COUNTRIES[profileData.country];

  return (
    <div className="min-h-screen bg-black">
      <main className="flex-1 py-8 md:py-12">
        <div className="container mx-auto px-4 md:px-6 lg:px-8 max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm" className="text-gray-400 hover:text-white">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Profile Settings</h1>
            <p className="text-gray-400">
              Manage your account information and preferences
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Picture and Basic Info */}
            <div className="lg:col-span-1">
              <Card className="bg-gray-900 border-gray-800 p-6">
                <div className="text-center">
                  <div className="mb-6">
                    <ProfilePictureUpload
                      value={profileData.avatarUrl}
                      onChange={(file, url) => setProfileData(prev => ({ ...prev, avatarUrl: url || '' }))}
                      disabled={!isEditing}
                    />
                  </div>
                  
                  <h2 className="text-xl font-semibold text-white mb-2">
                    {platformUser.profile.firstName} {platformUser.profile.lastName}
                  </h2>
                  <p className="text-gray-400 mb-2">{platformUser.username}</p>
                  <p className="text-gray-400 text-sm mb-4">{user.email}</p>
                  
                  {/* Tier Badge */}
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-600/20 text-blue-400 text-sm font-medium mb-4">
                    <Shield className="h-4 w-4 mr-1" />
                    {platformUser.tier.current.charAt(0).toUpperCase() + platformUser.tier.current.slice(1)} Tier
                  </div>
                  
                  {/* KYC Status */}
                  <div className="flex items-center justify-center gap-2 text-sm">
                    <span className="text-gray-400">KYC Status:</span>
                    <span className={`font-medium ${
                      platformUser.profile.kycStatus === 'verified' ? 'text-green-400' :
                      platformUser.profile.kycStatus === 'pending' ? 'text-yellow-400' :
                      'text-red-400'
                    }`}>
                      {platformUser.profile.kycStatus.charAt(0).toUpperCase() + platformUser.profile.kycStatus.slice(1)}
                    </span>
                  </div>
                </div>
              </Card>
            </div>

            {/* Profile Form */}
            <div className="lg:col-span-2">
              <Card className="bg-gray-900 border-gray-800 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-white">Personal Information</h3>
                  {!isEditing ? (
                    <Button 
                      onClick={() => setIsEditing(true)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Edit Profile
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        onClick={handleCancel}
                        className="border-gray-600 text-gray-300 hover:bg-gray-800"
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSave}
                        disabled={isSaving || !usernameValidation.isValid}
                        className="bg-green-600 hover:bg-green-700 disabled:opacity-50"
                      >
                        {isSaving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Username Field */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    <User className="h-4 w-4 inline mr-2" />
                    Username
                  </label>
                  <ValidatedInput
                    type="username"
                    value={profileData.username}
                    onChange={async (value) => {
                      // Update profile data
                      setProfileData(prev => ({ ...prev, username: value }));
                      
                      // Validate username uniqueness
                      if (value !== platformUser?.username) {
                        const validation = await validateUsernameUniqueness(value, user?.uid);
                        setUsernameValidation(validation);
                      } else {
                        setUsernameValidation({ isValid: true });
                      }
                    }}
                    disabled={!isEditing}
                    placeholder="@username"
                    className="bg-gray-800 border-gray-700 text-white"
                    onValidationChange={(isValid, error) => {
                      if (!isValid) {
                        setUsernameValidation({ isValid: false, error });
                      }
                    }}
                  />
                  {!usernameValidation.isValid && (
                    <p className="text-red-400 text-sm mt-1">{usernameValidation.error}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* First Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <User className="h-4 w-4 inline mr-2" />
                      First Name
                    </label>
                    <ValidatedInput
                      type="text"
                      value={profileData.firstName}
                      onChange={(value) => setProfileData(prev => ({ ...prev, firstName: value }))}
                      disabled={!isEditing}
                      placeholder="Enter your first name"
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>

                  {/* Last Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <User className="h-4 w-4 inline mr-2" />
                      Last Name
                    </label>
                    <ValidatedInput
                      type="text"
                      value={profileData.lastName}
                      onChange={(value) => setProfileData(prev => ({ ...prev, lastName: value }))}
                      disabled={!isEditing}
                      placeholder="Enter your last name"
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>

                  {/* Email (Read-only) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Mail className="h-4 w-4 inline mr-2" />
                      Email Address
                    </label>
                    <ValidatedInput
                      type="email"
                      value={user.email || ''}
                      disabled={true}
                      className="bg-gray-800 border-gray-700 text-gray-400"
                    />
                    <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <Phone className="h-4 w-4 inline mr-2" />
                      Phone Number
                    </label>
                    <ValidatedInput
                      type="text"
                      value={profileData.phone}
                      onChange={(value) => setProfileData(prev => ({ ...prev, phone: value }))}
                      disabled={!isEditing}
                      placeholder={selectedCountry?.phoneExample || "+1 234 567 8900"}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                  </div>

                  {/* Country */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <MapPin className="h-4 w-4 inline mr-2" />
                      Country
                    </label>
                    <select
                      value={profileData.country}
                      onChange={(e) => setProfileData(prev => ({ ...prev, country: e.target.value, region: '' }))}
                      disabled={!isEditing}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      aria-label="Select your country"
                    >
                      <option value="">Select Country</option>
                      {getCountriesSorted().map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.flag ? `${country.flag} ${country.name}` : `🌍 ${country.name}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Region */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <MapPin className="h-4 w-4 inline mr-2" />
                      Region/State
                    </label>
                    <select
                      value={profileData.region}
                      onChange={(e) => setProfileData(prev => ({ ...prev, region: e.target.value }))}
                      disabled={!isEditing || !profileData.country}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                      aria-label="Select your region or state"
                    >
                      <option value="">Select Region</option>
                      {selectedCountry?.regions.map((region) => (
                        <option key={region} value={region}>
                          {region}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Gender */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      <User className="h-4 w-4 inline mr-2" />
                      Gender
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="gender"
                          value="Male"
                          checked={profileData.gender === 'Male'}
                          onChange={(e) => setProfileData(prev => ({ ...prev, gender: e.target.value as 'Male' | 'Female' }))}
                          disabled={!isEditing}
                          className="mr-2 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-white">Male</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="gender"
                          value="Female"
                          checked={profileData.gender === 'Female'}
                          onChange={(e) => setProfileData(prev => ({ ...prev, gender: e.target.value as 'Male' | 'Female' }))}
                          disabled={!isEditing}
                          className="mr-2 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-white">Female</span>
                      </label>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Account Information */}
              <Card className="bg-gray-900 border-gray-800 p-6 mt-6">
                <h3 className="text-lg font-semibold text-white mb-4">Account Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Username</label>
                    <p className="text-white font-mono">{platformUser.username}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Member Since</label>
                    <p className="text-white">
                      {platformUser.timestamps?.created ? 
                        (platformUser.timestamps.created.toDate ? 
                          platformUser.timestamps.created.toDate().toLocaleDateString('en-US') : 
                          new Date(platformUser.timestamps.created).toLocaleDateString('en-US')
                        ) : 
                        'N/A'
                      }
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Current Tier</label>
                    <p className="text-white capitalize">{platformUser.tier.current}</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">PXL Balance</label>
                    <p className="text-green-400 font-semibold">
                      {platformUser.tier.pxlBalance.toLocaleString()} PXL
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
