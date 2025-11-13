# Key Svelte Gotchas - Critical Issues to Avoid

Based on real-world implementation issues encountered during the SurveyLauncher Admin development and validated against official Svelte MCP documentation. These are specific problems that caused actual errors and required fixes.

## 🔥 Critical Gotchas (Causing Real Errors)

### 1. **Svelte 5 Runes & SSR Module Import Conflicts**
- **Error**: `Cannot find module` or `Unexpected token` when importing Svelte 5 runes during SSR
- **Official Svelte Guidance**: Runes are only available inside `.svelte` and `.svelte.js/ts` files. You cannot import modules that use runes in traditional SSR contexts
- **Root Cause**: Svelte 5 runes (`$state`, `$derived`) are transformed by the compiler and cannot be used in regular ES modules
- **Recommended Fix**:
  - Use `.svelte.js` files for shared reactive logic (official approach)
  - Move reactive state inside components rather than importing from modules
  - Use utility functions for non-reactive logic
- **Example**: ❌ `import { auth } from '$lib/stores/auth'` → ✅ `import { authUtils } from '$lib/utils/auth.utils'`

### 2. **State Export Limitations in .svelte.js Files**
- **Error**: `Cannot export reassigned state from a module if it is reassigned`
- **Official Svelte Guidance**: You cannot export state that is directly reassigned from `.svelte.js` files because the compiler cannot wrap references across module boundaries
- **Root Cause**: Every reference to `$state` is transformed by the Svelte compiler, which only operates on one file at a time
- **Recommended Fix**:
  - Export functions that access state: `export function getCount() { return count; }`
  - Export objects with reactive properties: `export const counter = $state({ count: 0 })`
  - Never directly export reassigned primitives: `export let count = $state(0)` ❌

### 3. **Route Structure & URL Mapping**
- **Error**: `404 Not Found` when accessing `/auth/login`
- **Official Svelte Guidance**: SvelteKit uses a filesystem-based router where route directories define URL paths
- **Root Cause**: Incorrect directory structure in `src/routes`
- **Recommended Fix**: Create proper directory structure following SvelteKit conventions
- **Example**: ❌ `src/routes/auth/+page.svelte` (maps to `/auth`) → ✅ `src/routes/auth/login/+page.svelte` (maps to `/auth/login`)

### 4. **Redundant ARIA Roles**
- **Error**: `Redundant role 'main'` accessibility warning
- **Official Svelte Guidance**: Some HTML elements have default ARIA roles. Adding the same role has no effect and creates redundant markup
- **Root Cause**: Explicitly setting roles that are already implied by HTML5 semantic elements
- **Recommended Fix**: Remove explicit role attributes on semantic HTML5 elements
- **Example**: ❌ `<main role="main">` → ✅ `<main>`; ❌ `<button role="button">` → ✅ `<button>`

### 5. **Svelte 5 Runes Placement Rules**
- **Error**: `$state(...) can only be used as a variable declaration initializer, a class field declaration, or the first assignment to a class field`
- **Official Svelte Guidance**: Runes can only be used in specific positions as defined by the language syntax
- **Root Cause**: Using runes outside of their allowed contexts (e.g., in function calls, computed properties)
- **Recommended Fix**:
  - Only use runes at the top level of components or in class field declarations
  - For derived values, use `$derived(() => expression)`
  - For effects, use `$effect(() => { side_effect })`

### 6. **Accessibility - Interactive Elements on Non-Interactive Elements**
- **Error**: `Non-interactive element should not be assigned mouse or keyboard event listeners`
- **Official Svelte Guidance**: Elements like `<div>` with `onclick` must have an ARIA role and proper keyboard handling
- **Root Cause**: Adding event handlers to elements that aren't semantically interactive
- **Recommended Fix**:
  - Use semantic elements: `<button>` instead of `<div onclick>`
  - Or add ARIA role: `<div role="button" onclick>` with keyboard handlers
  - Consider `tabindex` for focus management

### 7. **Form Event Handling in Svelte 5**
- **Error**: Form submissions not working as expected, page refreshes
- **Official Svelte Guidance**: Use proper event modifiers and form action patterns
- **Root Cause**: Missing event modifiers or incorrect event handler syntax
- **Recommended Fix**:
  - Use `on:submit|preventDefault` for form handlers
  - Consider SvelteKit's form actions for better progressive enhancement
  - Use `bind:value` for two-way data binding

### 8. **Component vs Element Tag Naming**
- **Error**: Components not rendering or being treated as HTML elements
- **Official Svelte Guidance**: Components must begin with a capital letter, while HTML elements are lowercase
- **Root Cause**: Component names not following PascalCase convention
- **Recommended Fix**:
  - Components: `<MyComponent>` (PascalCase)
  - HTML elements: `<div>`, `<span>` (lowercase)
  - Dynamic elements: Use `<svelte:element this={tag}>` for runtime element selection

### 9. **State Reference in Functions**
- **Error**: `This reference only captures the initial value of 'name'`
- **Official Svelte Guidance**: When passing reactive state to functions, capture the value lazily
- **Root Cause**: Passing state by value instead of by reference
- **Recommended Fix**:
  - Pass getter functions: `setContext('count', () => count)`
  - Or pass the entire reactive object: `setContext('state', $state({ count }))`
  - Avoid: `setContext('count', count)` ❌

