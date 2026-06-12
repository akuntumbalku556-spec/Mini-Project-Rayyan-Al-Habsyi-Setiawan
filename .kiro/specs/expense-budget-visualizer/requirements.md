# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that enables users to track expenses, manage budgets, and visualize spending patterns. The application runs entirely in the browser using vanilla HTML, CSS, and JavaScript with no backend server, storing all data in browser Local Storage.

## Glossary

- **Application**: The Expense & Budget Visualizer web application
- **Transaction**: A single expense or income entry with item name, amount, and category
- **Category**: A classification for transactions (default: Food, Transport, Fun; user can add custom categories)
- **Local_Storage**: Browser-provided persistent storage API for client-side data
- **Total_Balance**: The sum of all transaction amounts
- **Budget_Limit**: A user-defined spending threshold for a category
- **Chart_Component**: Visual pie chart displaying spending distribution by category
- **Theme_Mode**: Visual appearance setting (light or dark)

## Requirements

### Requirement 1: Transaction Input

**User Story:** As a user, I want to input expense transactions with details, so that I can track my spending.

#### Acceptance Criteria

1. THE Application SHALL provide an input form with fields for Item_Name, Amount, and Category
2. WHEN the user submits a transaction with empty Item_Name, THE Application SHALL display a validation error message
3. WHEN the user submits a transaction with Item_Name containing only whitespace characters, THE Application SHALL display a validation error message
4. WHEN the user submits a transaction with Item_Name exceeding 100 characters, THE Application SHALL display a validation error message
5. WHEN the user submits a transaction with non-numeric Amount, THE Application SHALL display a validation error message
6. WHEN the user submits a transaction with Amount less than -999999999.99 or greater than 999999999.99, THE Application SHALL display a validation error message
7. WHEN the user submits a transaction without selecting a Category, THE Application SHALL display a validation error message
8. WHEN the user submits a transaction with valid data, THE Application SHALL store the transaction in Local_Storage
9. WHEN the user submits a transaction with valid data, THE Application SHALL add the transaction to the Transaction_List
10. WHEN the user submits a transaction with valid data, THE Application SHALL clear the input form fields

### Requirement 2: Transaction Display

**User Story:** As a user, I want to view all my transactions in a list, so that I can review my spending history.

#### Acceptance Criteria

1. THE Application SHALL display all stored transactions in a scrollable list in reverse chronological order (newest first)
2. FOR EACH transaction, THE Application SHALL display the Item_Name, Amount formatted to 2 decimal places, Category, and timestamp
3. WHEN a new transaction is added, THE Application SHALL update the Transaction_List within 100 milliseconds
4. THE Application SHALL load all transactions from Local_Storage when the page loads
5. WHEN Local_Storage contains no transactions, THE Application SHALL display the message "No transactions yet. Add your first expense to get started."
6. IF Local_Storage contains malformed transaction data, THE Application SHALL skip the malformed entry and display all valid transactions
7. WHEN a transaction is created, THE Application SHALL assign a timestamp in ISO 8601 format to that transaction

### Requirement 3: Transaction Deletion

**User Story:** As a user, I want to delete individual transactions, so that I can correct mistakes or remove unwanted entries.

#### Acceptance Criteria

1. FOR EACH transaction in the Transaction_List, THE Application SHALL provide a delete button
2. WHEN the user clicks a delete button, THE Application SHALL display a confirmation dialog with the message "Delete this transaction?"
3. WHEN the user confirms deletion, THE Application SHALL remove the transaction from Local_Storage
4. WHEN the user confirms deletion, THE Application SHALL remove the transaction from the Transaction_List within 100 milliseconds
5. WHEN the user cancels deletion, THE Application SHALL retain the transaction without changes
6. WHEN a transaction is deleted, THE Application SHALL update the Total_Balance within 100 milliseconds
7. WHEN a transaction is deleted, THE Application SHALL update the Chart_Component within 200 milliseconds
8. IF deletion from Local_Storage fails, THE Application SHALL display an error message and retain the transaction in the Transaction_List

### Requirement 4: Total Balance Calculation

**User Story:** As a user, I want to see my total balance automatically updated, so that I can understand my overall financial position.

#### Acceptance Criteria

