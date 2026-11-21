'use client';

import React from 'react';
import Link from 'next/link';
import { Lock, Eye, EyeOff, Loader2 } from 'lucide-react';

interface ReviewAuthModalProps {
  passwordInput: string;
  setPasswordInput: (val: string) => void;
  showPassword: boolean;
  setShowPassword: (val: boolean | ((prev: boolean) => boolean)) => void;
  authError: string;
  isAuthLoading: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export default function ReviewAuthModal({
  passwordInput,
  setPasswordInput,
  showPassword,
  setShowPassword,
  authError,
  isAuthLoading,
  onSubmit,
}: ReviewAuthModalProps) {
  return (
    <div className="max-w-md mx-auto my-12 bg-white rounded-2xl border border-[#EAECF0] p-6 sm:p-8 shadow-xs">
      <div className="w-12 h-12 rounded-xl bg-[#EFF7FF] flex items-center justify-center text-[#0D81FC] mb-4">
        <Lock className="w-6 h-6" />
      </div>

      <h1 className="text-xl font-bold text-[#101828]">Admin Verification Portal</h1>
      <p className="text-xs text-[#667085] mt-1.5 leading-relaxed">
        This page is protected for evaluation. Enter the review password configured in your environment to evaluate
        the 50 seeded posts.
      </p>

      <form onSubmit={onSubmit} className="mt-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#344054] mb-1.5">Review Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter password..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D0D5DD] bg-white text-sm text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#0D81FC]/20 focus:border-[#0D81FC] pr-10"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#475467]"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {authError && <p className="text-xs text-[#F04438] mt-1.5 font-medium">{authError}</p>}
        </div>

        <button
          type="submit"
          disabled={isAuthLoading || !passwordInput}
          className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#0D81FC] hover:bg-[#0B72DF] disabled:opacity-50 transition-colors shadow-xs flex items-center justify-center gap-2"
        >
          {isAuthLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Verifying...</span>
            </>
          ) : (
            <span>Authenticate</span>
          )}
        </button>
      </form>

      <div className="mt-6 pt-4 border-t border-[#EAECF0] text-center">
        <Link href="/" className="text-xs text-[#0D81FC] font-semibold hover:underline">
          ← Return to Job Feed
        </Link>
      </div>
    </div>
  );
}
