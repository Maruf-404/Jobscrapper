import React from 'react';

interface HighlightTextProps {
  text: string | null | undefined;
  highlight?: string | null;
  className?: string;
}

/**
 * Escapes regex special characters in a string
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Highlights search terms within text without altering original capitalization
 */
export default function HighlightText({ text, highlight, className }: HighlightTextProps) {
  if (!text) return null;
  if (!highlight || !highlight.trim()) {
    return <span className={className}>{text}</span>;
  }

  // Split search into individual words (length >= 2) to highlight multi-word queries
  const words = highlight
    .trim()
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2);

  if (words.length === 0) {
    return <span className={className}>{text}</span>;
  }

  const pattern = new RegExp(`(${words.map(escapeRegExp).join('|')})`, 'gi');
  const parts = text.split(pattern);

  return (
    <span className={className}>
      {parts.map((part, index) => {
        const isMatch = words.some((w) => w.toLowerCase() === part.toLowerCase());
        return isMatch ? (
          <mark
            key={index}
            className="bg-[#EFF7FF] text-[#0D81FC] rounded-xs px-0.5 font-medium border-b border-[#B2D7FE]"
          >
            {part}
          </mark>
        ) : (
          part
        );
      })}
    </span>
  );
}
