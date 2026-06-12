'use strict';

// ============================================
// Error Handler
// Categorizes, logs, and displays errors to the user
// Requirements: 2.6, 3.8, 9.6, 9.7
// ============================================

class ErrorHandler {
    // Error category constants
    static CATEGORY = {
        VALIDATION: 'validation',
        STORAGE: 'storage',
        DATA_CORRUPTION: 'data_corruption',
        PERFORMANCE: 'performance'
    };

    /**
     * Global error handler — determines category, logs, and displays the error.
     * @param {Error} error - The error object
     * @param {string} context - Human-readable description of where the error occurred
     */
    static handleError(error, context) {
        this.logError(error, context);

        // Determine category and appropriate user message
        if (error.name === 'QuotaExceededError') {
            // Storage quota exceeded — treat as storage error
            this.displayError(
                'Local storage is unavailable. Data will not be saved.',
                'warning'
            );
        } else if (error instanceof SyntaxError) {
            // JSON parse failure — treat as data corruption
            this.displayError(
                'Unable to load saved data',
                'error'
            );
        } else if (
            error.name === 'SecurityError' ||
            (error.message && error.message.toLowerCase().includes('localstorage'))
        ) {
            // Storage access denied / unavailable
            this.displayError(
                'Local storage is unavailable. Data will not be saved.',
                'warning'
            );
        } else {
            // Generic / unknown error
            this.displayError(
                `An error occurred (${context}). Please try again.`,
                'error'
            );
        }
    }

    /**
     * Dedicated storage error handler.
     * Displays the appropriate storage-specific message (Requirement 9.7).
     * @param {Error} error - Storage-related error object
     */
    static handleStorageError(error) {
        this.logError(error, ErrorHandler.CATEGORY.STORAGE);

        if (error instanceof SyntaxError) {
            // Malformed / corrupted data (Requirement 9.6)
            this.displayError('Unable to load saved data', 'error');
        } else {
            // Storage unavailable: quota exceeded, SecurityError, etc. (Requirement 9.7)
            this.displayError(
                'Local storage is unavailable. Data will not be saved.',
                'warning'
            );
        }
    }

    /**
     * Display a user-friendly error message with appropriate severity styling.
     * Uses UIController's banner elements; falls back to console if UIController
     * is not yet ready. Uses textContent to prevent XSS.
     * @param {string} message - User-facing error message
     * @param {'error'|'warning'|'info'} severity - Severity level
     */
    static displayError(message, severity = 'error') {
        // Delegate to UIController when available
        if (typeof UIController !== 'undefined' && UIController.elements) {
            if (severity === 'error') {
                // Use the error banner for errors
                const errorBanner = UIController.elements.errorBanner ||
                    document.getElementById('errorBanner');
                if (errorBanner) {
                    errorBanner.textContent = message; // textContent — no XSS risk
                    errorBanner.classList.add('visible');
                    setTimeout(() => errorBanner.classList.remove('visible'), 5000);
                    return;
                }
            } else {
                // Use the notification banner for warnings / info
                const notificationBanner = UIController.elements.notificationBanner ||
                    document.getElementById('notificationBanner');
                if (notificationBanner) {
                    notificationBanner.textContent = message; // textContent — no XSS risk
                    notificationBanner.classList.remove('success', 'warning', 'info');
                    notificationBanner.classList.add(severity);
                    notificationBanner.classList.add('visible');
                    const duration = severity === 'warning' ? 5000 : 3000;
                    setTimeout(() => notificationBanner.classList.remove('visible'), duration);
                    return;
                }
            }
        }

        // Fallback: try raw DOM access (e.g., before UIController is initialised)
        const errorBanner = document.getElementById('errorBanner');
        if (errorBanner) {
            errorBanner.textContent = message;
            errorBanner.classList.add('visible');
            setTimeout(() => errorBanner.classList.remove('visible'), 5000);
            return;
        }

        // Last resort: browser console
        console.error(`[ErrorHandler][${severity}] ${message}`);
    }

    /**
     * Log error details to the console for debugging.
     * @param {Error} error - The error object
     * @param {string} context - Where the error occurred
     */
    static logError(error, context) {
        console.error(`[ErrorHandler] Context: ${context}`, {
            name: error.name,
            message: error.message,
            stack: error.stack || '(no stack trace)'
        });
    }
}

// ============================================
// Storage Manager
// Handles all Local Storage interactions with error handling and fallback behavior
// ============================================

class StorageManager {
    static STORAGE_KEY = 'expense-budget-app-data';
    static STORAGE_VERSION = '1.0';
    
    /**
     * Check if Local Storage is available
     * @returns {boolean} True if Local Storage is available
     */
    static isAvailable() {
        try {
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, 'test');
            localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            return false;
        }
    }
    
    /**
     * Save application state to Local Storage
     * @param {Object} state - Application state object
     * @returns {boolean} True if save was successful
     */
    static saveState(state) {
        try {
            const dataToSave = {
                version: this.STORAGE_VERSION,
                ...state
            };
            const jsonString = JSON.stringify(dataToSave);
            localStorage.setItem(this.STORAGE_KEY, jsonString);
            return true;
        } catch (error) {
            this.handleStorageError(error);
            return false;
        }
    }
    
    /**
     * Load application state from Local Storage
     * @returns {Object|null} Application state or null if failed
     */
    static loadState() {
        try {
            const jsonString = localStorage.getItem(this.STORAGE_KEY);
            if (!jsonString) {
                return null;
            }
            
            const data = JSON.parse(jsonString);
            
            // Validate schema - must have required fields
            if (!data.hasOwnProperty('transactions') || 
                !data.hasOwnProperty('categories') || 
                !data.hasOwnProperty('budgetLimits') || 
                !data.hasOwnProperty('themeMode')) {
                
                // Partial data - merge with defaults
                return this.mergeWithDefaults(data);
            }
            
            // Return loaded state (without version field)
            return {
                transactions: data.transactions,
                categories: data.categories,
                budgetLimits: data.budgetLimits,
                themeMode: data.themeMode
            };
        } catch (error) {
            // JSON parsing failed or other error
            this.handleStorageError(error);
            return null;
        }
    }
    
    /**
     * Merge partial data with default values
     * @param {Object} partialData - Incomplete data from storage
     * @returns {Object} Complete state with defaults filled in
     */
    static mergeWithDefaults(partialData) {
        const defaults = this.getDefaultState();
        return {
            transactions: Array.isArray(partialData.transactions) ? partialData.transactions : defaults.transactions,
            categories: Array.isArray(partialData.categories) ? partialData.categories : defaults.categories,
            budgetLimits: typeof partialData.budgetLimits === 'object' ? partialData.budgetLimits : defaults.budgetLimits,
            themeMode: typeof partialData.themeMode === 'string' ? partialData.themeMode : defaults.themeMode
        };
    }
    
    /**
     * Get default application state
     * @returns {Object} Default state
     */
    static getDefaultState() {
        return {
            transactions: [],
            categories: ['Food', 'Transport', 'Fun'],
            budgetLimits: {},
            themeMode: 'light'
        };
    }
    
    /**
     * Handle storage errors — delegates to ErrorHandler for consistent error handling
     * @param {Error} error - Error object
     */
    static handleStorageError(error) {
        // Delegate to ErrorHandler for categorised logging and user-friendly display
        ErrorHandler.handleStorageError(error);
    }
}

// ============================================
// Validator
// Validates all user inputs before processing
// ============================================

class Validator {
    /**
     * Validate transaction input
     * @param {string} itemName - Item name
     * @param {string} amount - Amount as string
     * @param {string} category - Category name
     * @returns {Object} Validation result with isValid and errorMessage
     */
    static validateTransaction(itemName, amount, category) {
        // Validate item name
        const itemNameResult = this.validateItemName(itemName);
        if (!itemNameResult.isValid) {
            return itemNameResult;
        }
        
        // Validate amount
        const amountResult = this.validateAmount(amount);
        if (!amountResult.isValid) {
            return amountResult;
        }
        
        // Validate category
        if (!category || category.trim() === '') {
            return {
                isValid: false,
                errorMessage: 'Please select a category',
                field: 'category'
            };
        }
        
        return { isValid: true };
    }
    
    /**
     * Validate item name
     * @param {string} itemName - Item name to validate
     * @returns {Object} Validation result
     */
    static validateItemName(itemName) {
        // Check if empty
        if (!itemName || itemName.trim() === '') {
            return {
                isValid: false,
                errorMessage: 'Item name is required',
                field: 'itemName'
            };
        }
        
        // Check if only whitespace
        if (itemName.trim().length === 0) {
            return {
                isValid: false,
                errorMessage: 'Item name cannot contain only whitespace',
                field: 'itemName'
            };
        }
        
        // Check length
        if (itemName.length > 100) {
            return {
                isValid: false,
                errorMessage: 'Item name must not exceed 100 characters',
                field: 'itemName'
            };
        }
        
        return { isValid: true };
    }
    
