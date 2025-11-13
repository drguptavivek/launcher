
# SVELTE 5 MCP Server

You are able to use the Svelte MCP server, where you have access to comprehensive Svelte 5 and SvelteKit documentation. Here's how to use the available tools effectively:

## Available MCP Tools:

### 1. list-sections

Use this FIRST to discover all available documentation sections. Returns a structured list with titles, use_cases, and paths.
When asked about Svelte or SvelteKit topics, ALWAYS use this tool at the start of the chat to find relevant sections.

### 2. get-documentation

Retrieves full documentation content for specific sections. Accepts single or multiple sections.
After calling the list-sections tool, you MUST analyze the returned documentation sections (especially the use_cases field) and then use the get-documentation tool to fetch ALL documentation sections that are relevant for the user's task.

### 3. svelte-autofixer

Analyzes Svelte code and returns issues and suggestions.
You MUST use this tool whenever writing Svelte code before sending it to the user. Keep calling it until no issues or suggestions are returned.

### 4. playground-link

Generates a Svelte Playground link with the provided code.
After completing the code, ask the user if they want a playground link. Only call this tool after user confirmation and NEVER if code was written to files in their project.

---

## 🚀 PROJECT QUICK REFERENCE

### **Project Status: Phase 2 Implementation Complete ✅**

**Current Working Features:**
- ✅ Authentication system with JWT token management
- ✅ Professional navigation with responsive design
- ✅ Login page with demo credentials
- ✅ Dashboard with statistics and activity tracking
- ✅ Test page with interactive tools
- ✅ Complete API integration (8 backend endpoints)

### **📁 Key Files & Routes:**
```
Working Routes:
├── /                    # Landing page with navbar
├── /auth/login          # Professional login interface
├── /dashboard           # Protected admin dashboard
├── /test               # Interactive testing tools

Core Infrastructure:
├── src/lib/components/Navbar.svelte      # Responsive navigation
├── src/lib/stores/auth.svelte.js         # Authentication state
├── src/lib/api/remote/                    # All 8 API endpoints
├── src/lib/utils/auth.utils.ts           # Auth utilities
└── src/routes/+layout.svelte              # Global layout with navbar
```

### **🔐 Authentication System:**
- **Demo Credentials**: `deviceId: dev-mock-001, userCode: u001, pin: 123456`
- **JWT Token Management**: Automatic refresh and secure storage
- **Route Protection**: Dashboard redirects to login if not authenticated
- **API Integration**: All 8 backend endpoints integrated and tested

### **📊 Available shadcn-svelte Components: 156**
**Most Used Components:**
- Button, Card, Input, Alert, Table, Form
- Dialog, Select, Tabs, Progress, Pagination
- Navigation Menu, Calendar, Data Table

---

## ⚠️ KEY SVELTE GOTCHAS (Must Read!)

**Location**: `docs/KeySvelteGotchas.md`

### **🔥 Critical Issues to Avoid:**

#### 1. **Svelte 5 Runes & SSR Import Conflicts**
- ❌ **Error**: `Cannot find module` when importing runes
- ✅ **Fix**: Use `.svelte.js` files for shared reactive logic, move state inside components
- **Example**: ❌ `import { auth } from '$lib/stores/auth'` → ✅ `import { authUtils } from '$lib/utils/auth.utils'`

#### 2. **State Export Limitations in .svelte.js Files**
- ❌ **Error**: Cannot export directly reassigned state from modules
- ✅ **Fix**: Export functions that access state, or objects with reactive properties
- **Example**: ✅ `export const counter = $state({ count: 0 })` or `export function getCount() { return count; }`

#### 3. **Route Structure & URL Mapping**
- ❌ **Error**: `404 Not Found` when accessing `/auth/login`
- ✅ **Fix**: Create proper directory structure
- **Example**: ❌ `src/routes/auth/+page.svelte` → ✅ `src/routes/auth/login/+page.svelte`

#### 4. **Redundant ARIA Roles**
- ❌ **Error**: `Redundant role 'main'` accessibility warning
- ✅ **Fix**: Remove explicit role attributes on semantic HTML5 elements
- **Example**: ❌ `<main role="main">` → ✅ `<main>`

#### 5. **Form Event Handling in Svelte 5**
- ❌ **Error**: Form submissions causing page refreshes
- ✅ **Fix**: Use proper event modifiers
- **Example**: ❌ `on:submit={handleSubmit}` → ✅ `on:submit|preventDefault={handleSubmit}`

#### 6. **Component vs Element Naming**
- ❌ **Error**: Components treated as HTML elements
- ✅ **Fix**: Use PascalCase for components, lowercase for HTML
- **Example**: Components: `<MyComponent>`, HTML: `<div>`, `<span>`

#### 7. **State Reference in Functions**
- ❌ **Error**: Captures initial value instead of reactive reference
- ✅ **Fix**: Pass getter functions or entire reactive objects
- **Example**: ✅ `setContext('count', () => count)` or `setContext('state', $state({ count }))`

#### 8. **Interactive Elements on Non-Interactive Elements**
- ❌ **Error**: Accessibility warnings for div onclick handlers
- ✅ **Fix**: Use semantic elements or add ARIA roles with keyboard handling
- **Example**: ❌ `<div onclick>` → ✅ `<button onclick>` or `<div role="button" onclick>`

