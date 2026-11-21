'use client';

import React from 'react';
import { useReviewSession } from '@/hooks/useReviewSession';
import ReviewAuthModal from '@/components/review/ReviewAuthModal';
import ReviewProgressBar from '@/components/review/ReviewProgressBar';
import ReviewCard from '@/components/review/ReviewCard';
import ReviewScorecard from '@/components/review/ReviewScorecard';
import ReviewMistakesList from '@/components/review/ReviewMistakesList';
import { Loader2 } from 'lucide-react';

export default function ReviewPage() {
  const session = useReviewSession();

  // 1. Password Authentication Screen
  if (!session.isAuthenticated) {
    return (
      <ReviewAuthModal
        passwordInput={session.passwordInput}
        setPasswordInput={session.setPasswordInput}
        showPassword={session.showPassword}
        setShowPassword={session.setShowPassword}
        authError={session.authError}
        isAuthLoading={session.isAuthLoading}
        onSubmit={session.handlePasswordSubmit}
      />
    );
  }

  // 2. Loading State
  if (session.isLoadingPosts) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-3">
        <Loader2 className="w-8 h-8 text-[#0D81FC] animate-spin" />
        <p className="text-xs text-[#667085] font-medium">Loading evaluation posts...</p>
      </div>
    );
  }

  const totalPosts = session.posts.length;
  const isFinished = session.currentIndex >= totalPosts && totalPosts > 0;

  // 3. Final Summary & Metrics Screen
  if (isFinished) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <ReviewScorecard
          totalPosts={totalPosts}
          reviewedPosts={session.reviewedPosts}
          roleAccuracy={session.roleAccuracy}
          cityAccuracy={session.cityAccuracy}
          bothAccuracy={session.bothAccuracy}
          onDownloadCSV={session.handleDownloadCSV}
          onReviewAgain={session.handleResetToStart}
        />
        <ReviewMistakesList mistakesList={session.mistakesList} />
      </div>
    );
  }

  // 4. One-by-One Review Card Screen
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <ReviewProgressBar
        currentIndex={session.currentIndex}
        totalPosts={totalPosts}
        roleAccuracy={session.roleAccuracy}
        cityAccuracy={session.cityAccuracy}
      />

      {session.currentPost && (
        <ReviewCard
          post={session.currentPost}
          currentIndex={session.currentIndex}
          isSubmitting={session.isSubmitting}
          selectedRole={session.selectedRole}
          setSelectedRole={session.setSelectedRole}
          selectedCity={session.selectedCity}
          setSelectedCity={session.setSelectedCity}
          isRoleCorrect={session.isRoleCorrect}
          setIsRoleCorrect={session.setIsRoleCorrect}
          isCityCorrect={session.isCityCorrect}
          setIsCityCorrect={session.setIsCityCorrect}
          onBothCorrect={session.handleBothCorrect}
          onSaveDecision={session.handleSaveAnswer}
          onPrevious={session.handlePrevious}
        />
      )}
    </div>
  );
}
