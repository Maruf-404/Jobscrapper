'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { ReviewPost } from '@/types/review';
import { ROLE_TAXONOMY, CANONICAL_CITIES } from '@/types/taxonomy';

export function useReviewSession() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(false);

  const [posts, setPosts] = useState<ReviewPost[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isLoadingPosts, setIsLoadingPosts] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Form states for manual correction on current post
  const [selectedRole, setSelectedRole] = useState<string>('Other');
  const [selectedCity, setSelectedCity] = useState<string>('Other India');
  const [isRoleCorrect, setIsRoleCorrect] = useState<boolean>(true);
  const [isCityCorrect, setIsCityCorrect] = useState<boolean>(true);

  const loadSamplePosts = useCallback(async () => {
    setIsLoadingPosts(true);
    try {
      const res = await fetch('/api/review/sample');
      const data = await res.json();
      if (data.posts && Array.isArray(data.posts)) {
        setPosts(data.posts);
        const firstUnreviewed = data.posts.findIndex((p: ReviewPost) => p.is_reviewed !== true);
        if (firstUnreviewed >= 0) {
          setCurrentIndex(firstUnreviewed);
          setSelectedRole(data.posts[firstUnreviewed].true_role || data.posts[firstUnreviewed].llm_role || 'Other');
          setSelectedCity(data.posts[firstUnreviewed].true_city || data.posts[firstUnreviewed].llm_city || 'Other India');
        } else if (data.posts.length > 0) {
          setCurrentIndex(data.posts.length);
        }
      }
    } catch (err) {
      console.error('Failed to load review sample posts', err);
    } finally {
      setIsLoadingPosts(false);
    }
  }, []);

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
  }, [loadSamplePosts]);

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

  // Sync selected dropdowns & booleans whenever current post changes
  useEffect(() => {
    if (posts.length > 0 && currentIndex < posts.length) {
      const current = posts[currentIndex];
      const roleOk = current.role_correct !== false;
      const cityOk = current.city_correct !== false;
      setIsRoleCorrect(roleOk);
      setIsCityCorrect(cityOk);
      setSelectedRole(current.true_role || current.llm_role || 'Other');
      setSelectedCity(current.true_city || current.llm_city || 'Other India');
    }
  }, [currentIndex, posts]);

  const currentPost = posts[currentIndex];

  const handleSaveAnswer = async (
    roleOk: boolean = isRoleCorrect,
    cityOk: boolean = isCityCorrect,
    customRole: string = selectedRole,
    customCity: string = selectedCity
  ) => {
    if (!currentPost) return;

    const finalTrueRole = roleOk ? currentPost.llm_role : customRole;
    const finalTrueCity = cityOk ? currentPost.llm_city : customCity;

    setIsSubmitting(true);

    try {
      await fetch('/api/review/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postId: currentPost.id,
          true_role: finalTrueRole,
          true_city: finalTrueCity,
          role_correct: roleOk,
          city_correct: cityOk,
        }),
      });

      setPosts((prev) => {
        const next = [...prev];
        next[currentIndex] = {
          ...next[currentIndex],
          true_role: finalTrueRole,
          true_city: finalTrueCity,
          role_correct: roleOk,
          city_correct: cityOk,
          is_reviewed: true,
        };
        return next;
      });

      setCurrentIndex((prev) => prev + 1);
    } catch (err) {
      console.error('Failed to save review answer', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBothCorrect = () => {
    if (!currentPost) return;
    handleSaveAnswer(true, true, currentPost.llm_role, currentPost.llm_city);
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleResetToStart = () => {
    setCurrentIndex(0);
  };

  // Metrics
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
  };

  return {
    isAuthenticated,
    passwordInput,
    setPasswordInput,
    showPassword,
    setShowPassword,
    authError,
    isAuthLoading,
    handlePasswordSubmit,
    posts,
    currentIndex,
    currentPost,
    isLoadingPosts,
    isSubmitting,
    selectedRole,
    setSelectedRole,
    selectedCity,
    setSelectedCity,
    isRoleCorrect,
    setIsRoleCorrect,
    isCityCorrect,
    setIsCityCorrect,
    handleSaveAnswer,
    handleBothCorrect,
    handlePrevious,
    handleResetToStart,
    roleAccuracy,
    cityAccuracy,
    bothAccuracy,
    mistakesList,
    reviewedPosts,
    handleDownloadCSV,
  };
}
