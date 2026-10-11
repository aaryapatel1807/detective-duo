'use client';

/* SectionTitle — mono eyebrow ('CASE FILE № 2048') + Cinzel
 * uppercase heading. The standard title block atop each game. */

export interface SectionTitleProps {
  /** Main heading text. */
  title: string;
  /** Mono eyebrow line above the heading. */
  eyebrow?: string;
  /** Extra className merged with kit classes. */
  className?: string;
}

export function SectionTitle({ title, eyebrow, className = '' }: SectionTitleProps) {
  return (
    <div className={className ? `gk-section-head ${className}` : 'gk-section-head'}>
      {eyebrow ? <div className="gk-section-eyebrow">{eyebrow}</div> : null}
      <h1 className="gk-section-title">{title}</h1>
    </div>
  );
}
