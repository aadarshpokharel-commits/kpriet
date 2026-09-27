import { useState } from 'react';
import { env } from '@/config/env';

/**
 * Uses the existing PiyushDhara / Eduverse logo file.
 * Copy it from the public site into frontend/public/brand/logo.png
 * (no new logo is created here). Falls back to the wordmark if missing.
 */
export function BrandLogo({ className }: { className?: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <span className="text-lg font-semibold tracking-tight text-brand">Eduverse</span>;
  }
  return (
    <img
      src={`${env.basePath}brand/logo.png`}
      alt="PiyushDhara Eduverse"
      className={className ?? 'h-8 w-auto'}
      onError={() => setFailed(true)}
    />
  );
}
