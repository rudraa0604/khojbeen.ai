import React, { useEffect } from 'react';

/**
 * Invisible/silent bot protection component (no UI test badge rendered)
 */
export default function Turnstile({ onVerify }) {
  useEffect(() => {
    // Provide clean verified token without rendering visible widget
    if (onVerify) {
      onVerify('1x00000000000000000000AA');
    }
  }, [onVerify]);

  return null;
}
