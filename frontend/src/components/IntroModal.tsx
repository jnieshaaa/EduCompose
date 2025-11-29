import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const IntroModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  const [shineMount, setShineMount] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setShineMount(false);
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className='fixed inset-0 flex items-center justify-center bg-neutral-900/60 z-[9999]'
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className='group bg-white rounded-rl shadow-lg p-8 border border-neutral-300/30 text-center w-[400px]'
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            onAnimationComplete={() => {
              const timer = setTimeout(() => setShineMount(true));
              return () => clearTimeout(timer);
            }}
          >
            <motion.h2
              className='relative text-xl font-bold
                 bg-gradient-to-b from-primary-100 to-primary-500 
                 bg-clip-text text-transparent overflow-hidden mb-1'
              initial={{ y: -15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              Try our NLP Program for Free!
              <span
                className={`absolute top-0 left-0 w-1/3 h-full bg-shine-gradient
                transform -translate-x-full z-20 
                ${shineMount ? "animate-shine" : ""} group-hover:animate-shine`}
                onAnimationEnd={() => setShineMount(false)}
              ></span>
            </motion.h2>

            <motion.p
              className='text-neutral-900 mb-6'
              initial={{ y: -20, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
            >
              You can use this application anytime you want. <br />
              Feel free to explore, Enjoy!
            </motion.p>

            <button
              onClick={onClose}
              className='bg-primary text-white font-semibold py-2 px-6 rounded-rd mt-4 hover:bg-primary-300 transition'
            >
              Let's Start
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IntroModal;
