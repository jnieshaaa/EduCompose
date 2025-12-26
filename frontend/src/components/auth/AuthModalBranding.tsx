export function AuthModalBranding() {
  return (
    <>
      {/* Desktop Branding */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-10 relative bg-gradient-to-tr from-primary-500 via-primary-400 to-primary-300 text-white">
        <div className="relative z-10 max-w-xs">
          <h1 className="text-4xl font-bold mb-4 tracking-tight">
            Edu<span className="text-primary-50">Compose</span>
          </h1>
          <p className="text-lg font-semibold mb-6">
            Teacher's Companion for Essay Evaluation
          </p>
          <ul className="space-y-3">
            <li className="flex items-start space-x-3">
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <p>AI-powered essay analysis</p>
            </li>
            <li className="flex items-start space-x-3">
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <p>Detailed feedback generation</p>
            </li>
            <li className="flex items-start space-x-3">
              <svg
                className="w-5 h-5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <p>Save time, improve learning</p>
            </li>
          </ul>
        </div>
        {/* Subtle decoration inside the left panel */}
        <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 rounded-full -translate-x-1/3 -translate-y-1/3"></div>
      </div>

      {/* Mobile Logo/Branding */}
      <div className="lg:hidden text-center mb-8">
        <h1 className="text-3xl font-bold mb-1 text-neutral-900">
          Edu<span className="text-primary-500">Compose</span>
        </h1>
        <p className="text-neutral-600 text-sm">
          Teacher's Companion for Essay Evaluation
        </p>
      </div>
    </>
  );
}

