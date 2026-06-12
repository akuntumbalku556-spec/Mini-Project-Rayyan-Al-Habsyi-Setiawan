# Implementation Plan: Expense & Budget Visualizer

## Overview

This implementation plan breaks down the Expense & Budget Visualizer into discrete coding tasks following the phased approach outlined in the design document. The application will be built using vanilla HTML, CSS, and JavaScript with no build tools or frameworks. All data persistence will be handled through the browser's Local Storage API.

The implementation follows an incremental approach where each task builds on previous work, with testing tasks integrated throughout to catch errors early. The plan prioritizes core functionality first (transactions and balance), then adds category management, budget features, visualization, and polish.

## Tasks

- [x] 1. Set up project structure and core infrastructure
  - [x] 1.1 Create project directory structure and initial files
    - Create `index.html` with semantic HTML5 structure
    - Create `css/styles.css` with CSS custom properties for theming
    - Create `js/app.js` with ES6 module structure
    - Add viewport meta tag and basic HTML boilerplate
    - _Requirements: 12.1, 12.2, 12.5, 12.6_

  - [x] 1.2 Implement Storage Manager with error handling
    - Write `StorageManager` class with `isAvailable()`, `saveState()`, `loadState()`, and `handleStorageError()` methods
    - Add try-catch blocks for all Local Storage operations
    - Implement fallback to default state when data is corrupted
    - Add graceful degradation to in-memory mode when storage unavailable
    - _Requirements: 9.5, 9.6, 9.7, 9.8, 11.5_


  - [ ] 1.6 Implement Validation Module
    - Write `Validator` class with methods for transaction, category, and budget validation
    - Implement `validateTransaction()` with rules for item name, amount, and category
    - Implement `validateCategory()` with rules for name, length, and uniqueness
    - Implement `validateBudgetLimit()` with numeric range validation
    - Implement `sanitizeString()` for trimming and normalizing whitespace
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 5.3, 5.4, 7.2, 7.3_


- [~] 2. Checkpoint - Verify infrastructure
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Implement transaction management
  - [x] 3.1 Implement Transaction Manager with core CRUD operations
    - Write `TransactionManager` class with `addTransaction()`, `deleteTransaction()`, and `getTransactions()` methods
    - Implement UUID v4 generation using `crypto.randomUUID()` or fallback
    - Implement ISO 8601 timestamp generation using `new Date().toISOString()`
    - Implement `calculateTotalBalance()` with banker's rounding to 2 decimal places
    - Implement `getSpendingByCategory()` to aggregate positive amounts by category
    - Implement `getTransactionsSorted()` to return transactions in reverse chronological order
    - _Requirements: 1.9, 2.1, 2.7, 4.2, 4.3, 4.4, 6.4_
  - [x] 3.7 Build transaction input form with validation
    - Create HTML form with fields for Item Name (text), Amount (number), and Category (select)
    - Add form validation using Validator module
    - Display validation error messages near relevant input fields
    - Wire form submit event to TransactionManager.addTransaction()
    - Clear form fields after successful submission
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10_

  - [x] 3.9 Implement transaction display list
    - Create scrollable container for transaction list
    - Build function to render transaction items showing item name, amount (formatted to 2 decimals), category, and timestamp
    - Display "No transactions yet. Add your first expense to get started." when list is empty
    - Update list within 100ms when transactions change
    - _Requirements: 2.1, 2.2, 2.3, 2.5_

  - [x] 3.11 Implement total balance calculation and display
    - Create prominent display element for total balance at top of page
    - Format balance to 2 decimal places
    - Show minus sign prefix for negative balances
    - Update display within 100ms when transactions change
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6_


  - [x] 3.13 Integrate transaction form with storage and display
    - Wire form submission to save transaction to Local Storage via StorageManager
    - Update transaction list display after adding transaction
    - Update total balance display after adding transaction
    - Handle storage errors gracefully with user-friendly messages
    - _Requirements: 1.8, 1.9, 2.3, 2.4, 4.2_

