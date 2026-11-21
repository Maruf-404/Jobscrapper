'use client';

import React from 'react';
import { AlertCircle, ExternalLink, Check } from 'lucide-react';
import { ReviewPost } from '@/types/review';

interface ReviewMistakesListProps {
  mistakesList: ReviewPost[];
}

export default function ReviewMistakesList({ mistakesList }: ReviewMistakesListProps) {
  return (
    <div className="bg-white rounded-2xl border border-[#EAECF0] p-6 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-[#101828] flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-[#B42318]" />
          <span>Misclassified Positions ({mistakesList.length})</span>
        </h2>
        <span className="text-xs text-[#667085]">
          {mistakesList.length === 0 ? 'Zero classification errors' : 'Discrepancies identified during review'}
        </span>
      </div>

      {mistakesList.length > 0 ? (
        <div className="space-y-3">
          {mistakesList.map((m) => (
            <div key={m.id} className="p-4 rounded-xl border border-[#EAECF0] bg-[#F9FAFB]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <h3 className="text-sm font-bold text-[#101828]">{m.title}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#667085]">{m.company}</span>
                  {m.apply_url && (
                    <a
                      href={m.apply_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-[#0D81FC] hover:underline"
                    >
                      <span>Posting</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
              <p className="text-xs text-[#667085] mt-1">{m.location_raw}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-[#EAECF0] text-xs">
                <div>
                  <span className="text-[#667085] font-medium">Role:</span>{' '}
                  {m.role_correct ? (
                    <span className="text-[#027A48] font-semibold">✓ {m.llm_role} (Correct)</span>
                  ) : (
                    <span>
                      <span className="text-[#B42318] line-through mr-1.5">{m.llm_role}</span>
                      <span className="text-[#027A48] font-semibold">→ {m.true_role}</span>
                    </span>
                  )}
                </div>
                <div>
                  <span className="text-[#667085] font-medium">City:</span>{' '}
                  {m.city_correct ? (
                    <span className="text-[#027A48] font-semibold">✓ {m.llm_city} (Correct)</span>
                  ) : (
                    <span>
                      <span className="text-[#B42318] line-through mr-1.5">{m.llm_city}</span>
                      <span className="text-[#027A48] font-semibold">→ {m.true_city}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Check className="w-10 h-10 text-[#12B76A] mx-auto mb-2" />
          <p className="text-sm font-semibold text-[#101828]">100% Accuracy Achieved</p>
          <p className="text-xs text-[#667085] mt-1">All 50 sampled positions matched the LLM's classification perfectly.</p>
        </div>
      )}
    </div>
  );
}
