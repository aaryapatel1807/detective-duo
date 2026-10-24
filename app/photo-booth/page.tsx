'use client';

/**
 * Photo booth, solo: your camera, a 3-2-1 countdown, three shots, and a
 * strip sized for Instagram stories. Everything happens in the browser;
 * nothing is uploaded anywhere. The room version syncs the countdown
 * across both phones.
 */
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import PhotoBooth from '@/components/booth/PhotoBooth';

export default function PhotoBoothPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-16">
      <Link href="/" className="btn !px-3 !py-2 text-sm">
        <ArrowLeft size={16} aria-hidden /> Home
      </Link>
      <h1 className="mt-4 text-3xl font-bold">Photo booth</h1>
      <p className="mt-1 text-[var(--ink-dim)]">
        Three shots, one strip, sized for stories. Your photos never leave this
        device.
      </p>
      <div className="mt-6">
        <PhotoBooth />
      </div>
    </main>
  );
}
