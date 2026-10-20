import React, { useEffect, useState } from 'react';

export const AnimatedNumber = ({ value = 0, duration = 800, prefix = '', suffix = '' }) => {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    let start = displayValue;
    const end = Number(value) || 0;
    if (start === end) return;

    const startTime = performance.now();

    const update = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = Math.round(start + (end - start) * ease);

      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };

    requestAnimationFrame(update);
  }, [value, duration]);

  return (
    <span className="tnum">
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
};

export default AnimatedNumber;