    /**
     * Validate amount
     * @param {string} amount - Amount as string
     * @returns {Object} Validation result
     */
    static validateAmount(amount) {
        // Check if numeric
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount)) {
            return {
                isValid: false,
                errorMessage: 'Amount must be a valid number',
                field: 'amount'
            };
        }
        
        // Check range
        if (numAmount < -999999999.99 || numAmount > 999999999.99) {
            return {
                isValid: false,
                errorMessage: 'Amount must be between -999999999.99 and 999999999.99',
                field: 'amount'
            };
        }
        
        return { isValid: true };
    }
    
    /**
     * Validate category name
     * @param {string} name - Category name
     * @param {Array} existingCategories - List of existing categories
     * @returns {Object} Validation result
     */
    static validateCategory(name, existingCategories) {
        const sanitized = this.sanitizeString(name);
        
        // Check if empty or only whitespace
        if (!sanitized || sanitized.length === 0) {
            return {
                isValid: false,
                errorMessage: 'Category name is required'
            };
        }
        
        // Check length
        if (sanitized.length > 30) {
            return {
                isValid: false,
                errorMessage: 'Category name must not exceed 30 characters'
            };
        }
        
        // Check uniqueness (case-insensitive)
        const lowerName = sanitized.toLowerCase();
        const exists = existingCategories.some(cat => cat.toLowerCase() === lowerName);
        if (exists) {
            return {
                isValid: false,
                errorMessage: 'Category already exists'
            };
        }
        
        return { isValid: true, sanitizedName: sanitized };
    }
    
    /**
     * Validate budget limit
     * @param {string} amount - Budget limit as string
     * @returns {Object} Validation result
     */
    static validateBudgetLimit(amount) {
        // Check if numeric
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount)) {
            return {
                isValid: false,
                errorMessage: 'Budget limit must be a valid number'
            };
        }
        
        // Check range
        if (numAmount < 0.01 || numAmount > 999999999.99) {
            return {
                isValid: false,
                errorMessage: 'Budget limit must be between 0.01 and 999999999.99'
            };
        }
        
        return { isValid: true };
    }
    
    /**
     * Sanitize string by trimming and normalizing whitespace
     * @param {string} input - Input string
     * @returns {string} Sanitized string
     */
    static sanitizeString(input) {
        if (!input) return '';
        return input.trim().replace(/\s+/g, ' ');
    }
}

// ============================================
// Category Manager
// Manages category lifecycle and validation
// ============================================

class CategoryManager {
    static DEFAULT_CATEGORIES = ['Food', 'Transport', 'Fun'];
    static MAX_CATEGORIES = 50;
    
    /**
     * Add custom category
     * @param {string} name - Category name to add
     * @param {Array} existingCategories - Current list of categories
     * @returns {Array} Updated categories array
     */
    static addCategory(name, existingCategories) {
        const sanitized = Validator.sanitizeString(name);
        const updatedCategories = [...existingCategories, sanitized];
        return updatedCategories;
    }
    
    /**
     * Check if category exists (case-insensitive)
     * @param {string} name - Category name to check
     * @param {Array} categories - List of categories
     * @returns {boolean} True if category exists
     */
    static categoryExists(name, categories) {
        const lowerName = name.toLowerCase();
        return categories.some(cat => cat.toLowerCase() === lowerName);
    }
    
    /**
     * Check if category limit reached
     * @param {Array} categories - Current list of categories
     * @returns {boolean} True if limit is reached
     */
    static isLimitReached(categories) {
        return categories.length >= this.MAX_CATEGORIES;
    }
    
    /**
     * Get all categories (default + custom)
     * @returns {Array} All categories
     */
    static getCategories() {
        // This would be used in contexts where we need to retrieve from appState
        // For now, it's a placeholder method
        return appState.categories;
    }
}

// ============================================
// Budget Manager
// Manages budget limits and alerts
// ============================================

class BudgetManager {
    /**
     * Set budget limit for category
     * @param {string} category - Category name
     * @param {number} limit - Budget limit amount
     * @param {Object} budgetLimits - Current budget limits object
     * @returns {Object} Updated budget limits
     */
    static setBudgetLimit(category, limit, budgetLimits) {
        const updatedLimits = { ...budgetLimits };
        updatedLimits[category] = limit;
        return updatedLimits;
    }
    
    /**
     * Delete budget limit for category
     * @param {string} category - Category name
     * @param {Object} budgetLimits - Current budget limits object
     * @returns {Object} Updated budget limits
     */
    static deleteBudgetLimit(category, budgetLimits) {
        const updatedLimits = { ...budgetLimits };
        delete updatedLimits[category];
        return updatedLimits;
    }
    
    /**
     * Check if category exceeds budget
     * @param {string} category - Category name
     * @param {number} spending - Total spending for category
     * @param {Object} limits - Budget limits object
     * @returns {boolean} True if budget is exceeded
     */
    static isBudgetExceeded(category, spending, limits) {
        if (!limits.hasOwnProperty(category)) {
            return false;
        }
        
        const limit = limits[category];
        return spending > limit;
    }
    
    /**
     * Get all categories exceeding budget
     * @param {Map} spendingByCategory - Map of category to spending
     * @param {Object} limits - Budget limits object
     * @returns {Array} Array of category names exceeding budget
     */
    static getExceededCategories(spendingByCategory, limits) {
        const exceeded = [];
        
        for (const [category, spending] of spendingByCategory) {
            if (this.isBudgetExceeded(category, spending, limits)) {
                exceeded.push(category);
            }
        }
        
        return exceeded;
    }
    
    /**
     * Format budget alert message
     * @param {string} category - Category name
     * @param {number} spending - Total spending
     * @param {number} limit - Budget limit
     * @returns {string} Formatted alert message
     */
    static formatBudgetAlert(category, spending, limit) {
        return `Budget exceeded for ${category}: $${spending.toFixed(2)} / $${limit.toFixed(2)}`;
    }
}

// ============================================
// Theme Manager
// Manages theme switching and persistence
// ============================================

class ThemeManager {
    /**
     * Toggle between light and dark themes
     * @param {string} currentTheme - Current theme mode ('light' or 'dark')
     * @returns {string} New theme mode
     */
    static toggleTheme(currentTheme) {
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme(newTheme);
        return newTheme;
    }
    
    /**
     * Apply theme by setting data-theme attribute on root element
     * Optimized for 100ms performance requirement (Requirement 8.2)
     * @param {string} theme - Theme mode ('light' or 'dark')
     */
    static applyTheme(theme) {
        const html = document.documentElement;
        
        // Set data-theme attribute for CSS custom properties (Requirements 8.2, 8.3)
        // This triggers CSS custom property changes which are highly optimized
        html.setAttribute('data-theme', theme);
        
        // Force style recalculation to ensure immediate visual change
        // This ensures the theme change is visible within 100ms
        html.offsetHeight; // Trigger reflow
    }
    
    /**
     * Get system theme preference using media query
     * @returns {string} System theme preference ('light' or 'dark')
     */
    static getSystemTheme() {
        // Check for dark mode preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        
        // Default to light mode
        return 'light';
    }
    
    /**
     * Load theme preference from storage or fall back to system preference
     * @param {string|null} savedTheme - Saved theme preference from storage
     * @returns {string} Theme to apply ('light' or 'dark')
     */
    static loadTheme(savedTheme) {
        // Use saved theme if available, otherwise detect system preference
        return savedTheme || this.getSystemTheme();
    }
}

// ============================================
// Transaction Manager
// Manages transaction CRUD operations and business logic
// ============================================

class TransactionManager {
    /**
     * Generate unique ID using UUID v4 or fallback
     * @returns {string} Unique identifier
     */
    static generateId() {
        // Try crypto.randomUUID() first (modern browsers)
        if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
            return crypto.randomUUID();
        }
        
        // Fallback to manual UUID v4 generation
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    /**
     * Add new transaction
     * @param {string} itemName - Item name (already validated)
     * @param {number} amount - Transaction amount
     * @param {string} category - Category name
     * @returns {Object} New transaction object
     */
    static addTransaction(itemName, amount, category) {
        const transaction = {
            id: this.generateId(),
            itemName: Validator.sanitizeString(itemName),
            amount: this.roundToBankers(amount, 2),
            category: category,
            timestamp: new Date().toISOString()
        };
        
        return transaction;
    }
    
