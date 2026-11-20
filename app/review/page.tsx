'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Lock,
  CheckCircle2,
  AlertCircle,
  Download,
  ArrowRight,
  ArrowLeft,
  Building,
  MapPin,
  Sparkles,
  RefreshCw,
  Eye,
  EyeOff,
  Check,
  ExternalLink,
} from 'lucide-react';
import { ROLE_TAXONOMY, CANONICAL_CITIES } from '@/pipeline/prompts';

interface ReviewPost {
  id: string;
  title: string;
  company: string;
  location_raw: string;
  description_snippet: string;
  apply_url?: string;
  llm_role: string;
  llm_city: string;
  true_role?: string;
  true_city?: string;
  role_correct?: boolean;
  city_correct?: boolean;
  is_reviewed?: boolean;
}

export default function ReviewPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);

  const [posts, setPosts] = useState<ReviewPost[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isLoadingPosts, setIsLoadingPosts] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form states for manual correction
  const [selectedRole, setSelectedRole] = useState<string>('Other');
  const [selectedCity, setSelectedCity] = useState<string>('Other India');

  // Check auth cookie on mount
  useEffect(() => {
    const cookies = document.cookie.split(';').map((c) => c.trim());
    const authCookie = cookies.find((c) => c.startsWith('review_auth='));
    if (authCookie && authCookie.split('=')[1] === 'true') {
      setIsAuthenticated(true);
      loadSamplePosts();
    } else {
      setIsLoadingPosts(false);
    }
  }, []);

  const loadSamplePosts = async () => {
    setIsLoadingPosts(true);
    try {
      const res = await fetch('/api/review/sample');
      const data = await res.json();
      if (data.posts && Array.isArray(data.posts)) {
        setPosts(data.posts);
        // Find first unreviewed post index if resuming
        const firstUnreviewed = data.posts.findIndex((p: ReviewPost) => p.is_reviewed !== true);
        if (firstUnreviewed >= 0) {
          setCurrentIndex(firstUnreviewed);
          setSelectedRole(data.posts[firstUnreviewed].true_role || data.posts[firstUnreviewed].llm_role || 'Other');
          setSelectedCity(data.posts[firstUnreviewed].true_city || data.posts[firstUnreviewed].llm_city || 'Other India');
        } else if (data.posts.length > 0) {
          // If all already reviewed, start at the end screen
          setCurrentIndex(data.posts.length);
        }
      }
    } catch (err) {
      console.error('Failed to load review sample posts', err);
    } finally {
      setIsLoadingPosts(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);

    try {
      const res = await fetch('/api/review/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        loadSamplePosts();
      } else {
        setAuthError(data.error || 'Incorrect review password. Check your REVIEW_PASSWORD env variable.');
      }
    } catch {
      setAuthError('Connection error. Please try again.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // Sync selected dropdowns whenever current post changes
  useEffect(() => {
    if (posts.length > 0 && currentIndex < posts.length) {
      const current = posts[currentIndex];
      setSelectedRole(current.true_role || current.llm_role || 'Other');
      setSelectedCity(current.true_city || current.llm_city || 'Other India');
    }
  }, [currentIndex, posts]);

  const currentPost = posts[currentIndex];

  const handleSaveAnswer = async (trueRole: string, trueCity: string) => {
    if (!currentPost) return;

    const roleCorrect = trueRole === currentPost.llm_role;
    const cityCorrect = trueCity === currentPost.llm_city;

    setIsSubmitting(true);

    try {
      await fetch('/api/review/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: currentPost.id,
          true_role: trueRole,
          true_city: trueCity,
          role_correct: roleCorrect,
          city_correct: cityCorrect,
        }),
      });

      // Update local state
      setPosts((prev) => {
        const next = [...prev];
        next[currentIndex] = {
          ...next[currentIndex],
          true_role: trueRole,
          true_city: trueCity,
          role_correct: roleCorrect,
          city_correct: cityCorrect,
          is_reviewed: true,
        };
        return next;
      });

      // Advance to next post
      setCurrentIndex((prev) => prev + 1);
    } catch (err) {
      console.error('Failed to save review answer', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBothCorrect = () => {
    if (!currentPost) return;
    handleSaveAnswer(currentPost.llm_role, currentPost.llm_city);
  };

  const handleCorrectionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSaveAnswer(selectedRole, selectedCity);
  };

  // Calculated metrics
  const reviewedPosts = useMemo(() => posts.filter((p) => p.is_reviewed), [posts]);
  const roleAccuracy = useMemo(() => {
    if (reviewedPosts.length === 0) return 100;
    const correct = reviewedPosts.filter((p) => p.role_correct).length;
    return Math.round((correct / reviewedPosts.length) * 1000) / 10;
  }, [reviewedPosts]);

  const cityAccuracy = useMemo(() => {
    if (reviewedPosts.length === 0) return 100;
    const correct = reviewedPosts.filter((p) => p.city_correct).length;
    return Math.round((correct / reviewedPosts.length) * 1000) / 10;
  }, [reviewedPosts]);

  const bothAccuracy = useMemo(() => {
    if (reviewedPosts.length === 0) return 100;
    const correct = reviewedPosts.filter((p) => p.role_correct && p.city_correct).length;
    return Math.round((correct / reviewedPosts.length) * 1000) / 10;
  }, [reviewedPosts]);

  const mistakesList = useMemo(() => {
    return reviewedPosts.filter((p) => !p.role_correct || !p.city_correct);
  }, [reviewedPosts]);

  const handleDownloadCSV = () => {
    // Mandated columns: title, company, location_raw, llm_role, llm_city, true_role, true_city, role_correct, city_correct
    const headers = [
      'title',
      'company',
      'location_raw',
      'llm_role',
      'llm_city',
      'true_role',
      'true_city',
      'role_correct',
      'city_correct',
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""').replace(/\r?\n/g, ' ').trim();
      return str.includes(',') || str.includes('"') || str.includes('\n') ? `"${str}"` : str;
    };

    const rows = [headers.join(',')];

    for (const p of posts) {
      const r = [
        escapeCsv(p.title),
        escapeCsv(p.company),
        escapeCsv(p.location_raw),
        escapeCsv(p.llm_role),
        escapeCsv(p.llm_city),
        escapeCsv(p.true_role || p.llm_role),
        escapeCsv(p.true_city || p.llm_city),
        escapeCsv(p.role_correct !== false ? 'true' : 'false'),
        escapeCsv(p.city_correct !== false ? 'true' : 'false'),
      ];
      rows.push(r.join(','));
    }

    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'handcheck_reviewed.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 1. Password Protection Screen
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 p-6 sm:p-8 bg-white rounded-2xl border border-[#EAECF0] shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-[#EFF7FF] text-[#0D81FC] flex items-center justify-center mb-4 mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-center text-[#101828]">Evaluation Review Protected</h1>
        <p className="text-xs text-center text-[#667085] mt-1.5 leading-relaxed">
          Enter the <code className="text-[#0D81FC] font-mono">REVIEW_PASSWORD</code> to evaluate the 50 seeded ground-truth posts and record validation scores.
        </p>

        <form onSubmit={handlePasswordSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#344054] uppercase tracking-wider mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter password..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D0D5DD] bg-white text-sm text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#0D81FC]/20 focus:border-[#0D81FC] transition-all pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#475467] p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {authError && <p className="text-xs text-[#B42318] mt-2 font-medium">{authError}</p>}
          </div>

          <button
            type="submit"
            disabled={isAuthLoading || !passwordInput.trim()}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white bg-[#0D81FC] hover:bg-[#0B72DF] disabled:opacity-50 transition-colors shadow-xs"
          >
            {isAuthLoading ? 'Verifying...' : 'Unlock Review'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#EAECF0] text-center">
          <Link href="/" className="text-xs text-[#667085] hover:text-[#0D81FC] transition-colors">
            ← Return to Job Feed
          </Link>
        </div>
      </div>
    );
  }

  // 2. Loading State
  if (isLoadingPosts) {
    return (
      <div className="text-center py-20">
        <RefreshCw className="w-8 h-8 text-[#0D81FC] animate-spin mx-auto mb-3" />
        <p className="text-sm text-[#475467]">Loading 50 seeded ground-truth posts...</p>
      </div>
    );
  }

  const totalPosts = posts.length || 50;
  const progressPercent = Math.min(100, Math.round((currentIndex / totalPosts) * 100));
  const isFinished = currentIndex >= totalPosts;

  // 3. Final Evaluation Summary Screen
  if (isFinished) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Top Header Card */}
        <div className="bg-white rounded-2xl border border-[#EAECF0] p-6 sm:p-8 shadow-xs text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#ECFDF3] text-[#12B76A] flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-[#101828]">Evaluation Review Complete</h1>
          <p className="text-sm text-[#475467] mt-1 max-w-lg mx-auto">
            All 50 seeded posts from <code className="text-[#0D81FC] font-mono">export:sample</code> have been hand-checked and synchronized with the <code className="text-[#0D81FC] font-mono">hand_check</code> table.
          </p>

          {/* Metric Stats Cards */}
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
              <p className="text-[11px] text-[#0D81FC] mt-0.5">Both role & city correct</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-6 pt-6 border-t border-[#EAECF0]">
            <button
              onClick={handleDownloadCSV}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#0D81FC] hover:bg-[#0B72DF] transition-colors shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Download CSV</span>
            </button>
            <button
              onClick={() => setCurrentIndex(0)}
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

        {/* List of Mistakes */}
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
      </div>
    );
  }

  // 4. One-by-One Review Card Screen
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Top Header & Progress */}
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

        {/* Progress Bar */}
        <div className="w-full h-2 rounded-full bg-[#F2F4F7] overflow-hidden">
          <div
            className="h-full bg-[#0D81FC] transition-all duration-300 rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Main Review Card */}
      {currentPost && (
        <div className="bg-white rounded-2xl border border-[#EAECF0] p-5 sm:p-6 shadow-xs space-y-5">
          {/* Post Information */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-[#98A2B3]">Candidate Position</span>
              {currentPost.apply_url && (
                <a
                  href={currentPost.apply_url}
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
            <h2 className="text-xl font-bold text-[#101828] mt-1">{currentPost.title}</h2>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#475467] mt-2">
              <div className="flex items-center space-x-1.5 font-medium">
                <Building className="w-3.5 h-3.5 text-[#98A2B3]" />
                <span>{currentPost.company}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#98A2B3]" />
                <span>Location: {currentPost.location_raw}</span>
              </div>
            </div>

            {currentPost.description_snippet && (
              <p className="text-xs text-[#475467] mt-3 p-3 rounded-xl bg-[#F9FAFB] border border-[#EAECF0] leading-relaxed">
                {currentPost.description_snippet}
              </p>
            )}
          </div>

          {/* LLM Output Box */}
          <div className="p-4 rounded-xl border border-[#B2DDFF] bg-[#EFF8FF]/40 space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#0D81FC] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Gemini LLM Classification</span>
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="bg-white rounded-lg p-3 border border-[#B2DDFF]">
                <span className="text-[11px] text-[#667085] font-medium block">Tagged Role</span>
                <span className="text-sm font-bold text-[#101828] mt-0.5 block">{currentPost.llm_role}</span>
              </div>
              <div className="bg-white rounded-lg p-3 border border-[#B2DDFF]">
                <span className="text-[11px] text-[#667085] font-medium block">Tagged City</span>
                <span className="text-sm font-bold text-[#101828] mt-0.5 block">{currentPost.llm_city}</span>
              </div>
            </div>
          </div>

          {/* Action Decision Area */}
          <div className="pt-2 border-t border-[#EAECF0] space-y-4">
            {/* Quick 1-Click "Both Correct" Button */}
            <button
              type="button"
              onClick={handleBothCorrect}
              disabled={isSubmitting}
              className="w-full py-3 px-4 rounded-xl text-sm font-bold text-white bg-[#0D81FC] hover:bg-[#0B72DF] active:bg-[#0963C4] disabled:opacity-50 transition-colors shadow-xs flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Both Correct (Next)</span>
            </button>

            {/* Manual Correction Form */}
            <form onSubmit={handleCorrectionSubmit} className="p-4 rounded-xl border border-[#EAECF0] bg-[#F9FAFB] space-y-3">
              <span className="text-xs font-semibold text-[#344054] block">
                Or fix role and/or city:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[#667085] mb-1">True Role</label>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D0D5DD] bg-white text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#0D81FC]/20 focus:border-[#0D81FC]"
                  >
                    {ROLE_TAXONOMY.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#667085] mb-1">True City</label>
                  <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#D0D5DD] bg-white text-xs text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#0D81FC]/20 focus:border-[#0D81FC]"
                  >
                    {CANONICAL_CITIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentIndex === 0 || isSubmitting}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-[#475467] hover:bg-[#E4E7EC] disabled:opacity-30 transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-[#0D81FC] bg-[#EFF7FF] hover:bg-[#D1E9FF] border border-[#B2D7FE] transition-colors flex items-center gap-1.5"
                >
                  <span>Save Correction &amp; Next</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
