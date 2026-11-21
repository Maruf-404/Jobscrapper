'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, Download, ArrowLeft } from 'lucide-react';
import { ReviewPost } from '@/types/review';

interface ReviewScorecardProps {
  totalPosts: number;
  reviewedPosts: ReviewPost[];
  roleAccuracy: number;
  cityAccuracy: number;
  bothAccuracy: number;
  onDownloadCSV: () => void;
  onReviewAgain: () => void;
}

export default function ReviewScorecard({
  totalPosts,
  reviewedPosts,
  roleAccuracy,
  cityAccuracy,
  bothAccuracy,
  onDownloadCSV,
  onReviewAgain,
}: ReviewScorecardProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#EAECF0] p-6 sm:p-8 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#EAECF0]">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#ECFDF3] text-[#027A48] border border-[#ABEFC6] mb-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>Evaluation Complete</span>
          </div>
          <h1 className="text-2xl font-bold text-[#101828]">Ground-Truth Tagging Scorecard</h1>
          <p className="text-xs text-[#667085] mt-1">
            Evaluated all {totalPosts} posts against ground truth. Results persisted to database.
          </p>
        </div>
      </div>

      {/* Accuracy KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <div className="border border-[#EAECF0] rounded-xl p-4 bg-[#F9FAFB]">
          <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">Role Accuracy</span>
          <div className="text-2xl font-bold text-[#101828] mt-1">{roleAccuracy}%</div>
          <p className="text-[11px] text-[#027A48] mt-0.5">
            {reviewedPosts.filter((p) => p.role_correct).length} of {totalPosts} correct
          </p>
        </div>

        <div className="border border-[#EAECF0] rounded-xl p-4 bg-[#F9FAFB]">
          <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">City Accuracy</span>
          <div className="text-2xl font-bold text-[#101828] mt-1">{cityAccuracy}%</div>
          <p className="text-[11px] text-[#027A48] mt-0.5">
            {reviewedPosts.filter((p) => p.city_correct).length} of {totalPosts} correct
          </p>
        </div>

        <div className="border border-[#EAECF0] rounded-xl p-4 bg-[#F9FAFB]">
          <span className="text-xs font-semibold text-[#667085] uppercase tracking-wider">Overall Precision</span>
          <div className="text-2xl font-bold text-[#0D81FC] mt-1">{bothAccuracy}%</div>
          <p className="text-[11px] text-[#0D81FC] mt-0.5">Both role &amp; city correct</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3 mt-6 pt-6 border-t border-[#EAECF0]">
        <button
          onClick={onDownloadCSV}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#0D81FC] hover:bg-[#0B72DF] transition-colors shadow-xs"
        >
          <Download className="w-4 h-4" />
          <span>Download CSV</span>
        </button>
        <button
          onClick={onReviewAgain}
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#344054] bg-[#F2F4F7] hover:bg-[#E4E7EC] transition-colors"
        >
          Review Again
        </button>
        <Link
          href="/"
          className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[#0D81FC] hover:underline"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}