1. THE Application SHALL display the Total_Balance at the top of the page, formatted to 2 decimal places
2. WHEN a transaction is added, THE Application SHALL recalculate and update the Total_Balance
3. WHEN a transaction is deleted, THE Application SHALL recalculate and update the Total_Balance
4. THE Application SHALL calculate Total_Balance as the sum of all transaction amounts, rounded to 2 decimal places using banker's rounding
5. WHEN no transactions exist, THE Application SHALL display Total_Balance as 0.00
6. WHEN Total_Balance is negative, THE Application SHALL display the value with a minus sign prefix

### Requirement 5: Category Management

**User Story:** As a user, I want to manage custom categories, so that I can organize transactions according to my needs.

#### Acceptance Criteria

1. THE Application SHALL provide default categories: Food, Transport, and Fun
2. THE Application SHALL allow users to add custom categories through a category management interface
3. WHEN a user adds a custom category with an empty name or only whitespace, THE Application SHALL display a validation error message
4. WHEN a user adds a custom category with a name exceeding 30 characters, THE Application SHALL display a validation error message
5. WHEN a user adds a custom category with a valid name, THE Application SHALL store it in Local_Storage
6. WHEN a user adds a custom category, THE Application SHALL make it available in the transaction input form
7. THE Application SHALL load all custom categories from Local_Storage when the page loads
8. WHEN a user attempts to add a category with a name that matches an existing category (case-insensitive), THE Application SHALL display an error message and prevent the addition
9. WHEN the total number of categories (default + custom) reaches 50, THE Application SHALL disable the add category function and display a message indicating the limit has been reached

### Requirement 6: Spending Visualization

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can visualize my spending patterns.

#### Acceptance Criteria

1. THE Application SHALL display a pie chart showing the distribution of positive transaction amounts by Category
2. WHEN a transaction is added, THE Application SHALL update the Chart_Component to reflect the new spending distribution
3. WHEN a transaction is deleted, THE Application SHALL update the Chart_Component to reflect the updated spending distribution
4. FOR EACH Category with positive spending, THE Chart_Component SHALL display the category name and total amount formatted to 2 decimal places
5. WHEN no transactions with positive amounts exist, THE Chart_Component SHALL display the message "No spending data to display"
6. WHEN a Category has only negative or zero amounts, THE Chart_Component SHALL exclude that Category from the chart

### Requirement 7: Budget Limit Alerts

**User Story:** As a user, I want to set budget limits for categories and receive alerts when exceeded, so that I can control my spending.

#### Acceptance Criteria

1. THE Application SHALL allow users to set a Budget_Limit for each Category through a budget management interface
2. WHEN a user sets a Budget_Limit with a value less than 0.01 or greater than 999999999.99, THE Application SHALL display a validation error message
3. WHEN a user sets a Budget_Limit with a non-numeric value, THE Application SHALL display a validation error message
4. WHEN a user sets a valid Budget_Limit, THE Application SHALL store it in Local_Storage
5. THE Application SHALL allow users to modify an existing Budget_Limit for a Category
6. THE Application SHALL allow users to delete a Budget_Limit for a Category
7. WHEN total spending in a Category is strictly greater than the Budget_Limit, THE Application SHALL apply a visual indicator (e.g., red border or background) to that category in the transaction list and chart
8. WHEN total spending in a Category exceeds the Budget_Limit after adding a transaction, THE Application SHALL display a notification message "Budget exceeded for [Category]: [Amount] / [Limit]"
9. WHEN the page loads and total spending in a Category exceeds the Budget_Limit, THE Application SHALL display the visual indicator for that category
10. THE Application SHALL load all Budget_Limits from Local_Storage when the page loads
11. WHEN a user views categories, THE Application SHALL display the Budget_Limit alongside the current spending for each category that has a limit set

### Requirement 8: Theme Toggle

**User Story:** As a user, I want to switch between light and dark modes, so that I can use the application comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE Application SHALL provide a visible theme toggle control (button or switch) for switching between light and dark Theme_Mode
2. WHEN the user activates the theme toggle, THE Application SHALL change the Theme_Mode to the alternate mode within 100 milliseconds
3. WHEN the user activates the theme toggle, THE Application SHALL apply observable visual changes (background color, text color, component colors) consistent with the new Theme_Mode
4. WHEN the user switches Theme_Mode, THE Application SHALL store the preference in Local_Storage
5. IF storing Theme_Mode preference to Local_Storage fails, THE Application SHALL still apply the Theme_Mode change to the current session
6. WHEN the page loads, THE Application SHALL apply the Theme_Mode from Local_Storage within 100 milliseconds
7. WHEN no Theme_Mode preference exists in Local_Storage, THE Application SHALL default to light mode

