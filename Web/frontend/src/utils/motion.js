/**
 * Framer Motion variants & easing curves directly from EduTechLab
 */

export const ease = {
  out: [0.22, 1, 0.36, 1],      // default enter curve (easeOutQuint)
  inOut: [0.65, 0, 0.35, 1],    // morphs, gauge, and theme changes
  in: [0.55, 0, 1, 0.45]        // exits
};

export const spring = {
  soft: { type: 'spring', stiffness: 260, damping: 30 },
  snappy: { type: 'spring', stiffness: 420, damping: 34 },
  drawer: { type: 'spring', stiffness: 320, damping: 36 },
  layout: { type: 'spring', stiffness: 380, damping: 36, mass: 0.9 }
};

export const page = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.05 }
  },
  exit: {
    transition: { staggerChildren: 0.025, staggerDirection: 1 }
  }
};

export const rise = {
  hidden: { opacity: 0, y: 18, filter: 'blur(6px)' },
  visible: {
    opacity: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.6, ease: ease.out }
  },
  exit: {
    opacity: 0,
    y: -6,
    filter: 'blur(6px)',
    transition: { duration: 0.22, ease: ease.in }
  }
};

export const list = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
  exit: {}
};

export const listItem = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: ease.out } },
  exit: { opacity: 0, transition: { duration: 0.15 } }
};

export const backdrop = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.25 } },
  exit: { opacity: 0, transition: { duration: 0.2, delay: 0.05 } }
};

export const modal = {
  hidden: { opacity: 0, scale: 0.94, y: 12, filter: 'blur(4px)' },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    filter: 'blur(0px)',
    transition: spring.snappy
  },
  exit: {
    opacity: 0,
    scale: 0.96,
    y: 8,
    filter: 'blur(4px)',
    transition: { duration: 0.2, ease: ease.in }
  }
};