    /**
     * Delete transaction by ID
     * @param {string} id - Transaction ID
     * @param {Array} transactions - Array of transactions
     * @returns {boolean} True if deletion was successful
     */
    static deleteTransaction(id, transactions) {
        const index = transactions.findIndex(t => t.id === id);
        if (index === -1) {
            return false;
        }
        
        transactions.splice(index, 1);
        return true;
    }
    
    /**
     * Get all transactions
     * @param {Array} transactions - Array of transactions
     * @returns {Array} All transactions
     */
    static getTransactions(transactions) {
        return transactions;
    }
    
    /**
     * Get transactions sorted by timestamp (newest first)
     * @param {Array} transactions - Array of transactions
     * @returns {Array} Sorted transactions in reverse chronological order
     */
    static getTransactionsSorted(transactions) {
        return [...transactions].sort((a, b) => {
            // Compare ISO 8601 timestamps
            // Newer timestamps come first (descending order)
            return new Date(b.timestamp) - new Date(a.timestamp);
        });
    }
    
    /**
     * Calculate total balance from transactions
     * @param {Array} transactions - Array of transactions
     * @returns {number} Total balance rounded to 2 decimal places
     */
    static calculateTotalBalance(transactions) {
        if (!transactions || transactions.length === 0) {
            return 0.00;
        }
        
        const sum = transactions.reduce((total, transaction) => {
            return total + transaction.amount;
        }, 0);
        
        return this.roundToBankers(sum, 2);
    }
    
    /**
     * Get spending by category (positive amounts only)
     * @param {Array} transactions - Array of transactions
     * @returns {Map} Map of category to total positive spending
     */
    static getSpendingByCategory(transactions) {
        const spendingMap = new Map();
        
        if (!transactions || transactions.length === 0) {
            return spendingMap;
        }
        
        // Group by category and sum positive amounts
        transactions.forEach(transaction => {
            if (transaction.amount > 0) {
                const category = transaction.category;
                const currentTotal = spendingMap.get(category) || 0;
                const newTotal = currentTotal + transaction.amount;
                spendingMap.set(category, this.roundToBankers(newTotal, 2));
            }
        });
        
        return spendingMap;
    }
    
    /**
     * Round number using banker's rounding (round half to even)
     * @param {number} value - Value to round
     * @param {number} decimals - Number of decimal places
     * @returns {number} Rounded value
     */
    static roundToBankers(value, decimals) {
        const multiplier = Math.pow(10, decimals);
        const shifted = value * multiplier;
        const floor = Math.floor(shifted);
        const decimal = shifted - floor;
        
        // If exactly 0.5, round to nearest even number
        if (Math.abs(decimal - 0.5) < Number.EPSILON) {
            return (floor % 2 === 0 ? floor : floor + 1) / multiplier;
        }
        
        // Otherwise, use standard rounding
        return Math.round(shifted) / multiplier;
    }
}

// ============================================
// Chart Renderer
// Renders pie chart visualization of spending data
// ============================================

class ChartRenderer {
    /**
     * Initialize chart with canvas element
     * @param {HTMLCanvasElement} canvasElement - Canvas element for chart
     */
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.chartInstance = null;
    }
    
    /**
     * Update chart with new spending data
     * @param {Map} spendingByCategory - Map of category to spending amount
     * @param {Array} exceededCategories - Array of category names that exceeded budget
     */
    updateChart(spendingByCategory, exceededCategories = []) {
        // Filter to include only positive spending (Requirement 6.6)
        const positiveSpending = new Map();
        for (const [category, amount] of spendingByCategory) {
            if (amount > 0) {
                positiveSpending.set(category, amount);
            }
        }
        
        // Check if there's no spending data to display (Requirement 6.5)
        if (positiveSpending.size === 0) {
            this.clearChart();
            this.showEmptyMessage();
            return;
        }
        
        // Hide empty message
        this.hideEmptyMessage();
        
        // Prepare chart data
        const labels = [];
        const data = [];
        const backgroundColors = [];
        const borderColors = [];
        
        // Standard color palette
        const standardColors = [
            'rgba(255, 99, 132, 0.8)',   // Red
            'rgba(54, 162, 235, 0.8)',   // Blue
            'rgba(255, 206, 86, 0.8)',   // Yellow
            'rgba(75, 192, 192, 0.8)',   // Green
            'rgba(153, 102, 255, 0.8)',  // Purple
            'rgba(255, 159, 64, 0.8)',   // Orange
            'rgba(199, 199, 199, 0.8)',  // Gray
            'rgba(83, 102, 255, 0.8)',   // Indigo
            'rgba(255, 99, 255, 0.8)',   // Pink
            'rgba(99, 255, 132, 0.8)'    // Light Green
        ];
        
        // Color for budget exceeded categories (Requirement 7.7)
        const exceededColor = 'rgba(220, 53, 69, 0.8)'; // Red
        const exceededBorderColor = 'rgba(220, 53, 69, 1)';
        
        let colorIndex = 0;
        
        // Build chart data arrays
        for (const [category, amount] of positiveSpending) {
            labels.push(category);
            data.push(amount);
            
            // Use red color for exceeded categories, standard colors otherwise
            if (exceededCategories.includes(category)) {
                backgroundColors.push(exceededColor);
                borderColors.push(exceededBorderColor);
            } else {
                backgroundColors.push(standardColors[colorIndex % standardColors.length]);
                borderColors.push(standardColors[colorIndex % standardColors.length].replace('0.8', '1'));
                colorIndex++;
            }
        }
        
        // Chart configuration
        const config = {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: backgroundColors,
                    borderColor: borderColors,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            // Format amounts to 2 decimal places (Requirement 6.4)
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                return `${label}: $${value.toFixed(2)}`;
                            }
                        }
                    }
                }
            }
        };
        
        // Destroy existing chart instance if it exists
        if (this.chartInstance) {
            this.chartInstance.destroy();
        }
        
        // Create new chart instance
        const ctx = this.canvas.getContext('2d');
        this.chartInstance = new Chart(ctx, config);
    }
    
    /**
     * Clear chart and show empty message
     */
    clearChart() {
        if (this.chartInstance) {
            this.chartInstance.destroy();
            this.chartInstance = null;
        }
    }
    
    /**
     * Destroy chart instance (cleanup)
     */
    destroy() {
        this.clearChart();
    }
    
    /**
     * Show empty message when no spending data
     * Uses UIController cached element if available (Requirement 10.4)
     */
    showEmptyMessage() {
        const emptyMessage = (typeof UIController !== 'undefined' && UIController.elements.chartEmpty)
            ? UIController.elements.chartEmpty
            : document.getElementById('chartEmpty');
        if (emptyMessage) {
            emptyMessage.classList.add('visible');
        }
        
        // Hide canvas
        if (this.canvas) {
            this.canvas.style.display = 'none';
        }
    }
    
    /**
     * Hide empty message when there's spending data
     * Uses UIController cached element if available (Requirement 10.4)
     */
    hideEmptyMessage() {
        const emptyMessage = (typeof UIController !== 'undefined' && UIController.elements.chartEmpty)
            ? UIController.elements.chartEmpty
            : document.getElementById('chartEmpty');
        if (emptyMessage) {
            emptyMessage.classList.remove('visible');
        }
        
        // Show canvas
        if (this.canvas) {
            this.canvas.style.display = 'block';
        }
    }
}

// ============================================
// UI Controller
// Coordinates all UI updates and user interactions
// ============================================

class UIController {
    // Cached DOM element references for performance
    static elements = {};
    
    // Debounce timers for expensive operations
    static debounceTimers = {};
    
    /**
     * Initialize UI Controller and cache DOM element references
     * Sets up all event listeners and caches frequently accessed elements
     * Requirements: 2.3, 3.4, 10.2, 10.3
     */
    static init() {
        // Cache DOM element references for performance (Requirements 10.2, 10.3)
        this.cacheElements();
        
        // Set up all event listeners
        this.setupEventListeners();
        
        // Initialize theme
        this.initializeTheme();
    }
    