### 10. **Async Derived Values**
- **Error**: `Cannot create a $derived(...) with an await expression outside of an effect tree`
- **Official Svelte Guidance**: Derived values containing `await` must be created inside effects
- **Root Cause**: Using `await` in `$derived` outside of proper reactive context
- **Recommended Fix**:
  - Use `$effect` for async operations with side effects
  - Use `$derived.by(() => someSyncOperation)`
  - For async data, consider using SvelteKit's load functions instead

### 11. **$derived with Function Expressions** ⭐ **NEW**
- **Error**: Derived state showing as function string `() => { ... }` instead of computed value
- **Real-world Issue**: `let userStatus = $derived(() => user.isActive ? 'Active' : 'Inactive')` displays as function text
- **Root Cause**: `$derived` expects an expression, not a function. When passing a function, Svelte treats it as a literal function
- **Recommended Fix**:
  - Use `$derived.by(() => expression)` for function-style derived values
  - Or use `$derived(expression)` for simple expressions
  - **Example**: ✅ `let userStatus = $derived.by(() => user.isActive ? 'Active' : 'Inactive')`

### 12. **Template Component Rendering in Svelte 5** ⭐ **NEW**
- **Error**: `Unexpected token` when using components inside conditional expressions
- **Real-world Issue**: `{showPin ? <EyeOff class="h-4 w-4" /> : <Eye class="h-4 w-4" />}` causes parse error
- **Root Cause**: Svelte 5 template syntax doesn't support JSX-style component rendering in ternary expressions
- **Recommended Fix**:
  - Use Svelte's `{#if}` blocks for conditional component rendering
  - **Example**:
    ```svelte
    {#if showPin}
      <EyeOff class="h-4 w-4" />
    {:else}
      <Eye class="h-4 w-4" />
    {/if}
    ```

### 13. **shadcn-svelte Component Dependencies** ⭐ **NEW**
- **Error**: `Cannot find module '$lib/components/ui/badge'` or similar UI component errors
- **Real-world Issue**: Some shadcn-svelte components may not be installed or available
- **Root Cause**: Incomplete shadcn-svelte installation or missing component files
- **Recommended Fix**:
  - Use native HTML elements with Tailwind classes as fallbacks
  - Create custom components when shadcn components aren't available
  - **Example**: Replace `<Badge variant="success">` with `<span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">`

### 14. **Deprecated Event Directives in Svelte 5** ⭐ **NEW**
- **Error**: Warning about `on:submit` being deprecated
- **Real-world Issue**: `Using 'on:submit' to listen to the submit event is deprecated. Use the event attribute 'onsubmit' instead`
- **Root Cause**: Svelte 5 prefers native HTML event attributes over Svelte event directives for some events
- **Recommended Fix**:
  - Replace `on:submit|preventDefault={handleSubmit}` with `onsubmit={handleSubmit}`
  - Handle preventDefault inside the handler function if needed
  - **Example**: ✅ `<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>`

## 🛡 Prevention Strategies

### Development Checklist
- [ ] Verify Svelte 5 runes are used correctly and only in components
- [ ] Check file extensions in import statements
- [ ] Ensure route structure matches expected URL paths
- [ ] Test authentication flows across all routes
- [ ] Validate responsive design on multiple screen sizes
- [ ] Check for accessibility warnings and fix them
- [ ] Use consistent TailwindCSS patterns
- [ ] Test form submissions and event handlers
- [ ] **NEW**: Verify `$derived` vs `$derived.by` usage for complex expressions
- [ ] **NEW**: Check for JSX-style component rendering in templates
- [ ] **NEW**: Verify shadcn-svelte component dependencies are installed
- [ ] **NEW**: Update deprecated event directives to native HTML attributes

### Code Review Focus Areas
- Import statements and file extensions
- Route structure and URL mapping
- Svelte 5 runes usage and compatibility
- Authentication state management
- Form event handling
- Responsive design implementation
- Accessibility compliance
- **NEW**: `$derived` vs `$derived.by` usage patterns
- **NEW**: Template syntax for conditional component rendering
- **NEW**: Component dependency management
- **NEW**: Event directive vs attribute usage

## 🔧 Common Fix Patterns

### Quick Fixes Applied During Development
1. **Import Path Fixes**: Add `.js` extensions to import statements
2. **Route Structure**: Create proper directory hierarchy for routes
3. **Accessibility**: Remove redundant roles, add proper ARIA attributes
4. **State Management**: Convert to Svelte 5 runes syntax
5. **Event Handling**: Use proper event modifiers
6. **CSS Consistency**: Standardize on Tailwind utility classes
7. **NEW**: Derived State Fixes: Convert `$derived(() => ...)` to `$derived.by(() => ...)`
8. **NEW**: Template Syntax: Replace JSX-style conditionals with `{#if}` blocks
9. **NEW**: Component Fallbacks: Replace missing shadcn components with custom Tailwind elements
10. **NEW**: Event Attributes: Update `on:submit` to `onsubmit` for modern Svelte 5

---

*This document is based on real errors encountered during SurveyLauncher Admin development. Each point represents an actual issue that caused a failure and required a specific fix.*