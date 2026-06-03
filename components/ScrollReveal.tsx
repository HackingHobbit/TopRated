"use client";

import { motion } from 'framer-motion';

export default function ScrollReveal({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0.2, scale: 0.95 }}
      whileInView={{ opacity: 1, scale: 1 }}
      // once: true so the reveal runs once per page load instead of replaying
      // every time the section scrolls back into view (which was visibly janky
      // on mobile because of the glass-panel backdrop-filter underneath).
      viewport={{ once: true, margin: "-15% 0px -15% 0px" }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
