# PrismNote Design Improvement Roadmap

**Version:** 1.0  
**Date:** 2026-07-28  
**Target:** Improve design maturity from 7/10 to 9/10

---

## Phase 1: Immediate Fixes (Week 1)

### 1.1 Add Keyboard Shortcut Reference

**Current:** Shortcuts hidden, not discoverable  
**Problem:** Users don't know what keyboard shortcuts exist  
**Solution:** Add shortcut cheat sheet in UI

Implementation:
```tsx
// New component: KeyboardShortcutsPanel.tsx
const shortcuts = [
  { key: 'Cmd/Ctrl+K', action: 'Command Palette', category: 'Navigation' },
  { key: 'Cmd/Ctrl+S', action: 'Save Notebook', category: 'File' },
  { key: 'Shift+Enter', action: 'Execute Cell', category: 'Execution' },
  { key: 'Cmd/Ctrl+Z', action: 'Undo', category: 'Edit' },
  { key: 'Cmd/Ctrl+Shift+Z', action: 'Redo', category: 'Edit' },
  { key: '?', action: 'Show Help', category: 'Help' },
  // ... more shortcuts
]
```

UI Changes:
- Add "?" button to top-right corner (next to Settings)
- Click shows modal with searchable shortcuts
- Group by category (Navigation, Execution, Edit, Help)
- Include Mac and Windows variants

### 1.2 Improve Empty States

**Current:** Blank areas confuse users  
**Problem:** No guidance on what to do next  
**Solution:** Design empty state cards

```tsx
// EmptyNotebookState.tsx
export const EmptyNotebookState = () => (
  <div className="empty-state">
    <div className="empty-state-icon">
      <code-brackets />  // or similar icon
    </div>
    <h2>Create Your First Cell</h2>
    <p>Start with Python, SQL, JavaScript, or Markdown</p>
    <button className="btn-primary">New Cell</button>
    <div className="empty-state-tips">
      <p>Press Shift+Enter to execute, or click Run</p>
      <p>Use Cmd/Ctrl+K for quick commands</p>
    </div>
  </div>
)
```

Apply to:
- Empty notebook
- Empty file list
- Empty terminal output
- No data loaded in explorer

### 1.3 Better Error Card Design

**Current:** Errors in red text, hard to see  
**Problem:** Important failures might be missed  
**Solution:** Prominent error card component

```tsx
// ErrorCard.tsx
export const ErrorCard = ({ error, title, onRetry }) => (
  <div className="error-card">
    <div className="error-header">
      <AlertCircle className="error-icon" />
      <h3>{title || 'Error'}</h3>
      <button className="close" onClick={onDismiss}>×</button>
    </div>
    <div className="error-message">
      {error.userMessage || 'Something went wrong'}
    </div>
    {error.details && (
      <details className="error-details">
        <summary>Technical Details</summary>
        <pre>{error.details}</pre>
      </details>
    )}
    {error.suggestion && (
      <div className="error-suggestion">
        <strong>Try:</strong> {error.suggestion}
      </div>
    )}
    {onRetry && (
      <button className="btn-secondary" onClick={onRetry}>
        Retry
      </button>
    )}
  </div>
)
```

CSS:
```css
.error-card {
  background: rgba(239, 68, 68, 0.05);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-left: 4px solid var(--error);
  border-radius: var(--radius-lg);
  padding: 16px;
  margin: 12px 0;
}

.error-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.error-icon {
  color: var(--error);
  width: 20px;
  height: 20px;
}
```

### 1.4 Modal Styling Consistency

**Current:** Modals have inconsistent styling  
**Problem:** Users unsure if element is modal or not  
**Solution:** Single Modal component with consistent styling

```tsx
// Modal.tsx
export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeButton = true,
}) => {
  return (
    <>
      {isOpen && (
        <div className="modal-backdrop" onClick={onClose}>
          <div
            className={`modal modal-${size}`}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="modal-header">
              <h2 id="modal-title">{title}</h2>
              {closeButton && (
                <button
                  className="modal-close"
                  onClick={onClose}
                  aria-label="Close modal"
                >
                  ×
                </button>
              )}
            </div>
            <div className="modal-body">
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
```

