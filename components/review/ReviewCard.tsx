'use client';

import React from 'react';
import {
  Building,
  MapPin,
  Sparkles,
  ExternalLink,
  Check,
  X,
  ArrowRight,
  ArrowLeft,
} from 'lucide-react';
import { ReviewPost } from '@/types/review';
import { ROLE_TAXONOMY, CANONICAL_CITIES } from '@/types/taxonomy';

interface ReviewCardProps {
  post: ReviewPost;
  currentIndex: number;
  isSubmitting: boolean;
  selectedRole: string;
  setSelectedRole: (role: string) => void;
  selectedCity: string;
  setSelectedCity: (city: string) => void;
  isRoleCorrect: boolean;
  setIsRoleCorrect: (ok: boolean) => void;
  isCityCorrect: boolean;
  setIsCityCorrect: (ok: boolean) => void;
  onBothCorrect: () => void;
  onSaveDecision: (roleOk: boolean, cityOk: boolean, trueRole: string, trueCity: string) => void;
  onPrevious: () => void;
}

export default function ReviewCard({
  post,
  currentIndex,
  isSubmitting,
  selectedRole,
  setSelectedRole,
  selectedCity,
  setSelectedCity,
  isRoleCorrect,
  setIsRoleCorrect,
  isCityCorrect,
  setIsCityCorrect,
  onBothCorrect,
  onSaveDecision,
  onPrevious,
}: ReviewCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#EAECF0] p-5 sm:p-6 shadow-xs space-y-5">
      {/* Post Information */}
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-[#98A2B3]">Candidate Position</span>
          {post.apply_url && (
            <a
              href={post.apply_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#0D81FC] bg-[#EFF7FF] hover:bg-[#D1E9FF] border border-[#B2D7FE] transition-colors shadow-2xs w-fit"
              title="Open original job posting on official employer site in a new tab"
            >
              <span>View Original Job Posting</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
        <h2 className="text-xl font-bold text-[#101828] mt-1">{post.title}</h2>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#475467] mt-2">
          <div className="flex items-center space-x-1.5 font-medium">
            <Building className="w-3.5 h-3.5 text-[#98A2B3]" />
            <span>{post.company}</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <MapPin className="w-3.5 h-3.5 text-[#98A2B3]" />
            <span>Location: {post.location_raw}</span>
          </div>
        </div>

        {post.description_snippet && (
          <p className="text-xs text-[#475467] mt-3 p-3 rounded-xl bg-[#F9FAFB] border border-[#EAECF0] leading-relaxed">
            {post.description_snippet}
          </p>
        )}
      </div>

      {/* LLM Output Box with Boolean Options */}
      <div className="p-4 sm:p-5 rounded-2xl border border-[#B2DDFF] bg-[#EFF8FF]/40 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#0D81FC] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Gemini LLM Classification &amp; Verification</span>
          </span>
          <span className="text-[11px] text-[#475467]">
            Click <strong className="text-[#027A48]">Correct</strong> or <strong className="text-[#B42318]">Wrong</strong> on each tag
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
          {/* Role Tag Card with Boolean Switch */}
          <div
            className={`bg-white rounded-xl p-3.5 border transition-all ${
              isRoleCorrect ? 'border-[#B2DDFF]' : 'border-[#FDA29B] ring-2 ring-[#FDA29B]/20'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-[#667085] font-semibold uppercase tracking-wider">Role Tag</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isRoleCorrect ? 'bg-[#ECFDF3] text-[#027A48]' : 'bg-[#FEF3F2] text-[#B42318]'
                }`}
              >
                {isRoleCorrect ? '✓ Correct' : '✗ Marked Wrong'}
              </span>
            </div>

            <div className="text-sm font-bold text-[#101828] py-1">{post.llm_role}</div>

            {/* Boolean Buttons */}
            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[#EAECF0]">
              <button
                type="button"
                onClick={() => {
                  setIsRoleCorrect(true);
                  setSelectedRole(post.llm_role);
                }}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  isRoleCorrect
                    ? 'bg-[#12B76A] text-white shadow-2xs'
                    : 'bg-[#F2F4F7] text-[#475467] hover:bg-[#E4E7EC]'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Correct</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsRoleCorrect(false);
                  if (selectedRole === post.llm_role) {
                    const alternate = ROLE_TAXONOMY.find((r) => r !== post.llm_role) || 'Other';
                    setSelectedRole(alternate);
                  }
                }}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  !isRoleCorrect
                    ? 'bg-[#F04438] text-white shadow-2xs'
                    : 'bg-[#F2F4F7] text-[#475467] hover:bg-[#E4E7EC]'
                }`}
              >
                <X className="w-3.5 h-3.5" />
                <span>Wrong</span>
              </button>
            </div>

            {/* Show Dropdown only if marked Wrong */}
            {!isRoleCorrect && (
              <div className="mt-2.5 pt-2 border-t border-[#FDA29B]/40 animate-in fade-in duration-150">
                <label className="block text-[11px] font-semibold text-[#B42318] mb-1">
                  Choose True Role:
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#FDA29B] bg-white text-xs text-[#101828] font-medium focus:outline-none focus:ring-2 focus:ring-[#F04438]/20 focus:border-[#F04438]"
                >
                  {ROLE_TAXONOMY.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* City Tag Card with Boolean Switch */}
          <div
            className={`bg-white rounded-xl p-3.5 border transition-all ${
              isCityCorrect ? 'border-[#B2DDFF]' : 'border-[#FDA29B] ring-2 ring-[#FDA29B]/20'
            }`}
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-[#667085] font-semibold uppercase tracking-wider">City Tag</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isCityCorrect ? 'bg-[#ECFDF3] text-[#027A48]' : 'bg-[#FEF3F2] text-[#B42318]'
                }`}
              >
                {isCityCorrect ? '✓ Correct' : '✗ Marked Wrong'}
              </span>
            </div>

            <div className="text-sm font-bold text-[#101828] py-1">{post.llm_city}</div>

            {/* Boolean Buttons */}
            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[#EAECF0]">
              <button
                type="button"
                onClick={() => {
                  setIsCityCorrect(true);
                  setSelectedCity(post.llm_city);
                }}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  isCityCorrect
                    ? 'bg-[#12B76A] text-white shadow-2xs'
                    : 'bg-[#F2F4F7] text-[#475467] hover:bg-[#E4E7EC]'
                }`}
              >
                <Check className="w-3.5 h-3.5" />
                <span>Correct</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsCityCorrect(false);
                  if (selectedCity === post.llm_city) {
                    const alternate = CANONICAL_CITIES.find((c) => c !== post.llm_city) || 'Other India';
                    setSelectedCity(alternate);
                  }
                }}
                className={`py-1.5 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  !isCityCorrect
                    ? 'bg-[#F04438] text-white shadow-2xs'
                    : 'bg-[#F2F4F7] text-[#475467] hover:bg-[#E4E7EC]'
                }`}
              >
                <X className="w-3.5 h-3.5" />
                <span>Wrong</span>
              </button>
            </div>

            {/* Show Dropdown only if marked Wrong */}
            {!isCityCorrect && (
              <div className="mt-2.5 pt-2 border-t border-[#FDA29B]/40 animate-in fade-in duration-150">
                <label className="block text-[11px] font-semibold text-[#B42318] mb-1">
                  Choose True City:
                </label>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-[#FDA29B] bg-white text-xs text-[#101828] font-medium focus:outline-none focus:ring-2 focus:ring-[#F04438]/20 focus:border-[#F04438]"
                >
                  {CANONICAL_CITIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Decision Area */}
      <div className="pt-2 border-t border-[#EAECF0] flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onPrevious}
          disabled={currentIndex === 0 || isSubmitting}
          className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#475467] hover:bg-[#E4E7EC] disabled:opacity-30 transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>

        {isRoleCorrect && isCityCorrect ? (
          <button
            type="button"
            onClick={onBothCorrect}
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 rounded-xl text-sm font-bold text-white bg-[#0D81FC] hover:bg-[#0B72DF] active:bg-[#0963C4] disabled:opacity-50 transition-colors shadow-xs flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Both Correct (Next Post →)</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSaveDecision(isRoleCorrect, isCityCorrect, selectedRole, selectedCity)}
            disabled={isSubmitting}
            className="flex-1 py-3 px-4 rounded-xl text-sm font-bold text-white bg-[#0D81FC] hover:bg-[#0B72DF] active:bg-[#0963C4] disabled:opacity-50 transition-colors shadow-xs flex items-center justify-center gap-2"
          >
            <span>Save Decision &amp; Next Post</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