### Requirement 9: Data Persistence

**User Story:** As a user, I want my data to persist between sessions, so that I don't lose my transaction history.

#### Acceptance Criteria

1. THE Application SHALL store all transactions in Local_Storage after each modification
2. THE Application SHALL store all custom categories in Local_Storage after each modification
3. THE Application SHALL store all Budget_Limits in Local_Storage after each modification
4. THE Application SHALL store Theme_Mode preference in Local_Storage after each change
5. WHEN the page loads, THE Application SHALL restore all data from Local_Storage
6. IF Local_Storage contains data that fails JSON parsing or does not match the expected schema (missing required fields: transactions array, categories array, budgetLimits object, themeMode string), THE Application SHALL display an error message "Unable to load saved data" and initialize with default state (empty transactions, default categories, no budget limits, light theme)
7. IF Local_Storage is unavailable (disabled or quota exceeded), THE Application SHALL display an error message "Local storage is unavailable. Data will not be saved." and continue to function with in-memory data only
8. WHEN the page loads and Local_Storage contains partial data (e.g., transactions exist but categories are missing), THE Application SHALL load available data and use default values for missing data (default categories: Food, Transport, Fun; no budget limits; light theme)

### Requirement 10: Performance

**User Story:** As a user, I want the application to load quickly and respond instantly, so that I can track expenses efficiently.

#### Acceptance Criteria

1. WHEN the page is loaded on a connection with at least 25 Mbps download speed, THE Application SHALL reach DOM interactive state within 2 seconds
2. WHEN the user submits a transaction, THE Application SHALL update the Transaction_List and Total_Balance within 100 milliseconds
3. WHEN the user deletes a transaction, THE Application SHALL update the Transaction_List and Total_Balance within 100 milliseconds
4. WHEN the Application contains 1000 transactions, THE Application SHALL complete all operations (add transaction, delete transaction, calculate Total_Balance) within the time bounds specified in criteria 2 and 3
5. WHEN a transaction is added or deleted, THE Chart_Component SHALL complete its update within 200 milliseconds

### Requirement 11: Browser Compatibility

**User Story:** As a user, I want the application to work on modern browsers, so that I can access it from any device.

#### Acceptance Criteria

1. THE Application SHALL function correctly on the latest version of Chrome
2. THE Application SHALL function correctly on the latest version of Firefox
3. THE Application SHALL function correctly on the latest version of Edge
4. THE Application SHALL function correctly on the latest version of Safari
5. WHEN Local_Storage is not available, THE Application SHALL display an error message to the user

### Requirement 12: Code Organization

**User Story:** As a developer, I want clean and maintainable code structure, so that the codebase is easy to understand and modify.

#### Acceptance Criteria

1. THE Application SHALL contain all CSS styles in a single file located in the css/ folder
2. THE Application SHALL contain all JavaScript code in a single file located in the js/ folder
3. THE JavaScript code SHALL use clear function names and include comments for complex logic
4. THE CSS code SHALL use consistent naming conventions and be organized by component
5. THE HTML structure SHALL use semantic elements and maintain clear hierarchy
6. THE Application SHALL run without requiring any build tools, package managers, or compilation steps
7. THE Application SHALL not include any test framework setup or test files in the deliverable

### Requirement 13: User Interface Design

**User Story:** As a user, I want a clean and intuitive interface, so that I can use the application without confusion.

#### Acceptance Criteria

1. THE Application SHALL use a minimal and clean visual design
2. THE Application SHALL maintain clear visual hierarchy with the Total_Balance prominently displayed
3. THE Application SHALL use readable typography with appropriate font sizes and line heights
4. THE Application SHALL provide visual feedback for all user interactions (button clicks, form submissions)
5. THE Application SHALL use appropriate spacing and layout to prevent visual clutter
6. THE Application SHALL be responsive and usable on different screen sizes