- [~] 4. Checkpoint - Verify transaction features
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement transaction deletion
  - [~] 5.1 Add delete button to each transaction in the list
    - Add delete button HTML element to each transaction item
    - Style delete button for accessibility and visibility
    - Wire click event to deletion handler
    - _Requirements: 3.1_

  - [x] 5.2 Implement deletion with confirmation dialog
    - Show confirmation dialog with message "Delete this transaction?"
    - Implement cancel flow that retains transaction
    - Implement confirm flow that removes transaction from storage and display
    - Update total balance within 100ms after deletion
    - Handle storage deletion errors with user-friendly messages
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.8_

- [x] 6. Implement category management
  - [x] 6.1 Implement Category Manager
    - Write `CategoryManager` class with `addCategory()`, `categoryExists()`, and `isLimitReached()` methods
    - Define default categories: ["Food", "Transport", "Fun"]
    - Set maximum category limit to 50
    - Implement case-insensitive duplicate checking
    - _Requirements: 5.1, 5.8, 5.9_

  - [x] 6.2 Build category management UI
    - Create category management section with input field for new category name
    - Add button to add new custom category
    - Display list of all categories (default + custom)
    - Show count of current categories and limit (e.g., "5 / 50 categories")
    - Disable add button when limit reached with message
    - _Requirements: 5.2, 5.9_

  - [x] 6.3 Implement custom category creation with validation
    - Validate category name using Validator module
    - Display validation errors for empty, whitespace-only, or too-long names
    - Display error for duplicate category names (case-insensitive)
    - Save new categories to Local Storage
    - Update transaction form dropdown with new categories
    - _Requirements: 5.3, 5.4, 5.5, 5.6, 5.8_


  - [x] 6.5 Load custom categories from storage on page load
    - Load categories from Local Storage using StorageManager
    - Merge with default categories
    - Populate category dropdown in transaction form
    - _Requirements: 5.7_

- [~] 7. Checkpoint - Verify category features
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement budget features
  - [x] 8.1 Implement Budget Manager
    - Write `BudgetManager` class with `setBudgetLimit()`, `deleteBudgetLimit()`, and `isBudgetExceeded()` methods
    - Implement `getExceededCategories()` to find categories with spending > limit
    - Implement `formatBudgetAlert()` to create user-friendly messages
    - _Requirements: 7.7, 7.8_


  - [x] 8.3 Build budget limit setting UI
    - Create budget management section with dropdown to select category
    - Add input field for budget limit amount
    - Add button to set/update budget limit
    - Display list of categories with their current limits and spending
    - Add button to delete budget limit for each category
    - _Requirements: 7.1, 7.5, 7.6, 7.11_

  - [x] 8.4 Implement budget limit validation and storage
    - Validate budget limit using Validator module
    - Display errors for non-numeric or out-of-range values [0.01, 999999999.99]
    - Save budget limits to Local Storage
    - Load budget limits from Local Storage on page load
    - _Requirements: 7.2, 7.3, 7.4, 7.10_


  - [x] 8.6 Implement budget exceeded alerts and visual indicators
    - Check for exceeded budgets after adding/deleting transactions
    - Display notification message "Budget exceeded for [Category]: [Amount] / [Limit]"
    - Apply visual indicator (red border/background) to exceeded categories in transaction list
    - Display visual indicators on page load if budgets exceeded
    - _Requirements: 7.7, 7.8, 7.9_




- [ ] 10. Implement spending visualization
  - [x] 10.1 Choose and integrate Chart.js library
    - Add Chart.js CDN link to index.html (or download for offline use)
    - Create canvas element for pie chart in HTML
    - Initialize Chart.js instance with basic configuration
    - _Requirements: 6.1_

  - [x] 10.2 Implement Chart Renderer
    - Write `ChartRenderer` class with `updateChart()`, `clearChart()`, and `destroy()` methods
    - Configure pie chart to display category names and amounts
    - Format amounts to 2 decimal places in chart labels
    - _Requirements: 6.1, 6.4_

  - [x] 10.3 Implement spending distribution chart updates
    - Calculate spending by category using TransactionManager.getSpendingByCategory()
    - Filter to include only categories with positive spending
    - Update chart when transactions are added or deleted
    - Ensure chart updates complete within 200ms
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.6, 10.5_


  - [x] 10.5 Implement chart empty state
    - Display message "No spending data to display" when no positive spending exists
    - Handle empty transaction list gracefully
    - _Requirements: 6.5_

  - [~] 10.6 Highlight budget-exceeded categories in chart
    - Get list of exceeded categories from BudgetManager
    - Apply distinct visual styling (e.g., red slice color) to exceeded categories
    - Update highlighting when budget limits change
    - _Requirements: 7.7_