    /**
     * Cache frequently accessed DOM elements for performance
     * Reduces DOM queries and improves update speed
     * Requirements: 10.2, 10.3, 10.4
     */
    static cacheElements() {
        const elementsToCache = [
            'errorBanner',
            'notificationBanner', 
            'totalBalance',
            'transactionsList',
            'transactionForm',
            'categoryList',
            'budgetList',
            'themeToggle',
            'spendingChart',
            'chartEmpty',
            // Category management elements
            'addCategoryBtn',
            'categoryManagementError',
            // Transaction form category dropdown
            'category',
            // Field-level error spans
            'itemNameError',
            'amountError',
            'categoryError'
        ];
        
        // Cache elements
        elementsToCache.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                this.elements[id] = element;
            }
        });
        
        // Cache form input elements
        const formInputs = ['itemName', 'amount', 'newCategoryName', 'budgetCategory', 'budgetAmount'];
        formInputs.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                this.elements[id] = element;
            }
        });
        
        // Cache theme icon span (child of themeToggle)
        if (this.elements.themeToggle) {
            this.elements.themeIcon = this.elements.themeToggle.querySelector('.theme-icon');
        }
        
        // Cache error message elements
        const errorElements = document.querySelectorAll('.error-message');
        this.elements.errorMessages = Array.from(errorElements);
    }
    
    /**
     * Set up all event listeners for the application
     * Centralizes event handling for better coordination
     */
    static setupEventListeners() {
        // Theme toggle button
        if (this.elements.themeToggle) {
            this.elements.themeToggle.addEventListener('click', this.handleThemeToggle.bind(this));
            // Add keyboard support for theme toggle
            this.elements.themeToggle.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    this.handleThemeToggle(event);
                }
            });
        }
        
        // Transaction form submission
        if (this.elements.transactionForm) {
            this.elements.transactionForm.addEventListener('submit', this.handleTransactionSubmit.bind(this));
        }
        
        // Transaction delete buttons (using event delegation)
        if (this.elements.transactionsList) {
            this.elements.transactionsList.addEventListener('click', this.handleTransactionDelete.bind(this));
            // Add keyboard navigation for transaction list
            this.elements.transactionsList.addEventListener('keydown', this.handleTransactionListKeyboard.bind(this));
        }
        
        // Add category form (convert div to form for proper submit handling)
        const categoryForm = document.querySelector('.category-form');
        if (categoryForm && this.elements.newCategoryName) {
            // Handle form submission
            categoryForm.addEventListener('submit', (event) => {
                event.preventDefault();
                this.handleAddCategory();
            });
            
            // Add keyboard support for category input
            this.elements.newCategoryName.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    this.handleAddCategory();
                }
            });
        }
        
        // Add category button — use cached ref for performance (Requirement 10.2)
        const addCategoryBtn = this.elements.addCategoryBtn || document.getElementById('addCategoryBtn');
        if (addCategoryBtn) {
            addCategoryBtn.addEventListener('click', this.handleAddCategory.bind(this));
        }
        
        // Budget list event delegation for buttons
        if (this.elements.budgetList) {
            this.elements.budgetList.addEventListener('click', this.handleBudgetActions.bind(this));
            this.elements.budgetList.addEventListener('keydown', this.handleBudgetKeyboard.bind(this));
        }
        
        // Global keyboard navigation
        document.addEventListener('keydown', this.handleGlobalKeyboard.bind(this));
        
        // Form validation - update aria-invalid on input changes
        this.setupFormValidation();
    }
    
    /**
     * Render transaction list with optimized DOM updates
     * Updates only when necessary and uses DocumentFragment for performance
     * Requirements: 2.1, 2.2, 2.3, 2.5
     */
    static renderTransactionList(transactions = appState.transactions) {
        if (!this.elements.transactionsList) {
            return;
        }
        
        // Get transactions sorted in reverse chronological order (newest first)
        const sortedTransactions = TransactionManager.getTransactionsSorted(transactions);
        
        // Check if list is empty (Requirement 2.5)
        if (sortedTransactions.length === 0) {
            this.elements.transactionsList.innerHTML = 
                '<div class="empty-state">No transactions yet. Add your first expense to get started.</div>';
            return;
        }
        
        // Get exceeded categories for visual indicators (Requirement 7.9)
        const spendingByCategory = TransactionManager.getSpendingByCategory(transactions);
        const exceededCategories = BudgetManager.getExceededCategories(spendingByCategory, appState.budgetLimits);
        
        // Use DocumentFragment for efficient batch DOM updates (Performance optimization)
        const fragment = document.createDocumentFragment();
        
        // Build transaction items
        sortedTransactions.forEach(transaction => {
            const transactionElement = this.createTransactionElement(transaction, exceededCategories);
            fragment.appendChild(transactionElement);
        });
        
        // Single DOM update for performance
        this.elements.transactionsList.innerHTML = '';
        this.elements.transactionsList.appendChild(fragment);
    }
    
    /**
     * Create individual transaction element
     * @param {Object} transaction - Transaction object
     * @param {Array} exceededCategories - Categories that exceeded budget
     * @returns {HTMLElement} Transaction element
     */
    static createTransactionElement(transaction, exceededCategories) {
        const div = document.createElement('div');
        div.className = 'transaction-item';
        div.dataset.id = transaction.id;
        div.setAttribute('role', 'listitem');
        div.setAttribute('tabindex', '0');
        
        // Apply visual indicator if category is exceeded (Requirement 7.9)
        if (exceededCategories.includes(transaction.category)) {
            div.classList.add('budget-exceeded');
            div.setAttribute('aria-describedby', 'budget-exceeded-info');
        }
        
        // Create transaction details container
        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'transaction-details';
        
        // Create transaction name element - use textContent for security
        const nameDiv = document.createElement('div');
        nameDiv.className = 'transaction-name';
        nameDiv.textContent = transaction.itemName; // Use textContent instead of innerHTML
        
        // Create meta information container
        const metaDiv = document.createElement('div');
        metaDiv.className = 'transaction-meta';
        
        // Create category span - use textContent for security
        const categorySpan = document.createElement('span');
        categorySpan.className = 'transaction-category';
        categorySpan.textContent = transaction.category; // Use textContent instead of innerHTML
        
        // Create timestamp span
        const timestampSpan = document.createElement('span');
        timestampSpan.className = 'transaction-timestamp';
        timestampSpan.textContent = this.formatTimestamp(transaction.timestamp);
        
        // Create amount element
        const amountClass = transaction.amount >= 0 ? 'positive' : 'negative';
        const formattedAmount = this.formatAmount(transaction.amount);
        const amountDiv = document.createElement('div');
        amountDiv.className = `transaction-amount ${amountClass}`;
        amountDiv.textContent = `$${formattedAmount}`;
        
        // Create delete button with proper accessibility
        const deleteButton = document.createElement('button');
        deleteButton.className = 'btn btn-danger transaction-delete';
        deleteButton.setAttribute('data-id', transaction.id);
        deleteButton.setAttribute('aria-label', `Delete transaction: ${transaction.itemName}`);
        deleteButton.textContent = 'Delete';
        
        // Assemble the structure
        metaDiv.appendChild(categorySpan);
        metaDiv.appendChild(timestampSpan);
        detailsDiv.appendChild(nameDiv);
        detailsDiv.appendChild(metaDiv);
        
        div.appendChild(detailsDiv);
        div.appendChild(amountDiv);
        div.appendChild(deleteButton);
        
        return div;
    }
    
    /**
     * Update total balance display
     * Updates balance within 100ms performance requirement (Requirements 4.1-4.6)
     */
    static updateTotalBalance(transactions = appState.transactions) {
        if (!this.elements.totalBalance) {
            return;
        }
        
        // Calculate total balance using TransactionManager
        const balance = TransactionManager.calculateTotalBalance(transactions);
        
        // Format balance to 2 decimal places (Requirements 4.1, 4.2)
        const formattedBalance = balance.toFixed(2);
        
        // Update DOM element
        this.elements.totalBalance.textContent = `$${formattedBalance}`;
        
        // Apply or remove negative class based on balance (Requirement 4.6)
        if (balance < 0) {
            this.elements.totalBalance.classList.add('negative');
        } else {
            this.elements.totalBalance.classList.remove('negative');
        }
    }
    
    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    static showError(message) {
        if (!this.elements.errorBanner) {
            return;
        }
        
        this.elements.errorBanner.textContent = message;
        this.elements.errorBanner.classList.add('visible');
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.elements.errorBanner.classList.remove('visible');
        }, 5000);
    }
    
    /**
     * Show notification message with optional screen reader announcement
     * @param {string} message - Notification message to display
     * @param {string} type - Notification type ('success' or 'warning')
     * @param {boolean} announce - Whether to announce to screen readers
     */
    static showNotification(message, type = 'success', announce = true) {
        if (!this.elements.notificationBanner) {
            return;
        }
        
        this.elements.notificationBanner.textContent = message;
        
        // Remove existing type classes
        this.elements.notificationBanner.classList.remove('success', 'warning');
        
        // Add type-specific class
        this.elements.notificationBanner.classList.add(type);
        this.elements.notificationBanner.classList.add('visible');
        
        // For screen reader announcements
        if (announce) {
            this.elements.notificationBanner.setAttribute('aria-live', 'polite');
            this.elements.notificationBanner.setAttribute('role', 'status');
        }
        
        // Auto-hide after 3 seconds (or 5 seconds for warnings)
        const duration = type === 'warning' ? 5000 : 3000;
        setTimeout(() => {
            this.elements.notificationBanner.classList.remove('visible');
        }, duration);
    }
    
    /**
     * Clear form inputs
     * Clears the transaction form after successful submission
     */
    static clearForm() {
        if (this.elements.transactionForm) {
            this.elements.transactionForm.reset();
        }
        
        // Clear category form
        if (this.elements.newCategoryName) {
            this.elements.newCategoryName.value = '';
        }
        
        // Clear budget form
        if (this.elements.budgetCategory) {
            this.elements.budgetCategory.value = '';
        }
        if (this.elements.budgetAmount) {
            this.elements.budgetAmount.value = '';
        }
        
        // Clear any field errors
        this.clearFieldErrors();
    }
    
    /**
     * Show field-specific error
     * Uses cached element references where available (Requirement 10.2)
     * @param {string} field - Field name
     * @param {string} message - Error message
     */
    static showFieldError(field, message) {
        // Use cached element if available, fall back to DOM query
        const errorElement = this.elements[`${field}Error`] || document.getElementById(`${field}Error`);
        const inputElement = this.elements[field] || document.getElementById(field);
        
        if (errorElement) {
            errorElement.textContent = message;
        }
        
        // Update aria-invalid for accessibility
        if (inputElement) {
            inputElement.setAttribute('aria-invalid', 'true');
        }
    }
    
    /**
     * Clear all field errors
     */
    static clearFieldErrors() {
        if (this.elements.errorMessages) {
            this.elements.errorMessages.forEach(el => {
                el.textContent = '';
            });
        }
        
        // Reset aria-invalid for all form inputs
        const formInputs = document.querySelectorAll('input[aria-invalid], select[aria-invalid]');
        formInputs.forEach(input => {
            input.setAttribute('aria-invalid', 'false');
        });
    }
    
    /**
     * Debounced chart update for performance
     * Ensures chart updates don't happen too frequently (Requirements 10.2, 10.3)
     * @param {number} delay - Debounce delay in milliseconds (default: 200ms)
     */
    static updateChartDebounced(delay = 200) {
        // Clear existing timer
        if (this.debounceTimers.chartUpdate) {
            clearTimeout(this.debounceTimers.chartUpdate);
        }
        
        // Set new timer
        this.debounceTimers.chartUpdate = setTimeout(() => {
            this.updateChart();
        }, delay);
    }
    
    /**
     * Update spending chart immediately
     * Direct chart update without debouncing
     */
    static updateChart() {
        if (!chartRenderer) {
            return;
        }
        
        // Get spending by category (positive amounts only)
        const spendingByCategory = TransactionManager.getSpendingByCategory(appState.transactions);
        
        // Get exceeded categories for highlighting
        const exceededCategories = BudgetManager.getExceededCategories(spendingByCategory, appState.budgetLimits);
        
        // Update chart with new data
        chartRenderer.updateChart(spendingByCategory, exceededCategories);
    }
    
    /**
     * Coordinate all UI updates after transaction changes
     * Centralizes UI update coordination (Requirements 2.3, 3.4, 10.2, 10.3)
     */
    static updateAfterTransactionChange() {
        // Update UI components in order of priority
        this.renderTransactionList();
        this.updateTotalBalance();
        
        // Use debounced chart update for performance
        this.updateChartDebounced();
        
        // Check for exceeded budgets and show notifications
        this.checkAndNotifyBudgetExceeded();
    }
    
    /**
     * Check for exceeded budgets and display notifications
     */
    static checkAndNotifyBudgetExceeded() {
        // Get spending by category
        const spendingByCategory = TransactionManager.getSpendingByCategory(appState.transactions);
        
        // Get exceeded categories
        const exceededCategories = BudgetManager.getExceededCategories(spendingByCategory, appState.budgetLimits);
        
        // Display notification for each exceeded category (Requirements 7.7, 7.8)
        exceededCategories.forEach(category => {
            const spending = spendingByCategory.get(category);
            const limit = appState.budgetLimits[category];
            const message = BudgetManager.formatBudgetAlert(category, spending, limit);
            this.showNotification(message, 'warning');
        });
    }
    
    // ============================================
    // Keyboard Navigation & Accessibility Methods
    // ============================================
    
    /**
     * Handle global keyboard navigation
     * @param {KeyboardEvent} event - Keyboard event
     */
    static handleGlobalKeyboard(event) {
        // Escape key - close any active modals or clear form focus
        if (event.key === 'Escape') {
            // Clear focus from inputs
            if (document.activeElement && (
                document.activeElement.tagName === 'INPUT' || 
                document.activeElement.tagName === 'SELECT' ||
                document.activeElement.tagName === 'BUTTON'
            )) {
                document.activeElement.blur();
            }
        }
    }
    
    /**
     * Handle keyboard navigation in transaction list
     * @param {KeyboardEvent} event - Keyboard event
     */
    static handleTransactionListKeyboard(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            // If focused on a delete button, trigger click
            if (event.target.classList.contains('transaction-delete')) {
                event.preventDefault();
                event.target.click();
            }
        }
    }
    
    /**
     * Handle keyboard navigation in budget management
     * @param {KeyboardEvent} event - Keyboard event
     */
    static handleBudgetKeyboard(event) {
        if (event.key === 'Enter' || event.key === ' ') {
            // If focused on a budget button, trigger click
            if (event.target.classList.contains('budget-delete') || event.target.id === 'setBudgetBtn') {
                event.preventDefault();
                event.target.click();
            }
        }
    }
    
    /**
     * Setup form validation with accessibility features
     * Uses cached element references for performance (Requirement 10.2)
     */
    static setupFormValidation() {
        // Transaction form inputs — use cached refs where available
        const transactionInputs = ['itemName', 'amount', 'category'];
        transactionInputs.forEach(inputId => {
            const input = this.elements[inputId] || document.getElementById(inputId);
            if (input) {
                input.addEventListener('input', () => this.updateAriaInvalid(input));
                input.addEventListener('blur', () => this.updateAriaInvalid(input));
            }
        });
        
        // Category input — already in cache
        if (this.elements.newCategoryName) {
            this.elements.newCategoryName.addEventListener('input', () => this.updateAriaInvalid(this.elements.newCategoryName));
            this.elements.newCategoryName.addEventListener('blur', () => this.updateAriaInvalid(this.elements.newCategoryName));
        }
    }
    
    /**
     * Update aria-invalid attribute based on field validation
     * @param {HTMLElement} input - Input element to validate
     */
    static updateAriaInvalid(input) {
        if (!input) return;
        
        const value = input.value;
        // Use cached error element if available, fall back to DOM query
        const errorElement = (input.id && this.elements[`${input.id}Error`])
            ? this.elements[`${input.id}Error`]
            : document.getElementById(`${input.id}Error`);
        
        // Simple client-side validation for immediate feedback
        let isValid = true;
        
        if (input.hasAttribute('aria-required') && input.getAttribute('aria-required') === 'true') {
            if (!value || value.trim() === '') {
                isValid = false;
            }
        }
        
        // Update aria-invalid
        input.setAttribute('aria-invalid', isValid ? 'false' : 'true');
        
        // Update error element visibility for screen readers
        if (errorElement && !isValid && value.length > 0) {
            errorElement.setAttribute('aria-live', 'polite');
        }
    }

    // ============================================
    // Event Handlers
    // ============================================
    
    /**
     * Handle theme toggle button click
     */
    static handleThemeToggle(event) {
        event.preventDefault();
        
        // Toggle theme (Requirements 8.1, 8.2)
        const newTheme = ThemeManager.toggleTheme(appState.themeMode);
        appState.themeMode = newTheme;
        
        // Update theme icon immediately
        this.updateThemeIcon(newTheme);
        
        // Save to storage (Requirement 8.4)
        if (appState.isStorageAvailable) {
            const saveSuccess = StorageManager.saveState(appState);
            if (!saveSuccess) {
                // Theme still applies for this session even if save failed (Requirement 8.5)
                this.showError('Failed to save theme preference. Theme will reset on page reload.');
            }
        }
    }
    
    /**
     * Handle transaction form submission
     */
    static async handleTransactionSubmit(event) {
        event.preventDefault();
        
        // Clear previous errors
        this.clearFieldErrors();
        
        // Get form values
        const itemName = this.elements.itemName?.value || '';
        const amount = this.elements.amount?.value || '';
        const category = this.elements.category?.value || '';
        
        // Get submit button for loading state
        const submitButton = event.target.querySelector('button[type="submit"]');
        
        // Validate inputs
        const validation = Validator.validateTransaction(itemName, amount, category);
        if (!validation.isValid) {
            this.showFieldError(validation.field, validation.errorMessage);
            return;
        }
        
        try {
            // Show loading state on submit button
            this.setLoading(submitButton, true, 'Adding...');
            
            // Simulate async operation for visual feedback
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Create and add transaction
            const numAmount = parseFloat(amount);
            const newTransaction = TransactionManager.addTransaction(itemName, numAmount, category);
            appState.transactions.push(newTransaction);
            
            // Save to storage and handle errors gracefully
            let saveSuccess = true;
            if (appState.isStorageAvailable) {
                saveSuccess = StorageManager.saveState(appState);
                if (!saveSuccess) {
                    this.showError('Failed to save transaction to storage. Transaction is available for this session only.');
                }
            }
            
            // Update UI (coordinated updates)
            this.updateAfterTransactionChange();
            
            // Clear form
            this.clearForm();
            
            // Show success notification
            if (saveSuccess || !appState.isStorageAvailable) {
                this.showNotification('Transaction added successfully', 'success');
            }
            
        } catch (error) {
            this.showError('Failed to add transaction. Please try again.');
        } finally {
            // Always remove loading state
            this.setLoading(submitButton, false);
        }
    }
    
    /**
     * Handle transaction deletion (event delegation)
     */
    static async handleTransactionDelete(event) {
        // Check if delete button was clicked
        if (!event.target.classList.contains('transaction-delete')) {
            return;
        }
        
        const transactionId = event.target.getAttribute('data-id');
        if (!transactionId) {
            return;
        }
        
        // Show confirmation dialog (Requirement 3.2)
        const confirmed = window.confirm('Delete this transaction?');
        
        // Cancel flow - retain transaction (Requirement 3.5)
        if (!confirmed) {
            return;
        }
        
        const deleteButton = event.target;
        const transactionItem = deleteButton.closest('.transaction-item');
        
        try {
            // Show loading state on delete button and transaction item
            this.setLoading(deleteButton, true, 'Deleting...');
            if (transactionItem) {
                transactionItem.classList.add('loading');
            }
            
            // Simulate async operation for visual feedback
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Confirm flow - delete transaction (Requirements 3.3, 3.4)
            const success = TransactionManager.deleteTransaction(transactionId, appState.transactions);
            
            if (success) {
                // Save to storage and handle errors gracefully (Requirement 3.8)
                let saveSuccess = true;
                if (appState.isStorageAvailable) {
                    saveSuccess = StorageManager.saveState(appState);
                    if (!saveSuccess) {
                        this.showError('Failed to save deletion to storage. Change is available for this session only.');
                    }
                }
                
                // Update UI (coordinated updates)
                this.updateAfterTransactionChange();
                
                // Show success notification
                if (saveSuccess || !appState.isStorageAvailable) {
                    this.showNotification('Transaction deleted successfully', 'success');
                }
            } else {
                this.showError('Failed to delete transaction');
            }
        } catch (error) {
            this.showError('Failed to delete transaction. Please try again.');
        } finally {
            // Always remove loading states
            this.setLoading(deleteButton, false);
            if (transactionItem) {
                transactionItem.classList.remove('loading');
            }
        }
    }
    
    /**
     * Handle adding a new category
     */
    static async handleAddCategory() {
        // Use cached elements where available, fall back to DOM query
        const categoryError = this.elements.categoryManagementError || document.getElementById('categoryManagementError');
        const addCategoryBtn = this.elements.addCategoryBtn || document.getElementById('addCategoryBtn');
        
        if (!this.elements.newCategoryName || !categoryError) {
            return;
        }
        
        // Clear previous error
        categoryError.textContent = '';
        
        // Get input value
        const categoryName = this.elements.newCategoryName.value;
        
        // Check if limit is reached (Requirement 5.9)
        if (CategoryManager.isLimitReached(appState.categories)) {
            categoryError.textContent = 'Category limit reached (50 maximum)';
            return;
        }
        
        // Validate category name (Requirements 5.3, 5.4, 5.8)
        const validation = Validator.validateCategory(categoryName, appState.categories);
        if (!validation.isValid) {
            categoryError.textContent = validation.errorMessage;
            return;
        }
        
        try {
            // Show loading state on add button
            this.setLoading(addCategoryBtn, true, 'Adding...');
            
            // Simulate async operation for visual feedback
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Add category (Requirement 5.2)
            appState.categories = CategoryManager.addCategory(validation.sanitizedName, appState.categories);
            
            // Save to storage (Requirement 5.5)
            let saveSuccess = true;
            if (appState.isStorageAvailable) {
                saveSuccess = StorageManager.saveState(appState);
                if (!saveSuccess) {
                    this.showError('Failed to save category to storage. Category is available for this session only.');
                }
            }
            
            // Update UI (Requirement 5.6)
            populateCategoryDropdown();
            renderCategoryManagement();
            renderBudgetManagement();
            
            // Clear input
            this.elements.newCategoryName.value = '';
            
            // Show success notification
            if (saveSuccess || !appState.isStorageAvailable) {
                this.showNotification(`Category "${validation.sanitizedName}" added successfully`, 'success');
            }
        } catch (error) {
            this.showError('Failed to add category. Please try again.');
        } finally {
            // Always remove loading state
            this.setLoading(addCategoryBtn, false);
        }
    }
    
    /**
     * Handle budget management actions (event delegation)
     */
    static handleBudgetActions(event) {
        // Handle delete button clicks
        if (event.target.classList.contains('budget-delete')) {
            this.handleBudgetDelete(event);
        }
        
        // Handle set budget button clicks
        if (event.target && event.target.id === 'setBudgetBtn') {
            this.handleSetBudget();
        }
    }
    
    /**
     * Handle setting or updating a budget limit
     * Uses cached element references for performance (Requirement 10.2)
     */
    static handleSetBudget() {
        // budgetError is re-created each time renderBudgetManagement() runs,
        // so we must look it up dynamically here.
        const budgetError = document.getElementById('budgetError');
        
        if (!this.elements.budgetCategory || !this.elements.budgetAmount || !budgetError) {
            return;
        }
        
        // Clear previous error
        budgetError.textContent = '';
        
        // Get values
        const category = this.elements.budgetCategory.value;
        const amount = this.elements.budgetAmount.value;
        
        // Validate category selection
        if (!category || category.trim() === '') {
            budgetError.textContent = 'Please select a category';
            return;
        }
        
        // Validate budget limit amount (Requirements 7.2, 7.3)
        const validation = Validator.validateBudgetLimit(amount);
        if (!validation.isValid) {
            budgetError.textContent = validation.errorMessage;
            return;
        }
        
        // Set budget limit (Requirements 7.1, 7.5)
        const numAmount = parseFloat(amount);
        appState.budgetLimits = BudgetManager.setBudgetLimit(category, numAmount, appState.budgetLimits);
        
        // Save to storage (Requirement 7.4)
        let saveSuccess = true;
        if (appState.isStorageAvailable) {
            saveSuccess = StorageManager.saveState(appState);
            if (!saveSuccess) {
                this.showError('Failed to save budget limit to storage. Limit is available for this session only.');
            }
        }
        
        // Update UI
        renderBudgetManagement();
        this.updateChartDebounced();
        
        // Clear inputs
        this.elements.budgetCategory.value = '';
        this.elements.budgetAmount.value = '';
        
        // Show success notification
        if (saveSuccess || !appState.isStorageAvailable) {
            this.showNotification(`Budget limit set for ${category}: $${numAmount.toFixed(2)}`);
        }
    }
    
    /**
     * Handle deleting a budget limit
     */
    static handleBudgetDelete(event) {
        const category = event.target.getAttribute('data-category');
        if (!category) {
            return;
        }
        
        // Show confirmation dialog
        const confirmed = window.confirm(`Delete budget limit for ${category}?`);
        
        if (!confirmed) {
            return;
        }
        
        // Delete budget limit (Requirement 7.6)
        appState.budgetLimits = BudgetManager.deleteBudgetLimit(category, appState.budgetLimits);
        
        // Save to storage
        let saveSuccess = true;
        if (appState.isStorageAvailable) {
            saveSuccess = StorageManager.saveState(appState);
            if (!saveSuccess) {
                this.showError('Failed to save deletion to storage. Change is available for this session only.');
            }
        }
        
        // Update UI
        renderBudgetManagement();
        this.updateChartDebounced();
        
        // Show success notification
        if (saveSuccess || !appState.isStorageAvailable) {
            this.showNotification(`Budget limit deleted for ${category}`);
        }
    }
    
    // ============================================
    // Utility Methods
    // ============================================
    
    /**
     * Initialize theme on app startup
     */
    static initializeTheme() {
        // Apply saved theme or default to light
        const themeToApply = ThemeManager.loadTheme(appState.themeMode);
        appState.themeMode = themeToApply;
        ThemeManager.applyTheme(themeToApply);
        this.updateThemeIcon(themeToApply);
    }
    
    /**
     * Update theme toggle button icon and accessibility label
     * Uses cached element references for performance (Requirement 10.2)
     */
    static updateThemeIcon(theme) {
        const themeIcon = this.elements.themeIcon || document.querySelector('#themeToggle .theme-icon');
        const themeButton = this.elements.themeToggle || document.getElementById('themeToggle');
        
        if (themeIcon) {
            // Use sun icon for light theme, moon icon for dark theme
            themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
        }
        
        // Update aria-label for better accessibility
        if (themeButton) {
            const newLabel = theme === 'light' 
                ? 'Switch to dark theme' 
                : 'Switch to light theme';
            themeButton.setAttribute('aria-label', newLabel);
        }
    }
    
    /**
     * Format timestamp to readable format
     */
    static formatTimestamp(isoTimestamp) {
        const date = new Date(isoTimestamp);
        
        // Format: "Jan 15, 2024, 3:45 PM"
        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        };
        
        return date.toLocaleString('en-US', options);
    }
    
    /**
     * Format amount to currency string with 2 decimal places
     */
    static formatAmount(amount) {
        const sign = amount >= 0 ? '+' : '';
        return sign + amount.toFixed(2);
    }
    
    /**
     * Set loading state for elements
     * Shows loading indicators for operations >100ms
     * @param {HTMLElement|string} element - Element or element ID
     * @param {boolean} isLoading - Whether to show or hide loading state
     * @param {string} loadingText - Optional loading text to display
     */
    static setLoading(element, isLoading, loadingText = '') {
        let targetElement = element;
        
        // Handle element ID strings
        if (typeof element === 'string') {
            targetElement = document.getElementById(element);
        }
        
        if (!targetElement) return;
        
        if (isLoading) {
            // Add loading class
            targetElement.classList.add('loading');
            
            // Add loading spinner to buttons
            if (targetElement.tagName === 'BUTTON' || targetElement.classList.contains('btn')) {
                this.addLoadingSpinner(targetElement, loadingText);
            }
            
            // Add loading overlay to forms
            if (targetElement.tagName === 'FORM' || targetElement.classList.contains('form')) {
                targetElement.classList.add('form-loading');
            }
        } else {
            // Remove loading class
            targetElement.classList.remove('loading', 'form-loading');
            
            // Remove loading spinner from buttons
            if (targetElement.tagName === 'BUTTON' || targetElement.classList.contains('btn')) {
                this.removeLoadingSpinner(targetElement);
            }
        }
    }
    
    /**
     * Add loading spinner to button
     * @param {HTMLElement} button - Button element
     * @param {string} loadingText - Optional loading text
     */
    static addLoadingSpinner(button, loadingText = '') {
        if (!button.dataset.originalText) {
            button.dataset.originalText = button.textContent;
        }
        
        const spinner = document.createElement('span');
        spinner.className = 'loading-spinner';
        spinner.setAttribute('aria-hidden', 'true');
        
        const text = loadingText || button.dataset.originalText;
        button.innerHTML = '';
        button.appendChild(spinner);
        button.appendChild(document.createTextNode(text));
        
        // Update aria-label for accessibility
        button.setAttribute('aria-busy', 'true');
    }
    
    /**
     * Remove loading spinner from button
     * @param {HTMLElement} button - Button element
     */
    static removeLoadingSpinner(button) {
        if (button.dataset.originalText) {
            button.textContent = button.dataset.originalText;
            delete button.dataset.originalText;
        }
        
        // Remove aria-busy for accessibility
        button.removeAttribute('aria-busy');
    }
    
    /**
     * Show loading state with automatic timing
     * Automatically shows loading for operations that take >100ms
     * @param {Function} operation - Async operation to perform
     * @param {HTMLElement|string} element - Element to show loading on
     * @param {string} loadingText - Optional loading text
     */
    static async showLoadingIfNeeded(operation, element, loadingText = '') {
        const startTime = performance.now();
        let loadingShown = false;
        
        // Set a timeout to show loading after 100ms
        const loadingTimeout = setTimeout(() => {
            this.setLoading(element, true, loadingText);
            loadingShown = true;
        }, 100);
        
        try {
            const result = await operation();
            
            // Clear the timeout
            clearTimeout(loadingTimeout);
            
            // If loading was shown, hide it
            if (loadingShown) {
                this.setLoading(element, false);
            }
            
            return result;
        } catch (error) {
            // Clear timeout and hide loading on error
            clearTimeout(loadingTimeout);
            if (loadingShown) {
                this.setLoading(element, false);
            }
            throw error;
        }
    }
}

