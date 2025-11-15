// SurveyLauncher Project Management Types
// TypeScript interfaces for Project API integration

export interface Project {
  id: string;
  title: string;
  abbreviation: string;
  description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  geographicScope: 'NATIONAL' | 'REGIONAL';
  regionId?: string;
  organizationId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface CreateProjectRequest {
  title: string;
  abbreviation: string;
  description?: string;
  geographicScope: 'NATIONAL' | 'REGIONAL';
  teamIds?: string[];
}

export interface UpdateProjectRequest {
  title?: string;
  abbreviation?: string;
  description?: string;
  status?: 'ACTIVE' | 'INACTIVE';
  geographicScope?: 'NATIONAL' | 'REGIONAL';
  regionId?: string;
  teamIds?: string[];
}

export interface UserAssignment {
  id: string;
  projectId: string;
  userId: string;
  assignedBy: string;
  roleInProject?: string;
  assignedAt: string;
  isActive: boolean;
  assignedUntil?: string;
}

export interface TeamAssignment {
  id: string;
  projectId: string;
  teamId: string;
  assignedBy: string;
  assignedRole?: string;
  assignedAt: string;
  isActive: boolean;
  assignedUntil?: string;
}

export interface AssignUserToProjectRequest {
  userId: string;
  scope: 'READ' | 'EXECUTE' | 'UPDATE';
  roleInProject?: string;
  assignedUntil?: string;
}

export interface AssignTeamToProjectRequest {
  teamId: string;
  scope: 'READ' | 'PARTICIPATE' | 'MANAGE';
  assignedRole?: string;
  assignedUntil?: string;
}

export interface ProjectsResponse {
  ok: boolean;
  projects: Project[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ProjectResponse {
  ok: boolean;
  project?: Project;
  message?: string;
}

export interface UserAssignmentsResponse {
  ok: boolean;
  assignments?: UserAssignment[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TeamAssignmentsResponse {
  ok: boolean;
  assignments?: TeamAssignment[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UserProjectsResponse {
  ok: boolean;
  projects?: Project[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TeamProjectsResponse {
  ok: boolean;
  projects?: Project[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface Role {
  id: string;
  name: string;
  displayName: string;
  description?: string;
  isSystemRole: boolean;
  isActive: boolean;
  hierarchyLevel: number;
  createdAt: string;
  updatedAt: string;
}

export interface RolesResponse {
  ok: boolean;
  roles?: Role[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Filter and query types
export interface ProjectsFilterOptions {
  search?: string;
  status?: 'all' | 'ACTIVE' | 'INACTIVE';
  geographicScope?: 'all' | 'NATIONAL' | 'REGIONAL';
  teamId?: string;
  createdBy?: string;
  page?: number;
  limit?: number;
  sortBy?: 'title' | 'createdAt' | 'updatedAt' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface AssignmentFilterOptions {
  scope?: 'all' | 'READ' | 'EXECUTE' | 'UPDATE' | 'PARTICIPATE' | 'MANAGE';
  isActive?: boolean;
  assignedUntil?: string;
  page?: number;
  limit?: number;
  sortBy?: 'assignedAt' | 'roleInProject' | 'assignedUntil';
  sortOrder?: 'asc' | 'desc';
}

// Validation types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ApiError {
  ok: false;
  error: {
    code: string;
    message: string;
    request_id: string;
    field?: string;
  };
}

// Project status enum
export const PROJECT_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE'
} as const;

// Geographic scope enum
export const GEOGRAPHIC_SCOPE = {
  NATIONAL: 'NATIONAL',
  REGIONAL: 'REGIONAL'
} as const;

// Assignment scope enum
export const ASSIGNMENT_SCOPE = {
  READ: 'READ',
  EXECUTE: 'EXECUTE',
  UPDATE: 'UPDATE',
  PARTICIPATE: 'PARTICIPATE',
  MANAGE: 'MANAGE'
} as const;

export type ProjectStatus = typeof PROJECT_STATUS[keyof typeof PROJECT_STATUS];
export type GeographicScope = typeof GEOGRAPHIC_SCOPE[keyof typeof GEOGRAPHIC_SCOPE];
export type AssignmentScope = typeof ASSIGNMENT_SCOPE[keyof typeof ASSIGNMENT_SCOPE];