- [ ] 12. Implement theme management
  - [~] 12.1 Implement Theme Manager
    - Write `ThemeManager` class with `toggleTheme()`, `applyTheme()`, and `getSystemTheme()` methods
    - Implement theme application by toggling CSS class on root element
    - Implement system preference detection using `window.matchMedia('(prefers-color-scheme: dark)')`
    - _Requirements: 8.3_

  - [~] 12.2 Design light and dark themes with CSS custom properties
    - Define CSS custom properties for colors: background, text, borders, buttons
    - Create light theme color scheme (default)
    - Create dark theme color scheme
    - Ensure 4.5:1 color contrast ratio for text in both themes
    - _Requirements: 8.3, 13.1, 13.3_

  - [~] 12.3 Implement theme toggle control
    - Add theme toggle button/switch to UI (prominently placed)
    - Wire click event to ThemeManager.toggleTheme()
    - Apply theme change within 100ms
    - Save theme preference to Local Storage
    - _Requirements: 8.1, 8.2, 8.4_

  - [~] 12.4 Implement theme persistence and loading
    - Load theme preference from Local Storage on page load
    - Apply saved theme within 100ms on page load
    - Fall back to light theme if no preference exists
    - Continue applying theme even if storage fails
    - _Requirements: 8.4, 8.5, 8.6, 8.7_

  - [~] 12.6 Add smooth theme transitions
    - Add CSS transitions for color property changes
    - Ensure transitions are smooth and not jarring
    - Keep transition duration under 300ms
    - _Requirements: 8.2_

- [ ] 13. Implement UI Controller and polish
  - [~] 13.1 Implement UI Controller coordination layer
    - Write `UIController` class to coordinate all UI updates
    - Implement `init()` to set up all event listeners
    - Implement `renderTransactionList()`, `updateTotalBalance()`, `showError()`, `showNotification()`, `clearForm()` methods
    - Implement debouncing for expensive operations (chart updates)
    - Cache DOM element references for performance
    - _Requirements: 2.3, 3.4, 10.2, 10.3_

  - [~] 13.2 Implement visual feedback for all user interactions
    - Add hover states for all buttons
    - Add active/pressed states for buttons
    - Show loading indicators for operations >100ms
    - Display success notifications after successful operations
    - Display error notifications for failed operations
    - _Requirements: 13.4_

  - [~] 13.3 Implement responsive layout and spacing
    - Use flexbox/grid for layout structure
    - Ensure application is usable on mobile, tablet, and desktop screen sizes
    - Apply consistent spacing using CSS custom properties
    - Prevent visual clutter with appropriate whitespace
    - _Requirements: 13.2, 13.5, 13.6_

  - [~] 13.4 Add accessibility features
    - Use semantic HTML elements (header, main, section, form, button)
    - Add ARIA labels to interactive elements
    - Add keyboard navigation support (Tab, Enter, Escape)
    - Add focus indicators for all interactive elements
    - Use `textContent` instead of `innerHTML` for user-generated content
    - _Requirements: 12.5_


- [ ] 14. Performance optimization
  - [~] 14.1 Optimize DOM updates for performance
    - Use DocumentFragment for batch insertions in transaction list
    - Update only changed elements instead of re-rendering entire list
    - Cache DOM element references in UI Controller
    - _Requirements: 10.2, 10.3, 10.4_

  - [~] 14.2 Implement chart update debouncing
    - Debounce chart updates with 200ms delay
    - Cancel pending chart updates when new update requested
    - Ensure final update always executes
    - _Requirements: 3.7, 10.5_

  - [~] 14.3 Test performance with 1000+ transactions
    - Generate 1000 test transactions
    - Verify add transaction completes within 100ms
    - Verify delete transaction completes within 100ms
    - Verify chart update completes within 200ms
    - Optimize bottlenecks if performance targets not met
    - _Requirements: 10.4_


