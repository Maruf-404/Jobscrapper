import { memo } from 'react';
import { ExternalLink, MapPin, Building, Calendar } from 'lucide-react';
import { PostItem } from '@/types/jobs';
import HighlightText from '@/components/ui/HighlightText';

interface PostCardProps {
  post: PostItem;
  highlightQuery?: string;
}

const ROLE_COLORS: Record<string, string> = {
  'Software Engineering': 'bg-[#EFF8FF] text-[#175CD3] border-[#B2DDFF]',
  'Data & Analytics': 'bg-[#F9F5FF] text-[#6941C6] border-[#E9D7FE]',
  'AI/ML': 'bg-[#FDF2FA] text-[#C11574] border-[#FCCEEE]',
  'Product': 'bg-[#FEF6EE] text-[#B93815] border-[#F9DBAF]',
  'Design/UX': 'bg-[#FFF1F3] text-[#C01048] border-[#FECDCA]',
  'Marketing': 'bg-[#FFF6ED] text-[#C4320A] border-[#FFD6AE]',
  'Sales & Business Development': 'bg-[#ECFDF3] text-[#027A48] border-[#ABEFC6]',
  'Content & Writing': 'bg-[#F0FDF9] text-[#0E7090] border-[#A5F3FC]',
  'Operations': 'bg-[#F0F9FF] text-[#026AA2] border-[#BAE6FD]',
  'Finance & Accounting': 'bg-[#EFF4FF] text-[#3538CD] border-[#C7D7FE]',
  'HR & Recruitment': 'bg-[#FDF2FA] text-[#B91C1C] border-[#FBCFE8]',
  'Customer Support': 'bg-[#F7FEE7] text-[#3F6212] border-[#D9F99D]',
  'Other': 'bg-[#F8F9FA] text-[#344054] border-[#EAECF0]',
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

function PostCard({ post, highlightQuery }: PostCardProps) {
  const roleColor = ROLE_COLORS[post.role || 'Other'] || ROLE_COLORS['Other'];
  const isGenericDescription =
    !post.description ||
    /^early career/i.test(post.description.trim()) ||
    post.description.trim().length === 0;

  return (
    <article className="flex flex-col justify-between bg-white rounded-xl border border-[#EAECF0] p-4 sm:p-5 hover:border-[#0D81FC]/40 hover:shadow-md hover:shadow-[#0D81FC]/5 transition-all duration-200 group">
      <div>
        {/* Top Role Badge */}
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleColor}`}
          >
            <HighlightText text={post.role || 'General Entry Level'} highlight={highlightQuery} />
          </span>
        </div>

        {/* Job Title & Company */}
        <h3 className="text-base font-semibold text-[#101828] group-hover:text-[#0D81FC] transition-colors line-clamp-2 leading-snug">
          <HighlightText text={post.title} highlight={highlightQuery} />
        </h3>

        <div className="flex items-center space-x-1.5 text-sm font-medium text-[#475467] mt-1.5">
          <Building className="w-4 h-4 text-[#98A2B3] shrink-0" />
          <span className="truncate">
            <HighlightText text={post.company} highlight={highlightQuery} />
          </span>
        </div>

        {/* Location & Relative Time */}
        <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-[#667085] mt-2">
          <div className="flex items-center space-x-1">
            <MapPin className="w-3.5 h-3.5 text-[#98A2B3] shrink-0" />
            <span className="font-medium text-[#344054]">
              <HighlightText text={post.city || 'India / Remote'} highlight={highlightQuery} />
            </span>
          </div>

          <div className="flex items-center space-x-1">
            <Calendar className="w-3.5 h-3.5 text-[#98A2B3] shrink-0" />
            <span>{formatRelativeDate(post.posted_at)}</span>
          </div>
        </div>

        {/* Raw Location */}
        {post.location_raw && post.location_raw.trim() !== (post.city || '').trim() && (
          <div className="mt-1 text-[11px] text-[#98A2B3] truncate">
            <HighlightText text={post.location_raw} highlight={highlightQuery} />
          </div>
        )}

        {/* Optional Snippet */}
        {!isGenericDescription && post.description && (
          <p className="mt-3 text-xs text-[#475467] line-clamp-2 leading-relaxed">
            <HighlightText text={post.description} highlight={highlightQuery} />
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#EAECF0]">
        <span className="text-[11px] font-semibold text-[#027A48] bg-[#ECFDF3] px-2 py-0.5 rounded-full border border-[#ABEFC6]">
          Verified Fresher
        </span>

        <a
          href={post.apply_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg text-white bg-[#0D81FC] hover:bg-[#0B72DF] transition-colors shadow-xs"
        >
          <span>Apply</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </article>
  );
}

export default memo(PostCard);
