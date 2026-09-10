import type { ReactNode } from 'react';

export function InfoTooltip({ children }: { children: ReactNode }) {
  return (
    <span className="info-tip" tabIndex={0}>
      <span className="info-tip__icon" aria-hidden="true">
        i
      </span>
      <span className="info-tip__bubble">{children}</span>
    </span>
  );
}