CSS:
```css
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--bg-primary);
  border-radius: var(--radius-lg);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  max-height: 90vh;
  overflow-y: auto;
}

.modal-sm { width: 90%; max-width: 400px; }
.modal-md { width: 90%; max-width: 600px; }
.modal-lg { width: 90%; max-width: 900px; }
```

### 1.5 Cell Output Visual Hierarchy

**Current:** All outputs look similar  
**Problem:** Hard to distinguish output types  
**Solution:** Add type indicators and cards

```tsx
// OutputCard.tsx
export const OutputCard = ({ type, data, metadata }) => {
  const getIcon = () => ({
    'text': FileText,
    'table': Table2,
    'chart': BarChart3,
    'error': AlertCircle,
    'html': Code,
  }[type])

  return (
    <div className={`output-card output-${type}`}>
      <div className="output-header">
        {getIcon() && <getIcon() className="output-icon" />}
        <span className="output-type">{type}</span>
        <div className="output-actions">
          <button className="btn-icon" title="Copy">
            Copy
          </button>
        </div>
      </div>
      <div className="output-content">
        {/* render based on type */}
      </div>
      {metadata?.timestamp && (
        <div className="output-meta">
          {new Date(metadata.timestamp).toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}
```

---

## Phase 2: Component Refinement (Weeks 2-3)

### 2.1 Component Directory Restructure

Current:
```
/src/components/
├── 51 files mixed
└── /common [few base components]
```

Proposed:
```
/src/components/
├── ui/                      [Base components]
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx
│   │   └── Button.stories.tsx
│   ├── Input/
│   ├── Select/
│   ├── Modal/
│   ├── Tooltip/
│   ├── Badge/
│   ├── Tabs/
│   ├── Card/
│   └── ...
├── layout/                  [Page layout]
│   ├── Sidebar/
│   ├── TopBar/
│   ├── BottomPanel/
│   └── MainContent/
├── notebook/                [Notebook domain]
│   ├── Cell/
│   ├── CellEditor/
│   ├── CellOutput/
│   └── CellControls/
├── panels/                  [Feature panels]
│   ├── NotebookPanel/
│   ├── DataExplorerPanel/
│   ├── AgentPanel/
│   ├── SettingsPanel/
│   ├── TerminalPanel/
│   ├── JobsPanel/
│   ├── DeployPanel/
│   └── ...
├── shared/                  [Shared utilities]
│   ├── EmptyState/
│   ├── ErrorBoundary/
│   ├── Loading/
│   └── ...
└── index.ts                 [Barrel exports]
```

Benefits:
- Clear responsibility per folder
- Easier to find components
- Better scalability
- Clearer dependency graph

### 2.2 Design System Documentation

Create `/frontend/design-system.md`:

```markdown
# PrismNote Design System

## Color Tokens

### Light Mode
- bg-primary: #ffffff
- bg-secondary: #f9fafb
- text-primary: #111827
- text-secondary: #6b7280
- border: #e5e7eb
- primary: #2563eb
- success: #10b981
- warning: #f59e0b
- error: #ef4444

### Dark Mode
- bg-primary: #1f2937
- bg-secondary: #111827
- text-primary: #f9fafb
- text-secondary: #d1d5db
- border: #374151
- primary: #3b82f6
- success: #34d399
- warning: #fbbf24
- error: #f87171

## Typography

- Font Family: System stack (SF Pro, Segoe UI, etc.)
- Body: 14px / 1.5
- Small: 12px / 1.4
- Large: 16px / 1.5
- XL: 20px / 1.6
- 2XL: 24px / 1.33
- 3XL: 30px / 1.2

## Spacing Scale

All spacing based on 8px base unit:
- xs: 4px
- sm: 8px
- md: 16px
- lg: 24px
- xl: 32px
- 2xl: 40px

## Border Radius

- sm: 4px
- md: 8px
- lg: 12px
- xl: 16px

## Shadows

- sm: 0 1px 2px rgba(0,0,0,0.05)
- md: 0 4px 6px rgba(0,0,0,0.1)
- lg: 0 10px 15px rgba(0,0,0,0.1)
- xl: 0 20px 25px rgba(0,0,0,0.1)

## Component Specifications

[Detailed component specs for each component]
```