---

## 📋 PROJECT IMPLEMENTATION PLAN

**Location**: `TODO/backend-ui-plan.md`

### **Current Status: Phases 1-2 Complete ✅**
- ✅ **Phase 1**: API Integration Layer - All 8 remote functions implemented
- ✅ **Phase 2**: Authentication System - Login, auth guards, session management
- ✅ **Phase 3**: Dashboard Overview - Basic admin interface with statistics

### **Next Phases Ready for Implementation:**
- 🔄 **Phase 4**: User Management - CRUD operations, team assignments
- 🔄 **Phase 5**: Device Management - Device inventory, monitoring, configuration
- 🔄 **Phase 6**: Policy Management - Visual policy editor, templates
- 🔄 **Phase 7**: Telemetry & Analytics - Real-time dashboard, historical data
- 🔄 **Phase 8**: Supervisor Tools - Override management, audit logging

### **API Integration Status:**
```
✅ Authentication (5 endpoints):
   - POST /api/v1/auth/login
   - GET /api/v1/auth/whoami
   - POST /api/v1/auth/logout
   - POST /api/v1/auth/refresh
   - POST /api/v1/auth/session/end

✅ Supervisor Override (1 endpoint):
   - POST /api/v1/supervisor/override/login

✅ Policy Management (1 endpoint):
   - GET /api/v1/policy/:deviceId

✅ Telemetry (1 endpoint):
   - POST /api/v1/telemetry
```

---

## 🛠 DEVELOPMENT WORKFLOW

### **Before Writing Code:**
1. **Check Gotchas**: Review `docs/KeySvelteGotchas.md` for potential issues
2. **Use MCP Tools**: `list-sections` → `get-documentation` for official Svelte guidance
3. **Plan Structure**: Follow file organization in backend-ui-plan.md

### **While Writing Code:**
1. **Use svelte-autofixer**: Run after writing any Svelte component
2. **Check TypeScript**: Ensure proper types for API integration
3. **Test Routes**: Verify routing structure matches expected URLs

### **After Writing Code:**
1. **Route Testing**: Test all routes using Chrome MCP tools
2. **Authentication Flow**: Test login/logout flow
3. **API Integration**: Test all remote function calls

### **File Organization:**
```
src/lib/
├── api/remote/          # Backend API integration (complete)
├── components/          # Reusable UI components
│   ├── Navbar.svelte   # Responsive navigation (✅)
│   └── ui/              # shadcn-svelte components (156)
├── stores/             # Global state management
│   └── auth.svelte.js  # Authentication state (✅)
└── utils/              # Utility functions
    └── auth.utils.ts   # Auth utilities (✅)

src/routes/
├── +layout.svelte      # Global layout with navbar (✅)
├── +page.svelte        # Landing page (✅)
├── auth/login/+page.svelte  # Login page (✅)
├── dashboard/+page.svelte    # Admin dashboard (✅)
└── test/+page.svelte        # Interactive testing (✅)
```

---

## 📚 COMPLETE DOCUMENTATION INDEX

### **Core Documentation:**
1. **`docs/KeySvelteGotchas.md`** - Critical Svelte 5 issues and fixes
2. **`TODO/handoff.md`** - Complete project status and implementation details
3. **`TODO/backend-ui-plan.md`** - Comprehensive implementation roadmap
4. **`docs/routes.md`** - Complete route overview with API integration status

### **API & Integration:**
5. **`docs/api-integration.md`** - All 8 backend endpoints with examples
6. **`docs/authentication-system.md`** - JWT auth flow and security implementation

### **Feature Documentation:**
7. **`docs/user-management.md`** - Complete user management system documentation
8. **`docs/components.md`** - Available components library and usage guide

### **Design & Patterns:**
9. **`docs/Svelte5DesignPatterns.md`** - Modern Svelte 5 patterns and best practices
10. **`docs/Tailwind.md`** - TailwindCSS 4 theming and design system

### **🎯 Svelte 5 Design Patterns Reference:**
**Location**: `docs/Svelte5DesignPatterns.md`

**Key Modern Patterns Used:**
- **Runes Syntax**: `$state()`, `$derived()`, `$effect()`, `$props()`
- **Component Architecture**: Modern class-based components with runes
- **State Management**: Reactive state with deep proxy support
- **Event Handling**: `on:submit|preventDefault` pattern
- **Form Binding**: `bind:value` two-way data binding
- **Context API**: `getContext`/`setContext` for shared state
- **Component Composition**: `{@render}` tags instead of slots
- **Async Patterns**: Proper handling of async operations in components

### **Available Routes Summary:**
- **`/`** - Professional landing page with feature overview
- **`/auth/login`** - Complete authentication interface with demo credentials
- **`/dashboard`** - Protected admin dashboard with statistics
- **`/test`** - Interactive testing tools for API and authentication
- **`/users`** - User management with real API calls ✅ **NEW**
- **`/users/create`** - User creation form with validation ✅ **NEW**
- **`/users/[id]`** - User details and profile information ✅ **NEW**
- **Coming Soon**: `/devices`, `/policies`, `/analytics`

---

**Last Updated**: Based on Phase 4 completion with fully functional user management system and real API integration.