// ============================================
// Application Initialization
// ============================================

// Application state (in-memory)
let appState = {
    transactions: [],
    categories: ['Food', 'Transport', 'Fun'],
    budgetLimits: {},
    themeMode: 'light',
    isStorageAvailable: false
};

// Chart renderer instance (initialized after DOM ready)
let chartRenderer = null;

/**
 * Initialize application
 * Sequence (Requirements 2.4, 5.7, 7.10, 8.6, 9.5):
 *   1. Check storage availability — show warning if unavailable
 *   2. Load all persisted data from LocalStorage (transactions, categories, budgetLimits, themeMode)
 *   3. Apply theme immediately (within 100ms — Req 8.6)
 *   4. Initialize chart renderer
 *   5. Cache DOM elements and set up all event listeners
 *   6. Render initial UI state
 */
function initApp() {
    // ── Step 1: Storage check ────────────────────────────────────────────────
    appState.isStorageAvailable = StorageManager.isAvailable();

    if (!appState.isStorageAvailable) {
        // Use ErrorHandler for consistent storage unavailability message (Req 9.7)
        ErrorHandler.displayError('Local storage is unavailable. Data will not be saved.', 'warning');
    }

    // ── Step 2: Load all data from LocalStorage (Reqs 2.4, 5.7, 7.10, 9.5) ─
    if (appState.isStorageAvailable) {
        try {
            const savedState = StorageManager.loadState();
            if (savedState) {
                // Restore transactions, categories, budgetLimits, and themeMode
                appState = {
                    ...savedState,
                    isStorageAvailable: true
                };
            }
            // If savedState is null the defaults in appState remain intact;
            // any storage error is already reported inside StorageManager.loadState()
        } catch (error) {
            // Unexpected error during load — report and continue with defaults
            ErrorHandler.handleError(error, 'initApp — load state');
        }
    }

    // ── Step 3: Apply theme immediately (Req 8.6 — must happen within 100ms) ─
    // This runs synchronously before any heavy rendering work so the correct
    // theme is visible as early as possible.
    const themeToApply = ThemeManager.loadTheme(appState.themeMode);
    appState.themeMode = themeToApply;
    ThemeManager.applyTheme(themeToApply);

    // ── Step 4: Initialize chart renderer ───────────────────────────────────
    const chartCanvas = document.getElementById('spendingChart');
    if (chartCanvas) {
        chartRenderer = new ChartRenderer(chartCanvas);
    }

    // ── Step 5: Cache DOM elements + set up all event listeners ─────────────
    // UIController.init() calls cacheElements(), setupEventListeners(), and
    // initializeTheme() internally.  We pass the already-applied theme so the
    // icon and aria-label are set correctly without re-applying the theme.
    UIController.cacheElements();
    UIController.setupEventListeners();
    // Sync the toggle icon/aria-label with the theme that was already applied
    UIController.updateThemeIcon(appState.themeMode);

    // ── Step 6: Render initial state ────────────────────────────────────────
    // 6a. Transaction list (Req 2.4)
    UIController.renderTransactionList();

    // 6b. Total balance display
    UIController.updateTotalBalance();

    // 6c. Category dropdown (Req 5.7)
    populateCategoryDropdown();

    // 6d. Category management panel
    renderCategoryManagement();

    // 6e. Budget management panel (Req 7.10)
    renderBudgetManagement();

    // 6f. Budget-exceeded indicators (Req 7.9)
    UIController.checkAndNotifyBudgetExceeded();

    // 6g. Initial chart render
    UIController.updateChart();
}