### 2.3 Focus Management & Keyboard Navigation

Implement focus indicators:

```css
/* Focus visible for keyboard users */
*:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

button:focus-visible,
input:focus-visible,
select:focus-visible,
textarea:focus-visible,
[role="button"]:focus-visible {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}

/* High contrast mode */
@media (prefers-contrast: more) {
  *:focus-visible {
    outline-width: 3px;
  }
}

/* Respect prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### 2.4 Loading States Standardization

Create loading component:

```tsx
// LoadingIndicator.tsx
export const LoadingIndicator = ({ 
  type = 'spinner',
  message = 'Loading...',
  size = 'md'
}) => {
  if (type === 'spinner') {
    return (
      <div className={`loading loading-${size}`}>
        <div className="spinner"></div>
        {message && <p className="loading-message">{message}</p>}
      </div>
    )
  }
  
  if (type === 'skeleton') {
    return (
      <div className={`skeleton skeleton-${size}`}>
        {/* Pulsing skeleton loaders */}
      </div>
    )
  }
  
  if (type === 'progress') {
    return (
      <div className="progress-container">
        <div className="progress-bar"></div>
        <span className="progress-text">{message}</span>
      </div>
    )
  }
}

// CSS animations
@keyframes spin {
  to { transform: rotate(360deg); }
}

.spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(37, 99, 235, 0.1);
  border-top-color: var(--primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
    border-top-color: var(--primary);
  }
}
```

---

## Phase 3: Accessibility (Weeks 4-5)

### 3.1 Accessibility Audit Checklist

Run through all components:

- [ ] All interactive elements have visible focus indicators
- [ ] All images have alt text
- [ ] All form fields have associated labels
- [ ] Color not used as only indicator
- [ ] Contrast ratio >= 4.5:1 for normal text
- [ ] Contrast ratio >= 3:1 for large text
- [ ] Keyboard navigation possible without mouse
- [ ] Tab order is logical
- [ ] No keyboard traps
- [ ] Modals have focus trap
- [ ] Escape key closes modals
- [ ] Screen reader tested
- [ ] Heading hierarchy correct (h1 -> h2 -> h3)
- [ ] Links distinguishable from body text
- [ ] Buttons have accessible names
- [ ] Icons have aria-labels
- [ ] Error messages linked to form fields
- [ ] Required fields clearly marked
- [ ] Timeout warnings provided

### 3.2 ARIA Labels Implementation

```tsx
// Common ARIA patterns

// Icon-only button
<button aria-label="Save notebook" className="btn-icon">
  <Save />
</button>

// Loading indicator
<div role="status" aria-live="polite" aria-busy="true">
  Loading...
</div>

// Alert/Error
<div role="alert" className="error-card">
  Failed to execute cell
</div>

// Modal
<div role="dialog" aria-modal="true" aria-labelledby="modal-title">
  <h2 id="modal-title">Settings</h2>
  ...
</div>

// Tab panel
<div role="tabpanel" aria-labelledby="tab-output">
  ...
</div>
```

### 3.3 Screen Reader Testing

Test with:
- NVDA (Windows)
- JAWS (Windows)
- VoiceOver (Mac/iOS)

Common issues to check:
- All text visible to screen readers
- Chart descriptions provided
- Code execution status announced
- Table headers marked properly

---

## Phase 4: Mobile Optimization (Weeks 6-7)

### 4.1 Mobile-First Navigation

Replace horizontal layout with drawer:

```tsx
// MobileNav.tsx
export const MobileNav = ({ isOpen, onClose, children }) => {
  return (
    <>
      <button 
        className="mobile-menu-button"
        onClick={() => onOpen()}
        aria-label="Open menu"
      >
        Menu
      </button>
      
      {isOpen && (
        <nav className="mobile-drawer">
          <button 
            className="drawer-close"
            onClick={onClose}
            aria-label="Close menu"
          >
            ×
          </button>
          {children}
        </nav>
      )}
    </>
  )
}
```

### 4.2 Touch-Optimized Components

Increase touch targets:

```css
/* Minimum 44x44px touch target */
button {
  min-height: 44px;
  min-width: 44px;
  padding: 12px 16px;
}

