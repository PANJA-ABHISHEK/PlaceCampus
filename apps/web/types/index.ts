// ============================================
// PlaceCampus — Frontend Type Definitions
// ============================================
// This directory contains type definitions for the frontend.
// Re-export shared types and define frontend-specific types here.
// ============================================

// Re-export shared types for convenience
// import { ApiResponse, PaginatedResponse, UserRole } from '@placecampus/shared-types';

/** Navigation item type */
export interface NavItem {
  title: string;
  href: string;
  icon?: string;
  disabled?: boolean;
  external?: boolean;
  roles?: string[];
}

/** Theme type */
export type Theme = "light" | "dark" | "system";
