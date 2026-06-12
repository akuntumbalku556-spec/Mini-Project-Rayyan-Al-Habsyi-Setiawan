# Design Document: Expense & Budget Visualizer

## Overview

The Expense & Budget Visualizer is a single-page application (SPA) built with vanilla HTML, CSS, and JavaScript that runs entirely in the browser. The application provides expense tracking, budget management, and spending visualization capabilities without requiring a backend server. All data persistence is handled through the browser's Local Storage API.

### Key Design Principles

1. **Client-Side First**: Zero server dependencies, all processing happens in the browser
2. **Progressive Enhancement**: Core functionality works without advanced features
3. **Separation of Concerns**: Clear boundaries between data, business logic, and presentation
4. **Defensive Programming**: Robust error handling and validation at all layers
5. **Performance-Conscious**: Optimized for responsive UI updates even with 1000+ transactions

### Technology Stack

- **HTML5**: Semantic markup for structure
- **CSS3**: Styling with CSS custom properties for theming
- **Vanilla JavaScript (ES6+)**: No frameworks or build tools
- **Local Storage API**: Browser-native persistence
- **Chart.js or Canvas API**: Pie chart visualization

## Architecture

### High-Level Architecture

The application follows a layered architecture pattern:

```
┌─────────────────────────────────────────┐
│         Presentation Layer              │
│  (DOM Manipulation, Event Handlers)     │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Application Layer               │
│  (Business Logic, Validation, State)    │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│         Data Layer                      │
│  (Local Storage Interface, Serialization)│
└─────────────────────────────────────────┘
```

### Module Structure

```
expense-budget-visualizer/
├── index.html                 # Entry point, semantic HTML structure
├── css/
│   └── styles.css            # All application styles, theme definitions
└── js/
    └── app.js                # All application logic
```

### Application State

The application maintains a single source of truth in memory, synchronized with Local Storage:

```javascript
{
  transactions: [
    {
      id: "uuid-v4-string",
      itemName: "string",
      amount: number,
      category: "string",
      timestamp: "ISO 8601 string"
    }
  ],
  categories: ["Food", "Transport", "Fun", ...customCategories],
  budgetLimits: {
    "Food": 500.00,
    "Transport": 200.00
  },
  themeMode: "light" | "dark"
}
```

## Components and Interfaces

### 1. Storage Manager

**Responsibility**: Handles all Local Storage interactions with error handling and fallback behavior.

**Interface**:
```javascript
class StorageManager {
  // Check if Local Storage is available
  static isAvailable(): boolean
  
  // Save entire application state
  static saveState(state: AppState): boolean
  
  // Load application state
  static loadState(): AppState | null
  
  // Handle storage errors
  static handleStorageError(error: Error): void
}
```

**Key Behaviors**:
- Validates Local Storage availability on initialization
- Wraps all storage operations in try-catch blocks
- Returns default state when data is corrupted or missing
- Gracefully degrades to in-memory mode when storage unavailable

### 2. Validation Module

**Responsibility**: Validates all user inputs before processing.

**Interface**:
```javascript
class Validator {
  // Validate transaction input
  static validateTransaction(itemName: string, amount: string, category: string): ValidationResult
  
  // Validate category name
  static validateCategory(name: string, existingCategories: string[]): ValidationResult
  
  // Validate budget limit
  static validateBudgetLimit(amount: string): ValidationResult
  
  // Sanitize strings (trim, normalize whitespace)
  static sanitizeString(input: string): string
}

interface ValidationResult {
  isValid: boolean
  errorMessage?: string
}
```

**Validation Rules**:
- Item Name: 1-100 characters, not only whitespace
- Amount: numeric, -999999999.99 to 999999999.99
- Category: required selection from available categories
- Category Name: 1-30 characters, not only whitespace, unique (case-insensitive)
- Budget Limit: numeric, 0.01 to 999999999.99

### 3. Transaction Manager

**Responsibility**: Manages transaction CRUD operations and business logic.

**Interface**:
```javascript
class TransactionManager {
  // Add new transaction
  static addTransaction(itemName: string, amount: number, category: string): Transaction
  
  // Delete transaction by ID
  static deleteTransaction(id: string): boolean
  
  // Get all transactions
  static getTransactions(): Transaction[]
  
  // Get transactions sorted by timestamp (newest first)
  static getTransactionsSorted(): Transaction[]
  
  // Calculate total balance
  static calculateTotalBalance(transactions: Transaction[]): number
  
  // Get spending by category (positive amounts only)
  static getSpendingByCategory(transactions: Transaction[]): Map<string, number>
  
  // Generate unique ID
  static generateId(): string
}
```