/* Increase tap spacing */
button + button {
  margin-left: 12px;
}

/* Larger font for readability */
@media (max-width: 768px) {
  body {
    font-size: 16px;  /* Prevents zoom on iOS */
  }
  
  input {
    font-size: 16px;
  }
}
```

### 4.3 Responsive Grid Layouts

```css
/* Mobile-first */
.panel-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Tablet+ */
@media (min-width: 768px) {
  .panel-layout {
    flex-direction: row;
  }
  
  .sidebar {
    width: 240px;
    flex-shrink: 0;
  }
  
  .main {
    flex: 1;
  }
}

/* Desktop+ */
@media (min-width: 1024px) {
  .sidebar {
    width: 280px;
  }
}
```

---

## Phase 5: Advanced Features (Weeks 8+)

### 5.1 Onboarding Tour

Create interactive first-run flow:

```tsx
// Onboarding.tsx
const steps = [
  {
    target: '[data-tour="notebook-area"]',
    content: 'This is your notebook. Write Python or SQL here.',
    action: 'Click to create first cell',
  },
  {
    target: '[data-tour="execute-button"]',
    content: 'Click Run or press Shift+Enter to execute.',
    action: 'Try executing your first cell',
  },
  {
    target: '[data-tour="data-explorer"]',
    content: 'Explore and visualize data with Data Explorer.',
    action: 'Open Data Explorer (E key)',
  },
  {
    target: '[data-tour="ai-panel"]',
    content: 'Ask questions about your data. AI provides answers.',
    action: 'Chat with AI Assistant',
  },
]
```

### 5.2 Themes Support

Extend beyond dark/light:

```tsx
// Theme options
const themes = {
  light: { ... },
  dark: { ... },
  high-contrast: { ... },
  colorblind: { ... },
}

// Theme switcher
<select 
  value={theme}
  onChange={(e) => setTheme(e.target.value)}
  aria-label="Select theme"
>
  <option value="light">Light</option>
  <option value="dark">Dark</option>
  <option value="high-contrast">High Contrast</option>
  <option value="colorblind">Colorblind Friendly</option>
</select>
```

---

## Success Metrics

### Phase 1 (After Week 1)
- Keyboard shortcuts discoverable
- Empty states designed
- Error visibility improved
- Modal consistency > 90%
- User feedback: "UI is clearer"

### Phase 2 (After Week 3)
- Component organization complete
- Design system documented
- Focus indicators on all elements
- Keyboard navigation works
- User feedback: "Easy to find features"

### Phase 3 (After Week 5)
- WCAG AA compliance verified
- Screen reader testing passed
- Contrast ratios all > 4.5:1
- Accessibility audit score > 95%

### Phase 4 (After Week 7)
- Mobile usable (not just responsive)
- Touch targets all > 44px
- Navigation works on small screens
- User feedback: "Works on my phone"

### Phase 5 (After Week 8+)
- Onboarding completion > 80%
- First-time user satisfaction > 8/10
- Theme preferences saved
- User retention improved

---

## Resources

### Design Tools
- Figma: Design system component library
- Storybook: Component documentation
- Chromatic: Visual regression testing

### Accessibility Resources
- WCAG 2.1 Guidelines
- WebAIM Contrast Checker
- Axe DevTools
- NVDA Screen Reader

### Testing
- Lighthouse: Performance & accessibility
- Playwright: Visual regression tests
- Real devices for mobile testing

---

## Timeline Summary

| Phase | Duration | Goal |
|-------|----------|------|
| Phase 1 | 1 week | Immediate fixes |
| Phase 2 | 2 weeks | Component polish |
| Phase 3 | 2 weeks | Accessibility |
| Phase 4 | 2 weeks | Mobile |
| Phase 5 | 2+ weeks | Advanced features |
| **Total** | **9 weeks** | **Design Maturity 9/10** |

---

**Document Owner:** Design Team  
**Status:** Ready for implementation  
**Last Updated:** 2026-07-28
