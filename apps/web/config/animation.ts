// ============================================
// PlaceCampus — Animation Configuration
// ============================================
// Centralized animation settings for GSAP, AOS, and Swiper.
// Import these configs instead of scattering magic values.
// ============================================

/** GSAP default settings — used with gsap.defaults() */
export const gsapDefaults = {
  duration: 0.8,
  ease: "power2.out",
} as const;

/** GSAP ScrollTrigger default config */
export const scrollTriggerDefaults = {
  start: "top 80%",
  end: "bottom 20%",
  toggleActions: "play none none reverse",
} as const;

/** Named GSAP animation presets */
export const gsapPresets = {
  fadeUp: {
    from: { opacity: 0, y: 40 },
    to: { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" },
  },
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1, duration: 0.6, ease: "power2.out" },
  },
  slideInLeft: {
    from: { opacity: 0, x: -60 },
    to: { opacity: 1, x: 0, duration: 0.8, ease: "power2.out" },
  },
  slideInRight: {
    from: { opacity: 0, x: 60 },
    to: { opacity: 1, x: 0, duration: 0.8, ease: "power2.out" },
  },
  scaleIn: {
    from: { opacity: 0, scale: 0.9 },
    to: { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.4)" },
  },
  counterUp: {
    duration: 2,
    ease: "power1.out",
  },
  float: {
    y: "-=10",
    duration: 3,
    ease: "sine.inOut",
    repeat: -1,
    yoyo: true,
  },
} as const;

/** AOS initialization settings */
export const aosConfig = {
  duration: 700,
  easing: "ease-out-cubic",
  once: true,
  offset: 80,
  delay: 0,
  anchorPlacement: "top-bottom" as const,
} as const;

/** AOS animation names used in the project */
export const aosAnimations = {
  fadeUp: "fade-up",
  fadeDown: "fade-down",
  fadeLeft: "fade-left",
  fadeRight: "fade-right",
  fadeIn: "fade-in",
  zoomIn: "zoom-in",
  flipUp: "flip-up",
} as const;

/** Swiper default config */
export const swiperDefaults = {
  slidesPerView: 1,
  spaceBetween: 24,
  loop: true,
  autoplay: {
    delay: 4000,
    disableOnInteraction: false,
  },
  breakpoints: {
    640: { slidesPerView: 2, spaceBetween: 20 },
    1024: { slidesPerView: 3, spaceBetween: 24 },
    1280: { slidesPerView: 4, spaceBetween: 24 },
  },
} as const;