**Key Behaviors**:
- Generates UUID v4 for transaction IDs
- Adds ISO 8601 timestamps to new transactions
- Implements banker's rounding for all financial calculations
- Returns transactions in reverse chronological order

### 4. Category Manager

**Responsibility**: Manages category lifecycle and validation.

**Interface**:
```javascript
class CategoryManager {
  static DEFAULT_CATEGORIES = ["Food", "Transport", "Fun"]
  static MAX_CATEGORIES = 50
  
  // Add custom category
  static addCategory(name: string, existingCategories: string[]): string[]
  
  // Check if category exists (case-insensitive)
  static categoryExists(name: string, categories: string[]): boolean
  
  // Check if category limit reached
  static isLimitReached(categories: string[]): boolean
  
  // Get all categories
  static getCategories(): string[]
}
```

**Key Behaviors**:
- Maintains default categories that cannot be deleted
- Enforces 50 category maximum
- Performs case-insensitive duplicate checking
- Returns merged list of default + custom categories

### 5. Budget Manager

**Responsibility**: Manages budget limits and alerts.

**Interface**:
```javascript
class BudgetManager {
  // Set budget limit for category
  static setBudgetLimit(category: string, limit: number): void
  
  // Delete budget limit for category
  static deleteBudgetLimit(category: string): void
  
  // Check if category exceeds budget
  static isBudgetExceeded(category: string, spending: number, limits: BudgetLimits): boolean
  
  // Get all categories exceeding budget
  static getExceededCategories(spendingByCategory: Map<string, number>, limits: BudgetLimits): string[]
  
  // Format budget alert message
  static formatBudgetAlert(category: string, spending: number, limit: number): string
}
```

**Key Behaviors**:
- Checks if spending is strictly greater than limit
- Returns list of categories exceeding their budgets
- Formats user-friendly alert messages

### 6. Chart Renderer

**Responsibility**: Renders pie chart visualization of spending data.

**Interface**:
```javascript
class ChartRenderer {
  // Initialize chart with canvas element
  constructor(canvasElement: HTMLCanvasElement)
  
  // Update chart with new data
  updateChart(spendingByCategory: Map<string, number>, exceededCategories: string[]): void
  
  // Clear chart
  clearChart(): void
  
  // Destroy chart instance
  destroy(): void
}
```

**Implementation Options**:
1. **Chart.js** (recommended): Lightweight, well-documented, handles responsive rendering
2. **Canvas API**: Custom implementation for full control and zero dependencies

**Key Behaviors**:
- Only displays categories with positive spending
- Highlights categories exceeding budget limits with visual indicator
- Shows "No spending data to display" when no positive amounts exist
- Updates within 200ms performance budget

### 7. UI Controller

**Responsibility**: Coordinates UI updates and user interactions.

**Interface**:
```javascript
class UIController {
  // Initialize all event listeners
  static init(): void
  
  // Render transaction list
  static renderTransactionList(transactions: Transaction[]): void
  
  // Update total balance display
  static updateTotalBalance(balance: number): void
  
  // Show validation error
  static showError(message: string): void
  
  // Show notification
  static showNotification(message: string): void
  
  // Clear form inputs
  static clearForm(): void
  
  // Apply theme
  static applyTheme(mode: "light" | "dark"): void
  
  // Show/hide loading state
  static setLoading(isLoading: boolean): void
}
```

**Key Behaviors**:
- Debounces expensive operations (chart updates)
- Provides visual feedback for all user actions
- Manages modal dialogs for confirmations
- Updates UI within performance budgets (100-200ms)

### 8. Theme Manager

**Responsibility**: Manages application theme state.

**Interface**:
```javascript
class ThemeManager {
  // Toggle theme mode
  static toggleTheme(currentMode: string): string
  
  // Apply theme to DOM
  static applyTheme(mode: string): void
  
  // Get system preferred theme
  static getSystemTheme(): string
}
```

**Key Behaviors**:
- Applies theme by toggling CSS class on root element
- Saves preference to Local Storage
- Falls back to system preference if available
- Defaults to light mode

## Data Models

### Transaction Model

```typescript
interface Transaction {
  id: string;              // UUID v4
  itemName: string;        // 1-100 chars, trimmed
  amount: number;          // -999999999.99 to 999999999.99, rounded to 2 decimal places
  category: string;        // Must exist in categories list
  timestamp: string;       // ISO 8601 format: "YYYY-MM-DDTHH:mm:ss.sssZ"
}
```