/**
 * Populate category dropdown with current categories
 * Uses cached element reference if available (Requirement 10.2)
 */
function populateCategoryDropdown() {
    const categorySelect = UIController.elements.category || document.getElementById('category');
    if (!categorySelect) return;
    
    // Clear existing options except the first one
    categorySelect.innerHTML = '';
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- Select Category --';
    categorySelect.appendChild(defaultOption);
    
    // Add category options using textContent for security
    appState.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category; // Use textContent instead of innerHTML
        categorySelect.appendChild(option);
    });
}

/**
 * Render the category management UI
 * Shows list of all categories with count and limit display
 * Uses cached element references for performance (Requirement 10.2)
 */
function renderCategoryManagement() {
    const categoryList = UIController.elements.categoryList || document.getElementById('categoryList');
    if (!categoryList) return;
    
    // Get current count and check if limit is reached
    const currentCount = appState.categories.length;
    const maxCount = CategoryManager.MAX_CATEGORIES;
    const isLimitReached = CategoryManager.isLimitReached(appState.categories);
    
    // Clear existing content
    categoryList.innerHTML = '';
    
    // Build category count display
    const countDisplay = document.createElement('div');
    countDisplay.className = 'category-count';
    countDisplay.textContent = `${currentCount} / ${maxCount} categories`;
    
    // Build category tags
    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'category-tags-container';
    tagsContainer.setAttribute('role', 'list');
    tagsContainer.setAttribute('aria-label', 'Current categories');
    
    appState.categories.forEach(category => {
        const tag = document.createElement('span');
        tag.className = 'category-tag';
        tag.setAttribute('role', 'listitem');
        tag.textContent = category; // Use textContent instead of innerHTML for security
        tagsContainer.appendChild(tag);
    });
    
    // Assemble category list
    categoryList.appendChild(countDisplay);
    categoryList.appendChild(tagsContainer);
    
    // Update add button state
    const addCategoryBtn = UIController.elements.addCategoryBtn || document.getElementById('addCategoryBtn');
    if (addCategoryBtn) {
        if (isLimitReached) {
            addCategoryBtn.disabled = true;
            addCategoryBtn.setAttribute('aria-disabled', 'true');
            
            // Show limit message
            const categoryError = UIController.elements.categoryManagementError || document.getElementById('categoryManagementError');
            if (categoryError) {
                categoryError.textContent = 'Category limit reached (50 maximum)';
            }
        } else {
            addCategoryBtn.disabled = false;
            addCategoryBtn.setAttribute('aria-disabled', 'false');
            
            // Clear any limit message
            const categoryError = UIController.elements.categoryManagementError || document.getElementById('categoryManagementError');
            if (categoryError && categoryError.textContent.includes('limit reached')) {
                categoryError.textContent = '';
            }
        }
    }
}

