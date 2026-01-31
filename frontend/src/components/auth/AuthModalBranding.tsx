export function AuthModalBranding() {
  return (
    <>
      {/* Desktop Branding - Equal 50% column */}
      <div className="hidden lg:flex flex-1 min-w-0 items-center justify-center p-8 relative bg-gradient-to-tr from-primary-500 via-primary-400 to-primary-300 text-white">
        <div className="relative z-10 max-w-[260px]">
          <h1 className="text-3xl font-bold mb-3 tracking-tight">
            Edu<span className="text-primary-50">Compose</span>
          </h1>
          <p className="text-sm font-medium text-white/95 mb-6 leading-tight">
            Teacher's Companion for Essay Evaluation
          </p>
          <ul className="space-y-2.5 text-sm text-white/90">
            <li className="flex items-start gap-2.5">
              <svg
                className="w-5 h-5 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>AI-powered essay analysis</span>
            </li>
            <li className="flex items-start gap-2.5">
              <svg
                className="w-5 h-5 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Detailed feedback generation</span>
            </li>
            <li className="flex items-start gap-2.5">
              <svg
                className="w-5 h-5 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Save time, improve learning</span>
            </li>
          </ul>
        </div>
        <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-1/3 -translate-y-1/3" />
      </div>
    </>
  );
}