**Invariants**:
- `id` is unique across all transactions
- `itemName` is not empty and not only whitespace
- `amount` is within specified bounds
- `category` exists in the application's category list
- `timestamp` is valid ISO 8601 format

### Application State Model

```typescript
interface AppState {
  transactions: Transaction[];
  categories: string[];      // Minimum 3 (defaults), maximum 50
  budgetLimits: {
    [category: string]: number;  // 0.01 to 999999999.99
  };
  themeMode: "light" | "dark";
}
```

**Default State**:
```javascript
{
  transactions: [],
  categories: ["Food", "Transport", "Fun"],
  budgetLimits: {},
  themeMode: "light"
}
```

### Local Storage Schema

**Key**: `expense-budget-app-data`

**Value** (JSON stringified):
```json
{
  "version": "1.0",
  "transactions": [...],
  "categories": [...],
  "budgetLimits": {...},
  "themeMode": "light"
}
```

**Schema Validation**:
- Must be valid JSON
- Must contain `transactions` array
- Must contain `categories` array
- Must contain `budgetLimits` object
- Must contain `themeMode` string
- Invalid or missing data triggers fallback to defaults

## Error Handling

### Error Categories and Handling Strategy

1. **Validation Errors** (User Input)
   - Display user-friendly error message near input field
   - Prevent form submission
   - Do not persist invalid state
   - Examples: Empty item name, non-numeric amount

2. **Storage Errors** (Local Storage)
   - Display persistent error banner
   - Fall back to in-memory mode
   - Warn user that data will not persist
   - Examples: Storage quota exceeded, Local Storage disabled

3. **Data Corruption** (Invalid Persisted Data)
   - Display error message on load
   - Initialize with default state
   - Log error to console for debugging
   - Examples: Malformed JSON, missing required fields

4. **Performance Errors** (Slow Operations)
   - Show loading indicator for operations >100ms
   - Debounce expensive updates (chart rendering)
   - Optimize for 1000+ transactions
   - Examples: Chart update with many categories

### Error Message Design

**Principles**:
- Clear and actionable
- No technical jargon
- Specify what went wrong and how to fix it
- Use appropriate severity (error vs warning vs info)

**Examples**:
- ❌ "Item name is required"
- ❌ "Amount must be a valid number"
- ⚠️ "Local storage is unavailable. Data will not be saved."
- ⚠️ "Budget exceeded for Food: $650.00 / $500.00"

### Error Recovery

```javascript
class ErrorHandler {
  // Global error handler
  static handleError(error: Error, context: string): void
  
  // Storage error handler
  static handleStorageError(error: Error): void
  
  // Display error to user
  static displayError(message: string, severity: "error" | "warning" | "info"): void
  
  // Log error for debugging
  static logError(error: Error, context: string): void
}
```

## Testing Strategy

### Testing Approach

The application will use a **dual testing strategy**:

1. **Unit Tests**: Verify specific examples, edge cases, and error conditions
2. **Property-Based Tests**: Verify universal properties across all inputs for pure business logic functions

Together, these provide comprehensive coverage where unit tests catch concrete bugs and property tests verify general correctness.

### Property-Based Testing Scope

**PBT is appropriate for**:
- Pure business logic functions (validation, calculations, transformations)
- Data serialization/deserialization
- Category matching logic
- Budget limit checking

**PBT is NOT appropriate for**:
- UI rendering and DOM manipulation (use snapshot tests instead)
- Local Storage I/O (use integration tests with mocks)
- Event handling (use example-based tests)
- Visual feedback and animations (use manual testing)

### Testing Tools

- **Property-Based Testing Library**: fast-check (JavaScript)
- **Unit Testing Framework**: Jest or Mocha
- **Test Configuration**: Minimum 100 iterations per property test
- **Test Organization**: Group tests by module, tag with property references

### Property Test Tagging

Each property-based test will include a comment referencing the design document property:

```javascript
// Feature: expense-budget-visualizer, Property 1: Balance calculation is associative
test('balance calculation order independence', () => {
  fc.assert(fc.property(
    fc.array(transactionGenerator),
    (transactions) => {
      // Test implementation
    }
  ), { numRuns: 100 });
});
```

### Unit Testing Strategy

Unit tests will focus on:
- **Specific examples**: Common use cases with concrete inputs
- **Edge cases**: Empty inputs, boundary values, maximum limits
- **Error conditions**: Invalid inputs, storage failures, malformed data
- **Integration points**: Module interactions, state transitions