- [ ] 15. Final integration and testing
  - [~] 15.1 Implement Error Handler module
    - Write `ErrorHandler` class with `handleError()`, `handleStorageError()`, `displayError()`, and `logError()` methods
    - Categorize errors: validation, storage, data corruption, performance
    - Display user-friendly error messages with appropriate severity
    - Log errors to console for debugging
    - _Requirements: 2.6, 3.8, 9.6, 9.7_

  - [~] 15.2 Wire all components together
    - Initialize all managers on page load
    - Load all data from storage on page load
    - Set up all event listeners
    - Apply initial theme
    - Render initial state
    - _Requirements: 2.4, 5.7, 7.10, 8.6, 9.5_

  - [~] 15.3 Test page load performance
    - Test DOM interactive within 2 seconds on 25+ Mbps connection
    - Test theme applied within 100ms on page load
    - Optimize load performance if targets not met
    - _Requirements: 10.1, 8.6_


  - [~] 15.5 Add code comments and documentation
    - Add JSDoc comments for all public methods
    - Add inline comments for complex logic
    - Document validation rules
    - Document storage schema
    - _Requirements: 12.3_

  - [~] 15.6 Final cleanup and code review
    - Verify consistent naming conventions
    - Verify consistent code formatting
    - Remove console.log statements (keep only ErrorHandler logs)
    - Verify no build tools or test files in deliverable
    - Verify all CSS organized by component
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.6, 12.7_

- [~] 16. Final checkpoint - Complete testing
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- **Optional Tasks**: Tasks marked with `*` are optional testing tasks. Core implementation tasks are required.
- **Requirements Traceability**: Each task references specific requirements for verification.
- **Incremental Validation**: Checkpoints ensure functionality is validated at each stage.
- **Property-Based Testing**: 15 correctness properties from the design document are implemented as property tests using fast-check (minimum 100 iterations per test).
- **Unit Testing**: Unit tests complement property tests by checking specific examples, edge cases, and error conditions.
- **Performance Focus**: Tasks explicitly address performance requirements (100-200ms update times, 1000+ transaction support).
- **Browser Compatibility**: Final testing includes manual verification across all required browsers.
- **No Build Tools**: Application is designed to run directly without compilation or build process.
- **Accessibility**: Semantic HTML, ARIA labels, keyboard navigation, and color contrast are integrated throughout.
- **Test Framework**: Use fast-check for property-based tests and Jest/Mocha for unit tests (not included in deliverable).

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.6"] },
    { "id": 2, "tasks": ["1.3", "1.4", "1.5", "1.7", "1.8", "1.9"] },
    { "id": 3, "tasks": ["3.1"] },
    { "id": 4, "tasks": ["3.2", "3.3", "3.4", "3.5", "3.6", "3.7"] },
    { "id": 5, "tasks": ["3.8", "3.9", "3.10"] },
    { "id": 6, "tasks": ["3.11", "3.12", "3.13"] },
    { "id": 7, "tasks": ["5.1"] },
    { "id": 8, "tasks": ["5.2", "5.3"] },
    { "id": 9, "tasks": ["6.1"] },
    { "id": 10, "tasks": ["6.2", "6.3"] },
    { "id": 11, "tasks": ["6.4", "6.5"] },
    { "id": 12, "tasks": ["8.1"] },
    { "id": 13, "tasks": ["8.2", "8.3"] },
    { "id": 14, "tasks": ["8.4", "8.5", "8.6"] },
    { "id": 15, "tasks": ["8.7"] },
    { "id": 16, "tasks": ["10.1"] },
    { "id": 17, "tasks": ["10.2", "10.3"] },
    { "id": 18, "tasks": ["10.4", "10.5", "10.6"] },
    { "id": 19, "tasks": ["10.7"] },
    { "id": 20, "tasks": ["12.1", "12.2"] },
    { "id": 21, "tasks": ["12.3", "12.4"] },
    { "id": 22, "tasks": ["12.5", "12.6"] },
    { "id": 23, "tasks": ["13.1"] },
    { "id": 24, "tasks": ["13.2", "13.3", "13.4"] },
    { "id": 25, "tasks": ["13.5"] },
    { "id": 26, "tasks": ["14.1", "14.2"] },
    { "id": 27, "tasks": ["14.3", "14.4"] },
    { "id": 28, "tasks": ["15.1"] },
    { "id": 29, "tasks": ["15.2"] },
    { "id": 30, "tasks": ["15.3", "15.4"] },
    { "id": 31, "tasks": ["15.5", "15.6"] }
  ]
}
```
