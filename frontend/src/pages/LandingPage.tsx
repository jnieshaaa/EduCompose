import React, {
  useState,
  useRef,
  useEffect,
} from "react";
import { ArrowRight, BookOpen, Users, Zap } from "lucide-react";
import {
  motion,
  AnimatePresence,
  useInView,
  useAnimation,
} from "framer-motion";
import { useLocation } from "react-router-dom";
import Chart from "chart.js/auto";
import HeaderPublic from "../components/HeaderPublic";
import AuthModal from "../components/LoginModal";

// Import the extracted Knowledge Graph Simulation component
import { KnowledgeGraphSimulation } from "../components/landing/KnowledgeGraphSimulation";

const LandingPage: React.FC = () => {
  const location = useLocation();
  const [showLogin, setShowLogin] = useState(false);

  // Show login modal if redirected from a protected route
  useEffect(() => {
    if (location.state?.from) {
      setShowLogin(true);
    }
  }, [location.state]);

  // --- Tech Steps State ---
  const [activeTechStep, setActiveTechStep] = useState<
    "nlp" | "kg" | "llm" | null
  >(null);

  // --- Ref Management ---
  const teacherWorkloadChartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart<"doughnut"> | null>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chartScaleRef = useRef<HTMLDivElement>(null);
  const chartScaleControls = useAnimation();
  const isChartScaleInView = useInView(chartScaleRef, { amount: 0.3 });

  // Hero section animation
  const heroRef = useRef<HTMLDivElement>(null);
  const heroControls = useAnimation();
  const isHeroInView = useInView(heroRef, { once: false, amount: 0.3 });

  // Tech steps animation refs and controls
  const techStepsRef = useRef<HTMLDivElement>(null);
  const isTechStepsInView = useInView(techStepsRef, {
    once: false,
    amount: 0.3,
  });
  const techStep1Controls = useAnimation();
  const techStep2Controls = useAnimation();
  const techStep3Controls = useAnimation();
  const techStep4Controls = useAnimation();

  // Gap section animation refs and controls
  const gapSectionRef = useRef<HTMLDivElement>(null);
  const isGapSectionInView = useInView(gapSectionRef, { amount: 0.3 });
  const gapTitleControls = useAnimation();
  const gapItem1Controls = useAnimation();
  const gapItem2Controls = useAnimation();
  const gapItem3Controls = useAnimation();

  // Chart scale animation - scales in when entering view, resets when out of view
  useEffect(() => {
    if (isChartScaleInView) {
      chartScaleControls.start({
        scale: 1,
        opacity: 1,
        transition: { duration: 0.25, ease: "easeOut" },
      });
    } else {
      chartScaleControls.set({ scale: 0.7, opacity: 0 });
    }
  }, [isChartScaleInView, chartScaleControls]);

  // Hero section animation
  useEffect(() => {
    if (isHeroInView) {
      heroControls.start({
        opacity: 1,
        y: 0,
        transition: { duration: 0.8, ease: "easeOut" },
      });
    } else {
      heroControls.start({
        opacity: 0,
        y: 20,
        transition: { duration: 0.5, ease: "easeOut" },
      });
    }
  }, [isHeroInView, heroControls]);

  // Tech steps animation - scales down when in view, resets instantly when out
  useEffect(() => {
    if (isTechStepsInView) {
      techStep1Controls.start({
        scale: 1,
        opacity: 1,
        transition: { duration: 0.3, delay: 0, ease: "easeOut" },
      });
      techStep2Controls.start({
        scale: 1,
        opacity: 1,
        transition: { duration: 0.3, delay: 0.15, ease: "easeOut" },
      });
      techStep3Controls.start({
        scale: 1,
        opacity: 1,
        transition: { duration: 0.3, delay: 0.3, ease: "easeOut" },
      });
      techStep4Controls.start({
        scale: 1,
        opacity: 1,
        transition: { duration: 0.3, delay: 0.45, ease: "easeOut" },
      });
    } else {
      techStep1Controls.set({ scale: 1.15, opacity: 0 });
      techStep2Controls.set({ scale: 1.15, opacity: 0 });
      techStep3Controls.set({ scale: 1.15, opacity: 0 });
      techStep4Controls.set({ scale: 1.15, opacity: 0 });
    }
  }, [
    isTechStepsInView,
    techStep1Controls,
    techStep2Controls,
    techStep3Controls,
    techStep4Controls,
  ]);

  // Gap section staggered animation - only animates forward, resets when out of view
  useEffect(() => {
    if (isGapSectionInView) {
      gapTitleControls.start({
        opacity: 1,
        x: 0,
        transition: { duration: 0.4, ease: "easeOut" },
      });
      gapItem1Controls.start({
        opacity: 1,
        x: 0,
        transition: { duration: 0.4, delay: 0.1, ease: "easeOut" },
      });
      gapItem2Controls.start({
        opacity: 1,
        x: 0,
        transition: { duration: 0.4, delay: 0.25, ease: "easeOut" },
      });
      gapItem3Controls.start({
        opacity: 1,
        x: 0,
        transition: { duration: 0.4, delay: 0.4, ease: "easeOut" },
      });
    } else {
      gapTitleControls.set({ opacity: 0, x: -50 });
      gapItem1Controls.set({ opacity: 0, x: -30 });
      gapItem2Controls.set({ opacity: 0, x: -30 });
      gapItem3Controls.set({ opacity: 0, x: -30 });
    }
  }, [
    isGapSectionInView,
    gapTitleControls,
    gapItem1Controls,
    gapItem2Controls,
    gapItem3Controls,
  ]);

  const handleGetStarted = () => {
    setShowLogin(true);
  };

  // Tech Details Interaction
  const handleTechStepClick = (step: "nlp" | "kg" | "llm") => {
    setActiveTechStep(step);
  };

  // --- useEffect Hooks ---

  // Track current section and scroll position
  useEffect(() => {
    const heroElement = document.getElementById("hero");
    const challengeElement = document.getElementById("challenge");

    if (!heroElement || !challengeElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const currentSection =
              entry.target.id === "hero" ? "hero" : "about";
            sessionStorage.setItem("currentSection", currentSection);
          }
        });
      },
      {
        threshold: 0.5,
        rootMargin: "0px",
      }
    );

    observer.observe(heroElement);
    observer.observe(challengeElement);

    // Save scroll position when in about section (throttled)
    const handleScroll = () => {
      if (scrollTimeoutRef.current) return;

      scrollTimeoutRef.current = setTimeout(() => {
        const savedSection = sessionStorage.getItem("currentSection");
        if (savedSection === "about") {
          sessionStorage.setItem("scrollPosition", window.scrollY.toString());
        }
        scrollTimeoutRef.current = null;
      }, 100);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    };
  }, []);

  // Handle scroll restoration on page load/refresh
  useEffect(() => {
    // Prevent browser from automatically restoring scroll position
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }

    // Check if we were in the about section before refresh
    const previousSection = sessionStorage.getItem("currentSection");
    const savedScrollPosition = sessionStorage.getItem("scrollPosition");

    if (previousSection === "about" && savedScrollPosition) {
      // Restore scroll position for about section
      setTimeout(() => {
        window.scrollTo(0, parseInt(savedScrollPosition, 10));
      }, 0);
    } else {
      // Scroll to top for hero section or first visit
      window.scrollTo(0, 0);
      sessionStorage.removeItem("currentSection");
      sessionStorage.removeItem("scrollPosition");
    }
  }, []);

  // Chart.js Initialization for Teacher Workload
  useEffect(() => {
    const ctx = teacherWorkloadChartRef.current?.getContext("2d");
    if (!ctx) return;

    // Destroy existing chart if it exists
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    if (isChartScaleInView) {
      chartInstanceRef.current = new Chart(ctx, {
        type: "doughnut",
        data: {
          labels: [
            "Grading & Feedback",
            "Lesson Planning",
            "Instruction",
            "Administrative Tasks",
          ],
          datasets: [
            {
              label: "Time Allocation",
              data: [45, 25, 20, 10],
              backgroundColor: ["#0891b2", "#0e7490", "#67e8f9", "#a5f3fc"],
              borderColor: "#F8F9FA",
              borderWidth: 4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: {
            animateRotate: true,
            animateScale: true,
            duration: 1200,
            delay: 250,
            easing: "easeOutQuart",
          },
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                color: "#343A40",
                font: { family: "'Inter', sans-serif" },
              },
            },
            tooltip: {
              callbacks: {
                label: (context) => {
                  let label = context.label || "";
                  if (label) {
                    label += ": ";
                  }
                  if (context.parsed !== null) {
                    label += context.parsed + "%";
                  }
                  return label;
                },
              },
            },
          },
          cutout: "60%",
        },
      });
    }

    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [isChartScaleInView]);

  // Scroll Observer for Navigation
  useEffect(() => {
    const sections = document.querySelectorAll("main section");
    const navLinks = document.querySelectorAll(".nav-link");
    const observerOptions = { root: null, rootMargin: "0px", threshold: 0.4 };

    const sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const id = entry.target.getAttribute("id");
          navLinks.forEach((link) => {
            link.classList.toggle(
              "active",
              link.getAttribute("href") === `#${id}`
            );
          });
        }
      });
    }, observerOptions);

    sections.forEach((section) => {
      sectionObserver.observe(section);
    });

    return () => {
      sections.forEach((section) => sectionObserver.unobserve(section));
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
      <HeaderPublic onLoginClick={() => setShowLogin(true)} />
      {showLogin && <AuthModal onClose={() => setShowLogin(false)} />}

      {/* Hero Section */}
      <div id="hero" className="min-h-screen flex items-center justify-center py-20">
        <motion.div
          ref={heroRef}
          initial={{ opacity: 0, y: 20 }}
          animate={heroControls}
          className="container mx-auto px-4 lg:px-6 xl:px-8"
        >
          <div className="max-w-5xl mx-auto text-center">
            {/* Main Heading */}
            <motion.h1
              className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              A writing-analytics workspace
              <br />
              <span className="text-cyan-600">built for schools &amp; teachers</span>
            </motion.h1>

            {/* Subheading */}
            <motion.p
              className="text-xl md:text-2xl text-gray-700 mb-8 max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              EduCompose is a secure, account-based platform: teachers assign
              activities, students submit work, and AI-assisted analysis supports
              your rubrics and review workflow—always under your direction, not
              as a public “drop-in” essay checker.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              <button
                onClick={handleGetStarted}
                className="bg-primary text-white font-semibold px-8 py-4 rounded-full transition-all duration-300 flex items-center gap-2 text-lg hover:bg-primary-100 hover:shadow-xl hover:scale-105 transform"
              >
                Sign in to your workspace
                <ArrowRight className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  const challengeSection = document.getElementById("challenge");
                  challengeSection?.scrollIntoView({ behavior: "smooth" });
                }}
                className="bg-white text-gray-700 font-semibold px-8 py-4 rounded-full transition-all duration-300 border-2 border-gray-300 hover:border-primary hover:text-primary hover:shadow-lg"
              >
                How the platform works
              </button>
            </motion.div>

            {/* Feature Highlights */}
            <motion.div
              className="grid md:grid-cols-3 gap-6 mt-16"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="bg-cyan-100 w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <Zap className="w-6 h-6 text-cyan-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Structured workflow</h3>
                <p className="text-gray-600">
                  Courses, sections, activities, and rubrics live in one place so
                  submissions and feedback stay tied to real classes—not anonymous
                  uploads.
                </p>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <BookOpen className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  Rich writing signals
                </h3>
                <p className="text-gray-600">
                  Beyond grammar: coherence, argument structure, and other
                  dimensions you configure—presented to support your review, not
                  to bypass it.
                </p>
              </div>

              <div className="bg-white/80 backdrop-blur-sm rounded-xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="bg-indigo-100 w-12 h-12 rounded-full flex items-center justify-center mb-4 mx-auto">
                  <Users className="w-6 h-6 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  Roles that match school life
                </h3>
                <p className="text-gray-600">
                  Separate experiences for teachers and students: assign work,
                  track submissions, and open the teacher dashboard only after
                  sign-in.
                </p>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* About Page Sections */}
      <main>
        {/* Challenge Section */}
        <section id="challenge" className="py-16 md:py-24 bg-gray-50">
          <motion.div
            className="container mx-auto px-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 1, ease: "easeInOut" }}
          >
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: false, amount: 0.5 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            >
              <h2 className="text-3xl md:text-4xl font-bold">
                The Challenge: An Unsustainable Workload
              </h2>
              <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
                Essay evaluation is crucial for learning but places an immense
                burden on teachers, making personalized and consistent feedback
                a significant challenge.
              </p>
            </motion.div>
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div ref={gapSectionRef}>
                <motion.h3
                  className="text-2xl font-semibold mb-4"
                  initial={{ opacity: 0, x: -50 }}
                  animate={gapTitleControls}
                >
                  The Gap in Current Tools
                </motion.h3>
                <ul className="space-y-4 text-gray-700">
                  <motion.li
                    className="flex items-start"
                    initial={{ opacity: 0, x: -30 }}
                    animate={gapItem1Controls}
                  >
                    <span className="text-cyan-500 font-bold mr-3 mt-1">✓</span>
                    <div>
                      <strong className="text-gray-800">
                        Student-Facing Focus:
                      </strong>{" "}
                      Tools like Grammarly are designed for students, risking AI
                      over-reliance and bypassing the teacher's instructional
                      role.
                    </div>
                  </motion.li>
                  <motion.li
                    className="flex items-start"
                    initial={{ opacity: 0, x: -30 }}
                    animate={gapItem2Controls}
                  >
                    <span className="text-cyan-500 font-bold mr-3 mt-1">✓</span>
                    <div>
                      <strong className="text-gray-800">
                        Surface-Level Feedback:
                      </strong>{" "}
                      Most tools excel at grammar and spelling but fail to
                      analyze higher-order skills like argument strength,
                      coherence, and clarity.
                    </div>
                  </motion.li>
                  <motion.li
                    className="flex items-start"
                    initial={{ opacity: 0, x: -30 }}
                    animate={gapItem3Controls}
                  >
                    <span className="text-cyan-500 font-bold mr-3 mt-1">✓</span>
                    <div>
                      <strong className="text-gray-800">
                        Lack of Instructional Insight:
                      </strong>{" "}
                      Existing software doesn't provide teachers with analytics
                      on class-wide weaknesses, which is vital for targeted
                      instruction.
                    </div>
                  </motion.li>
                </ul>
              </div>
              <motion.div
                ref={chartScaleRef}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={chartScaleControls}
              >
                <div
                  id="chart-container"
                  className="bg-white p-6 rounded-lg shadow-lg"
                >
                  <h3 className="text-xl font-semibold text-center mb-4">
                    Typical Teacher Time Allocation per Essay Batch
                  </h3>
                  <div className="relative w-full max-w-[400px] h-[300px] md:h-[350px] mx-auto">
                    <canvas
                      id="teacherWorkloadChart"
                      ref={teacherWorkloadChartRef}
                    ></canvas>
                  </div>
                  <p className="text-center text-sm text-gray-500 mt-4">
                    Automating the initial analysis allows teachers to shift
                    their focus from repetitive error-checking to high-impact
                    mentoring.
                  </p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Solution Section */}
        <section id="solution" className="bg-white py-16 md:py-24">
          <motion.div
            className="container mx-auto px-6 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: false, amount: 0.5 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            >
              <h2 className="text-3xl md:text-4xl font-bold">
                Our Solution: A Teacher-Centered Approach
              </h2>
              <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
                EduCompose is not another grammar checker. It's an analytical
                partner for educators, designed to enhance their expertise and
                streamline their workflow.
              </p>
            </motion.div>
            <div className="mt-12 grid md:grid-cols-3 gap-8">
              <motion.div
                className="bg-gray-50 p-8 rounded-lg border border-gray-200"
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <div className="text-3xl text-cyan-600 mb-4">🎯</div>
                <h3 className="text-xl font-semibold mb-2">
                  Augment, Not Automate
                </h3>
                <p className="text-gray-600">
                  The system generates analytical reports on student writing,
                  highlighting potential areas for improvement. The final
                  feedback and guidance always come from the teacher.
                </p>
              </motion.div>
              <motion.div
                className="bg-cyan-50 p-8 rounded-lg border border-cyan-200 ring-2 ring-cyan-500"
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 0.3, delay: 0.15, ease: "easeOut" }}
              >
                <div className="text-3xl text-cyan-600 mb-4">🚀</div>
                <h3 className="text-xl font-semibold mb-2">
                  Enhance Efficiency
                </h3>
                <p className="text-gray-600">
                  By automating the first-pass analysis of grammar, readability,
                  and logical flow, EduCompose saves teachers hours of grading
                  time, freeing them to focus on mentoring.
                </p>
              </motion.div>
              <motion.div
                className="bg-gray-50 p-8 rounded-lg border border-gray-200"
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 0.3, delay: 0.3, ease: "easeOut" }}
              >
                <div className="text-3xl text-cyan-600 mb-4">🎓</div>
                <h3 className="text-xl font-semibold mb-2">
                  Preserve Educational Value
                </h3>
                <p className="text-gray-600">
                  We ensure students receive authentic, human feedback. The tool
                  supports the teacher-student relationship rather than
                  inserting AI between them.
                </p>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* How It Works Section */}
        <section id="tech" className="py-16 md:py-24">
          <motion.div
            className="container mx-auto px-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: false, amount: 0.5 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            >
              <h2 className="text-3xl md:text-4xl font-bold">
                How It Works: The Technology Stack
              </h2>
              <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
                EduCompose integrates multiple AI technologies to perform a
                multi-layered analysis of student essays. Click on each step
                below to learn more about the tools and processes involved.
              </p>
            </motion.div>

            <div
              ref={techStepsRef}
              className="flex flex-col md:flex-row items-center justify-center space-y-4 md:space-y-0 md:space-x-4 mb-8"
            >
              <motion.div
                id="step-nlp"
                className={`process-step text-center p-4 border-2 rounded-lg bg-white w-full md:w-1/4 transition-all duration-300 ${
                  activeTechStep === "nlp"
                    ? "active bg-support-superlight/35 border-primary-100 transform scale-105"
                    : "border-gray-300 cursor-pointer"
                }`}
                onClick={() => handleTechStepClick("nlp")}
                initial={{ scale: 1.15, opacity: 0 }}
                animate={techStep1Controls}
              >
                <h4 className="font-semibold">1. NLP Analysis</h4>
                <p className="text-sm text-gray-500">Grammar & Readability</p>
              </motion.div>
              <div className="text-2xl text-gray-400 font-light hidden md:block">
                →
              </div>
              <motion.div
                id="step-kg"
                className={`process-step text-center p-4 border-2 rounded-lg bg-white w-full md:w-1/4 transition-all duration-300 ${
                  activeTechStep === "kg"
                    ? "active bg-support-superlight/35 border-primary-100 transform scale-105"
                    : "border-gray-300 cursor-pointer"
                }`}
                onClick={() => handleTechStepClick("kg")}
                initial={{ scale: 1.15, opacity: 0 }}
                animate={techStep2Controls}
              >
                <h4 className="font-semibold">2. Knowledge Graph</h4>
                <p className="text-sm text-gray-500">Coherence & Argument</p>
              </motion.div>
              <div className="text-2xl text-gray-400 font-light hidden md:block">
                →
              </div>
              <motion.div
                id="step-llm"
                className={`process-step text-center p-4 border-2 rounded-lg bg-white w-full md:w-1/4 transition-all duration-300 ${
                  activeTechStep === "llm"
                    ? "active bg-support-superlight/35 border-primary-100 transform scale-105"
                    : "border-gray-300 cursor-pointer"
                }`}
                onClick={() => handleTechStepClick("llm")}
                initial={{ scale: 1.15, opacity: 0 }}
                animate={techStep3Controls}
              >
                <h4 className="font-semibold">3. Insight Generation</h4>
                <p className="text-sm text-gray-500">Synthesis with LLMs</p>
              </motion.div>
              <div className="text-2xl text-gray-400 font-light hidden md:block">
                →
              </div>
              <motion.div
                className="text-center p-4 border-2 border-dashed border-gray-300 rounded-lg bg-gray-100 w-full md:w-1/4"
                initial={{ scale: 1.15, opacity: 0 }}
                animate={techStep4Controls}
              >
                <h4 className="font-semibold">4. Teacher Report</h4>
                <p className="text-sm text-gray-500">Actionable Insights</p>
              </motion.div>
            </div>

            <motion.div
              id="tech-details"
              className="mt-8 bg-white p-8 rounded-lg shadow-inner max-w-4xl mx-auto border border-gray-200"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: false, amount: 0.2 }}
              transition={{ duration: 0.5, delay: 0.8, ease: "easeOut" }}
            >
              <AnimatePresence mode="wait">
                {activeTechStep === "nlp" && (
                  <motion.div
                    key="nlp"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h3 className="text-2xl font-semibold mb-3">
                      Natural Language Processing (NLP) Modules
                    </h3>
                    <p className="mb-4">
                      This is the foundational layer. We use established NLP
                      libraries to perform a "surface-level" check, identifying
                      objective issues in writing mechanics.
                    </p>
                    <ul className="list-disc list-inside space-y-2">
                      <li>
                        <strong>Grammar & Syntax Analysis:</strong> Using
                        libraries like spaCy, the system identifies grammatical
                        errors and awkward phrasing.
                      </li>
                      <li>
                        <strong>Readability Scores:</strong> We calculate
                        metrics like Flesch-Kincaid to assess writing
                        complexity.
                      </li>
                      <li>
                        <strong>Topic Modeling:</strong> Techniques like LDA
                        help identify the main topics, checking for prompt
                        relevance.
                      </li>
                    </ul>
                  </motion.div>
                )}
                {activeTechStep === "kg" && (
                  <motion.div
                    key="kg"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h3 className="text-2xl font-semibold mb-3">
                      Knowledge Graph (KG) Integration
                    </h3>
                    <p className="mb-4">
                      This is our key innovation. KGs help us analyze the
                      *meaning* and *connections* between concepts, which is
                      vital for evaluating argument strength.
                    </p>
                    <ul className="list-disc list-inside space-y-2">
                      <li>
                        <strong>Conceptual Coherence:</strong> We map essay
                        terms to a KG (like ConceptNet) to measure logical
                        distance between ideas. Large jumps may indicate a lack
                        of coherence.
                      </li>
                      <li>
                        <strong>Argument Connection Analysis:</strong> The
                        system traces relationships between claims and evidence.
                        Weak or missing connections signify a poorly supported
                        argument.
                      </li>
                    </ul>
                  </motion.div>
                )}
                {activeTechStep === "llm" && (
                  <motion.div
                    key="llm"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <h3 className="text-2xl font-semibold mb-3">
                      Insight Generation with Large Language Models (LLMs)
                    </h3>
                    <p className="mb-4">
                      An LLM synthesizes the structured data from the NLP and KG
                      modules into a human-readable summary for the teacher.
                    </p>
                    <ul className="list-disc list-inside space-y-2">
                      <li>
                        <strong>Synthesizing Findings:</strong> The LLM
                        translates raw data (e.g., "5 passive voice instances")
                        into descriptive summaries ("The student frequently uses
                        passive voice...").
                      </li>
                      <li>
                        <strong>Highlighting Patterns:</strong> It can identify
                        recurring issues across a batch of essays, providing
                        class-wide insights.
                      </li>
                      <li>
                        <strong>Controlled Generation:</strong> The LLM only
                        summarizes pre-analyzed data, ensuring the output is
                        grounded and reliable.
                      </li>
                    </ul>
                  </motion.div>
                )}
                {activeTechStep === null && (
                  <motion.div
                    key="placeholder"
                    id="desc-placeholder"
                    className="text-center text-gray-500"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                  >
                    <p>
                      Select a process step above to see the technical details.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        </section>

        {/* Simulation Section - Now using extracted component */}
        <KnowledgeGraphSimulation />

        {/* Research Plan Section */}
        <section id="research" className="py-16 md:py-24">
          <motion.div
            className="container mx-auto px-6"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false, amount: 0.2 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: false, amount: 0.5 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            >
              <h2 className="text-3xl md:text-4xl font-bold">
                The Research Plan
              </h2>
              <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
                Our study is structured to develop a robust tool and validate
                its effectiveness in a real-world educational context.
              </p>
            </motion.div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Research Plan Cards */}
              <motion.div
                className="card bg-gray-50 p-6 rounded-lg border transition duration-300 hover:transform hover:translate-y-[-5px] hover:shadow-lg"
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 0.4, delay: 0, ease: "easeOut" }}
              >
                <h4 className="font-bold text-xl mb-2">General Objective</h4>
                <p>
                  To develop and evaluate an NLP-based essay evaluation system
                  that supports teachers in identifying and addressing student
                  writing weaknesses.
                </p>
              </motion.div>
              <motion.div
                className="card bg-gray-50 p-6 rounded-lg border transition duration-300 hover:transform hover:translate-y-[-5px] hover:shadow-lg"
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
              >
                <h4 className="font-bold text-xl mb-2">Specific Objectives</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>Collect & preprocess annotated essays.</li>
                  <li>Implement NLP & KG modules.</li>
                  <li>Generate automated evaluation reports.</li>
                  <li>Validate system outputs with teachers.</li>
                </ul>
              </motion.div>
              <motion.div
                className="card bg-gray-50 p-6 rounded-lg border transition duration-300 hover:transform hover:translate-y-[-5px] hover:shadow-lg"
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
              >
                <h4 className="font-bold text-xl mb-2">Scope</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>For teachers only, not students.</li>
                  <li>Focus on English expository essays.</li>
                  <li>
                    Reports on grammar, clarity, coherence, and argumentation.
                  </li>
                </ul>
              </motion.div>
              <motion.div
                className="card bg-gray-50 p-6 rounded-lg border transition duration-300 hover:transform hover:translate-y-[-5px] hover:shadow-lg"
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 0.4, delay: 0, ease: "easeOut" }}
              >
                <h4 className="font-bold text-xl mb-2">Limitations</h4>
                <ul className="list-disc list-inside space-y-1 text-gray-700">
                  <li>Highlights weaknesses, does not assign grades.</li>
                  <li>KG coverage is finite.</li>
                  <li>Serves as a teacher aid, not a replacement.</li>
                </ul>
              </motion.div>
              <motion.div
                className="card bg-gray-50 p-6 rounded-lg border transition duration-300 hover:transform hover:translate-y-[-5px] hover:shadow-lg"
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
              >
                <h4 className="font-bold text-xl mb-2">Research Locale</h4>
                <p>
                  Partner schools or universities where English teachers
                  regularly evaluate student essays, providing both essay
                  datasets and teacher expertise for validation.
                </p>
              </motion.div>
              <motion.div
                className="card bg-gray-50 p-6 rounded-lg border transition duration-300 hover:transform hover:translate-y-[-5px] hover:shadow-lg"
                initial={{ scale: 0.8, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: false, amount: 0.3 }}
                transition={{ duration: 0.4, delay: 0.2, ease: "easeOut" }}
              >
                <h4 className="font-bold text-xl mb-2">Target Respondents</h4>
                <p>
                  <strong>Primary:</strong> Senior high school and college
                  English teachers. <br />
                  <strong>Secondary:</strong> Students who produce the essay
                  datasets.
                </p>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* Impact Section */}
        <section id="impact" className="bg-white py-16 md:py-24">
          <motion.div
            className="container mx-auto px-6 text-center"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: false, amount: 0.5 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
            >
              <h2 className="text-3xl md:text-4xl font-bold">Overall Impact</h2>
              <p className="mt-4 text-lg text-gray-600 max-w-3xl mx-auto">
                EduCompose aims to make a meaningful contribution to education
                by bridging the gap between advanced AI and practical classroom
                needs.
              </p>
            </motion.div>
            <motion.div
              className="mt-12 max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg border"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: false, amount: 0.5 }}
              transition={{ duration: 0.8, delay: 0.3, ease: "easeInOut" }}
            >
              <p className="text-xl leading-relaxed text-gray-700">
                By empowering teachers with deeper insights into student
                writing, we can foster a more efficient and effective
                educational environment. This research supports a future where
                technology serves as a powerful assistant to educators,
                enhancing their ability to provide the personalized,
                high-quality feedback that is essential for student growth and
                success in writing.
              </p>
            </motion.div>
          </motion.div>
        </section>

        <footer className="bg-neutral-900 text-white py-2">
          <motion.div
            className="container mx-auto px-6 text-center font-semibold"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: false }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            <p className="text-white text-sm sm:text-base">
              &copy; {new Date().getFullYear()} EduCompose · Teacher- and school-focused writing analytics.
            </p>
          </motion.div>
        </footer>
      </main>
    </div>
  );
};

export default LandingPage;
