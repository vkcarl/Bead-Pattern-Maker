'use client';

import { AuthorInfo } from '@/components/AuthorInfo';

export function Footer() {
  return (
    <footer className="hidden md:flex items-center justify-center px-4 py-2 bg-white border-t flex-shrink-0">
      <AuthorInfo />
    </footer>
  );
}