### Browser Compatibility Testing

Manual testing required on:
- Chrome (latest)
- Firefox (latest)
- Edge (latest)
- Safari (latest)

Focus areas:
- Local Storage availability and behavior
- CSS rendering (flexbox, grid, custom properties)
- JavaScript ES6+ feature support
- Chart rendering and responsiveness

## Performance Optimization

### Performance Requirements

- Page load: DOM interactive within 2 seconds (25+ Mbps connection)
- Transaction add/delete: UI update within 100ms
- Chart update: Complete within 200ms
- Support 1000+ transactions without degradation

### Optimization Strategies

1. **Efficient DOM Updates**
   - Use DocumentFragment for batch insertions
   - Update only changed elements (virtual DOM approach)
   - Debounce chart updates (200ms)
   - Cache DOM element references

2. **Data Structure Optimization**
   - Index transactions by ID for O(1) deletion
   - Cache computed values (total balance, spending by category)
   - Invalidate cache only on data changes

3. **Rendering Optimization**
   - Use CSS transforms for smooth animations
   - Minimize reflows and repaints
   - Lazy load chart library if using Chart.js
   - Virtualize transaction list for 1000+ items (optional enhancement)

4. **Storage Optimization**
   - Batch Local Storage writes
   - Compress data if approaching quota
   - Debounce save operations

### Performance Measurement

```javascript
class PerformanceMonitor {
  // Measure operation duration
  static measure(operation: string, fn: Function): void
  
  // Log performance metrics
  static logMetrics(): void
  
  // Check if performance budget exceeded
  static checkBudget(operation: string, duration: number): void
}
```

## Implementation Plan

### Phase 1: Core Infrastructure
1. Set up project structure (HTML, CSS, JS files)
2. Implement Storage Manager with error handling
3. Implement Validation Module
4. Create basic HTML structure with semantic elements

### Phase 2: Transaction Management
1. Implement Transaction Manager
2. Build transaction input form with validation
3. Implement transaction display list
4. Add transaction deletion with confirmation
5. Implement total balance calculation and display

### Phase 3: Category Management
1. Implement Category Manager
2. Build category management UI
3. Add custom category creation with validation
4. Implement category limit enforcement

### Phase 4: Budget Features
1. Implement Budget Manager
2. Build budget limit setting UI
3. Add budget exceeded detection and alerts
4. Implement visual indicators for exceeded budgets

### Phase 5: Visualization
1. Choose and integrate chart library (or implement canvas-based chart)
2. Implement Chart Renderer
3. Build pie chart with spending distribution
4. Add budget exceeded highlighting in chart
5. Handle empty state

### Phase 6: Theme & Polish
1. Implement Theme Manager
2. Design light and dark themes with CSS custom properties
3. Add theme toggle control
4. Implement smooth theme transitions

### Phase 7: Testing & Optimization
1. Write property-based tests for business logic
2. Write unit tests for edge cases and error conditions
3. Perform browser compatibility testing
4. Optimize performance for 1000+ transactions
5. Test Local Storage error scenarios

### Phase 8: Documentation & Delivery
1. Add code comments for complex logic
2. Write usage documentation
3. Create deployment guide
4. Final testing and bug fixes

## Security Considerations

### Data Security

- **Client-Side Only**: No data transmission to servers
- **Local Storage**: Data remains in user's browser
- **No Authentication**: Single-user application

### Input Sanitization

- Trim and normalize all string inputs
- Validate numeric inputs before parsing
- Prevent XSS by using textContent instead of innerHTML for user-generated content
- Escape special characters in display

### Browser Security

- Use `strict` mode in JavaScript
- Validate all data from Local Storage before use
- Handle Local Storage access errors gracefully
- No eval() or dynamic code execution

## Accessibility Considerations

### WCAG Compliance Targets

- Semantic HTML structure
- Keyboard navigation support
- ARIA labels for interactive elements
- Sufficient color contrast (4.5:1 for normal text)
- Focus indicators for all interactive elements
- Screen reader friendly error messages

### Implementation

```html
<!-- Example: Transaction form with ARIA labels -->
<form aria-label="Add transaction">
  <label for="itemName">Item Name</label>
  <input id="itemName" type="text" aria-required="true" aria-describedby="itemNameError">
  <span id="itemNameError" role="alert" aria-live="polite"></span>
</form>
```

### Keyboard Navigation

