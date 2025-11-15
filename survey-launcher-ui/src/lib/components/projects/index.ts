// SurveyLauncher Project Management Components
// Export all Project Management UI components

export { default as ProjectTable } from './ProjectTable.svelte';
export { default as ProjectCard } from './ProjectCard.svelte';
export { default as ProjectForm } from './ProjectForm.svelte';
export { default as UserAssignment } from './UserAssignment.svelte';
export { default as ProjectActions } from './ProjectActions.svelte';

// Component types
export type ProjectTableProps = {
	projects: import('$lib/api/remote').Project[];
	loading?: boolean;
	error?: string | null;
};

export type ProjectCardProps = {
	project: import('$lib/api/remote').Project;
	showActions?: boolean;
};

export type ProjectFormProps = {
	project?: import('$lib/api/remote').Project | null;
	loading?: boolean;
	error?: string | null;
};

export type UserAssignmentProps = {
	assignments: import('$lib/api/remote').UserAssignment[];
	loading?: boolean;
	error?: string | null;
	projectId: string;
};

export type ProjectActionsProps = {
	project: import('$lib/api/remote').Project;
	size?: 'normal' | 'small';
};