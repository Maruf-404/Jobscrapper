import { ExternalLink, MapPin, Building, Calendar, Sparkles } from 'lucide-react';
import { PostItem, formatToIST } from '@/lib/posts';
import HighlightText from './HighlightText';

interface PostCardProps {
  post: PostItem;
  highlightQuery?: string;
}

const ROLE_COLORS: Record<string, string> = {
  'Software Engineering': 'bg-blue-50 text-blue-700 border-blue-200',
  'Data & Analytics': 'bg-purple-50 text-purple-700 border-purple-200',
  'AI/ML': 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  'Product': 'bg-amber-50 text-amber-700 border-amber-200',
  'Design/UX': 'bg-rose-50 text-rose-700 border-rose-200',
  'Marketing': 'bg-orange-50 text-orange-700 border-orange-200',
  'Sales & Business Development': 'bg-emerald-50 text-emerald-700 border-emerald-200',
  'Content & Writing': 'bg-teal-50 text-teal-700 border-teal-200',
  'Operations': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'Finance & Accounting': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  'HR & Recruitment': 'bg-pink-50 text-pink-700 border-pink-200',
  'Customer Support': 'bg-lime-50 text-lime-700 border-lime-200',
  'Other': 'bg-slate-100 text-slate-700 border-slate-200',
};

const SOURCE_BADGES: Record<string, { label: string; style: string }> = {
  greenhouse: { label: 'Greenhouse', style: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  lever: { label: 'Lever', style: 'bg-sky-50 text-sky-700 border-sky-200' },
  ashby: { label: 'Ashby', style: 'bg-violet-50 text-violet-700 border-violet-200' },
  unstop: { label: 'Unstop', style: 'bg-amber-50 text-amber-700 border-amber-200' },
  jooble: { label: 'Jooble API', style: 'bg-blue-50 text-blue-700 border-blue-200' },
};

function formatRelativeDate(isoDate: string | null): string {
  if (!isoDate) return 'Recently';
  try {
    const diffMs = Date.now() - new Date(isoDate).getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return `${Math.floor(diffDays / 30)}mo ago`;
  } catch {
    return 'Recently';
  }
}

export default function PostCard({ post, highlightQuery }: PostCardProps) {
  const roleColor = ROLE_COLORS[post.role || 'Other'] || ROLE_COLORS['Other'];
  const sourceInfo = SOURCE_BADGES[post.source.toLowerCase()] || {
    label: post.source.toUpperCase(),
    style: 'bg-slate-50 text-slate-700 border-slate-200',
  };

  return (
    <article className="flex flex-col justify-between bg-white rounded-xl border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-50/50 transition-all duration-200 group">
      <div>
        {/* Top Badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleColor}`}
          >
            <HighlightText text={post.role || 'General Entry Level'} highlight={highlightQuery} />
          </span>
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border uppercase tracking-wider ${sourceInfo.style}`}
          >
            {sourceInfo.label}
          </span>
        </div>

        {/* Job Title & Company */}
        <h3 className="text-base font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2 leading-snug">
          <HighlightText text={post.title} highlight={highlightQuery} />
        </h3>

        <div className="flex items-center space-x-1.5 text-sm font-medium text-slate-700 mt-1.5">
          <Building className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="truncate">
            <HighlightText text={post.company} highlight={highlightQuery} />
          </span>
        </div>

        {/* Location & Relative Time */}
        <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-500 mt-2.5">
          <div className="flex items-center space-x-1">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="font-medium text-slate-600">
              <HighlightText text={post.city || 'India / Remote'} highlight={highlightQuery} />
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{formatRelativeDate(post.posted_at)}</span>
          </div>
        </div>

        {/* Raw Location Subtitle if different */}
        {post.location_raw && post.location_raw !== post.city && (
          <p className="text-[11px] text-slate-400 mt-1 truncate" title={post.location_raw}>
            <HighlightText text={post.location_raw} highlight={highlightQuery} />
          </p>
        )}

        {/* Description snippet */}
        {post.description && (
          <p className="text-xs text-slate-500 mt-3 line-clamp-2 leading-relaxed">
            <HighlightText text={post.description} highlight={highlightQuery} />
          </p>
        )}
      </div>

      {/* Card Action */}
      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
        <div>
          {/\b(intern|internship|trainee|apprentice)\b/i.test(post.title) ? (
            <span className="inline-flex items-center text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              Internship
            </span>
          ) : (
            <span className="inline-flex items-center text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
              Verified Fresher
            </span>
          )}
        </div>

        <a
          href={post.apply_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 transition-colors shadow-sm shadow-indigo-200"
        >
          <span>Apply</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </article>
  );
}