/**
 * Render the budget management UI
 * Shows budget limit setting form and list of categories with their limits and spending
 * Uses cached element references for performance (Requirement 10.2)
 */
function renderBudgetManagement() {
    const budgetList = UIController.elements.budgetList || document.getElementById('budgetList');
    if (!budgetList) return;
    
    // Get spending by category
    const spendingByCategory = TransactionManager.getSpendingByCategory(appState.transactions);
    
    // Get exceeded categories
    const exceededCategories = BudgetManager.getExceededCategories(spendingByCategory, appState.budgetLimits);
    
    // Clear existing content
    budgetList.innerHTML = '';
    
    // Create budget setting form
    const formDiv = document.createElement('div');
    formDiv.className = 'budget-form';
    
    // Category selection
    const categoryGroup = document.createElement('div');
    categoryGroup.className = 'form-group';
    
    const categoryLabel = document.createElement('label');
    categoryLabel.setAttribute('for', 'budgetCategory');
    categoryLabel.textContent = 'Category';
    
    const categorySelect = document.createElement('select');
    categorySelect.id = 'budgetCategory';
    categorySelect.name = 'budgetCategory';
    categorySelect.setAttribute('aria-required', 'true');
    categorySelect.setAttribute('aria-describedby', 'budgetError');
    
    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = '-- Select Category --';
    categorySelect.appendChild(defaultOption);
    
    // Add category options using textContent for security
    appState.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category; // Use textContent instead of innerHTML
        categorySelect.appendChild(option);
    });
    
    // Amount input
    const amountGroup = document.createElement('div');
    amountGroup.className = 'form-group';
    
    const amountLabel = document.createElement('label');
    amountLabel.setAttribute('for', 'budgetAmount');
    amountLabel.textContent = 'Budget Limit';
    
    const amountInput = document.createElement('input');
    amountInput.type = 'number';
    amountInput.id = 'budgetAmount';
    amountInput.name = 'budgetAmount';
    amountInput.step = '0.01';
    amountInput.min = '0.01';
    amountInput.placeholder = 'e.g., 500.00';
    amountInput.setAttribute('aria-required', 'true');
    amountInput.setAttribute('aria-describedby', 'budgetError');
    
    // Set budget button
    const setBudgetBtn = document.createElement('button');
    setBudgetBtn.id = 'setBudgetBtn';
    setBudgetBtn.className = 'btn btn-primary';
    setBudgetBtn.textContent = 'Set Budget';
    setBudgetBtn.setAttribute('aria-describedby', 'budgetError');
    
    // Error message
    const errorSpan = document.createElement('span');
    errorSpan.id = 'budgetError';
    errorSpan.className = 'error-message';
    errorSpan.setAttribute('role', 'alert');
    errorSpan.setAttribute('aria-live', 'polite');
    
    // Assemble form
    categoryGroup.appendChild(categoryLabel);
    categoryGroup.appendChild(categorySelect);
    amountGroup.appendChild(amountLabel);
    amountGroup.appendChild(amountInput);
    
    formDiv.appendChild(categoryGroup);
    formDiv.appendChild(amountGroup);
    formDiv.appendChild(setBudgetBtn);
    formDiv.appendChild(errorSpan);
    
    // Create budget items list
    const itemsList = document.createElement('div');
    itemsList.className = 'budget-items-list';
    itemsList.setAttribute('role', 'list');
    
    // Display each category with its limit and spending
    if (appState.categories.length > 0) {
        appState.categories.forEach(category => {
            const spending = spendingByCategory.get(category) || 0;
            const limit = appState.budgetLimits[category];
            const hasLimit = limit !== undefined;
            const isExceeded = exceededCategories.includes(category);
            
            // Create budget item
            const item = document.createElement('div');
            item.className = `budget-item${isExceeded ? ' exceeded' : ''}`;
            item.setAttribute('data-category', category);
            item.setAttribute('role', 'listitem');
            
            // Budget info container
            const infoDiv = document.createElement('div');
            infoDiv.className = 'budget-info';
            
            // Category name - use textContent for security
            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'budget-category';
            categoryDiv.textContent = category; // Use textContent instead of innerHTML
            
            // Budget amounts
            const amountsDiv = document.createElement('div');
            amountsDiv.className = 'budget-amounts';
            
            const spendingSpan = document.createElement('span');
            spendingSpan.className = 'budget-spending';
            spendingSpan.textContent = `Spending: $${spending.toFixed(2)}`;
            
            const limitSpan = document.createElement('span');
            limitSpan.className = 'budget-limit';
            limitSpan.textContent = hasLimit ? `Limit: $${limit.toFixed(2)}` : 'No limit set';
            
            amountsDiv.appendChild(spendingSpan);
            amountsDiv.appendChild(limitSpan);
            
            infoDiv.appendChild(categoryDiv);
            infoDiv.appendChild(amountsDiv);
            
            // Budget controls
            const controlsDiv = document.createElement('div');
            controlsDiv.className = 'budget-controls';
            
            if (hasLimit) {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'btn btn-danger budget-delete';
                deleteBtn.setAttribute('data-category', category);
                deleteBtn.setAttribute('aria-label', `Delete budget limit for ${category}`);
                deleteBtn.textContent = 'Delete Limit';
                controlsDiv.appendChild(deleteBtn);
            }
            
            item.appendChild(infoDiv);
            item.appendChild(controlsDiv);
            
            itemsList.appendChild(item);
        });
    } else {
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.textContent = 'No categories available. Add categories first.';
        itemsList.appendChild(emptyState);
    }
    
    // Assemble final structure
    budgetList.appendChild(formDiv);
    budgetList.appendChild(itemsList);
    
    // Update cached elements for new form inputs
    UIController.elements.budgetCategory = categorySelect;
    UIController.elements.budgetAmount = amountInput;
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
