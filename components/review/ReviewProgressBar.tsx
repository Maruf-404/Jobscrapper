'use client';

import React from 'react';

interface ReviewProgressBarProps {
  currentIndex: number;
  totalPosts: number;
  roleAccuracy: number;
  cityAccuracy: number;
}

export default function ReviewProgressBar({
  currentIndex,
  totalPosts,
  roleAccuracy,
  cityAccuracy,
}: ReviewProgressBarProps) {
  const progressPercent = totalPosts > 0 ? Math.round((currentIndex / totalPosts) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-[#EAECF0] p-4 sm:p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-[#101828]">Ground-Truth Evaluation</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#EFF7FF] text-[#0D81FC] border border-[#B2D7FE]">
              Post {currentIndex + 1} of {totalPosts}
            </span>
          </div>
          <p className="text-xs text-[#667085] mt-0.5">
            Review and verify the Gemini LLM role and city classification.
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-[#475467]">
            Role: <strong className="text-[#101828]">{roleAccuracy}%</strong>
          </span>
          <span className="text-[#475467]">
            City: <strong className="text-[#101828]">{cityAccuracy}%</strong>
          </span>
        </div>
      </div>

      <div className="w-full h-2 rounded-full bg-[#F2F4F7] overflow-hidden">
        <div
          className="h-full bg-[#0D81FC] transition-all duration-300 rounded-full"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}