- Tab through all interactive elements
- Enter to submit forms
- Space to activate buttons
- Escape to close modals
- Arrow keys for chart navigation (if applicable)

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

The following properties define the core correctness requirements for the business logic layer of the Expense & Budget Visualizer. These properties are suitable for property-based testing as they involve pure functions with clear input/output behavior.

### Property 1: Transaction Validation Completeness

*For any* input string as item name and input string as amount, the validation function SHALL correctly identify whether the input meets all validation rules (non-empty, not only whitespace, length ≤100 for item name; numeric and within bounds for amount).

**Validates: Requirements 1.2, 1.3, 1.4, 1.5, 1.6**

### Property 2: Category Validation Correctness

*For any* input string as category name and existing category list, the validation function SHALL correctly identify whether the category is valid (non-empty, not only whitespace, length ≤30, case-insensitive unique).

**Validates: Requirements 5.3, 5.4, 5.8**

### Property 3: Budget Validation Boundaries

*For any* input string as budget limit, the validation function SHALL correctly identify whether the value is numeric and within the valid range [0.01, 999999999.99].

**Validates: Requirements 7.2, 7.3**

### Property 4: Balance Calculation Associativity

*For any* set of transactions and any order of applying those transactions (adds and deletes), the final total balance SHALL equal the sum of all remaining transaction amounts rounded using banker's rounding to 2 decimal places.

**Validates: Requirements 4.2, 4.3, 4.4**

### Property 5: Transaction List Ordering

*For any* set of transactions with timestamps, sorting the transactions SHALL produce a list in reverse chronological order (newest first) based on ISO 8601 timestamp comparison.

**Validates: Requirements 2.1**

### Property 6: Transaction Round-Trip

*For any* valid transaction, adding it to a transaction list and then immediately deleting it by ID SHALL result in the original list state (idempotent cancellation).

**Validates: Requirements 1.9, 3.4, 3.5**

### Property 7: Timestamp Generation Format

*For any* transaction creation operation, the assigned timestamp SHALL be a valid ISO 8601 formatted string that can be parsed back to a Date object.

**Validates: Requirements 2.7**

### Property 8: Budget Exceeded Detection

*For any* category with defined budget limit and total spending, the budget exceeded check SHALL return true if and only if the total spending is strictly greater than the budget limit.

**Validates: Requirements 7.7, 7.8**

### Property 9: Spending Aggregation by Category

*For any* set of transactions, grouping transactions by category and summing positive amounts SHALL produce totals where each category's sum equals the sum of all positive transaction amounts in that category, rounded to 2 decimal places.

**Validates: Requirements 6.4**

### Property 10: Positive Spending Filter

*For any* spending-by-category map, filtering to include only categories with positive spending SHALL exclude all categories with zero or negative total amounts.

**Validates: Requirements 6.6**

### Property 11: Transaction Display Formatting

*For any* transaction object, the formatting function SHALL produce a string containing the item name, the amount formatted to exactly 2 decimal places, the category, and the timestamp.

**Validates: Requirements 2.2**

### Property 12: Negative Balance Formatting

*For any* balance value less than zero, the formatted display string SHALL begin with a minus sign prefix.

**Validates: Requirements 4.6**

### Property 13: Data Serialization Round-Trip

*For any* valid application state object (transactions, categories, budgetLimits, themeMode), serializing to JSON and then deserializing SHALL produce an equivalent state object with all data preserved.

**Validates: Requirements 9.1, 9.2, 9.3, 9.4**

### Property 14: Malformed Data Recovery

*For any* JSON string that fails parsing or does not match the expected schema, the data loading function SHALL return the default application state without throwing unhandled exceptions.

**Validates: Requirements 2.6, 9.6**

### Property 15: Partial Data Restoration

*For any* valid JSON object missing one or more required fields (transactions, categories, budgetLimits, themeMode), the data loading function SHALL merge available data with default values for missing fields.

**Validates: Requirements 9.8**

## Deployment

### Deployment Requirements

- Static file hosting (no server-side processing)
- HTTPS recommended for security best practices
- No build process required
- No environment variables or configuration

### Deployment Options

1. **GitHub Pages**: Free, automatic deployment from repository
2. **Netlify/Vercel**: Free tier, drag-and-drop deployment
3. **Local File System**: Open index.html directly in browser
4. **Any Static Host**: AWS S3, Azure Blob Storage, etc.

### File Structure for Deployment

```
/
├── index.html
├── css/
│   └── styles.css
└── js/
    └── app.js
```

No build artifacts, no node_modules, no configuration files needed.

