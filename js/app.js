'use strict';

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
     * Handle storage errors
     * @param {Error} error - Error object
     */
    static handleStorageError(error) {
        console.error('Storage error:', error);
        
        // Display error message to user based on error type
        if (error.name === 'QuotaExceededError') {
            UIController.showError('Local storage quota exceeded. Data will not be saved.');
        } else if (error instanceof SyntaxError) {
            UIController.showError('Unable to load saved data - data is corrupted.');
        } else {
            UIController.showError('Local storage is unavailable. Data will not be saved.');
        }
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
// UI Controller
// Manages UI updates and user interactions
// ============================================

class UIController {
    /**
     * Show error message
     * @param {string} message - Error message to display
     */
    static showError(message) {
        const errorBanner = document.getElementById('errorBanner');
        if (errorBanner) {
            errorBanner.textContent = message;
            errorBanner.classList.add('visible');
            
            // Auto-hide after 5 seconds
            setTimeout(() => {
                errorBanner.classList.remove('visible');
            }, 5000);
        }
    }
    
    /**
     * Show notification message
     * @param {string} message - Notification message to display
     * @param {string} type - Notification type ('success' or 'warning')
     */
    static showNotification(message, type = 'success') {
        const notificationBanner = document.getElementById('notificationBanner');
        if (notificationBanner) {
            notificationBanner.textContent = message;
            
            // Remove existing type classes
            notificationBanner.classList.remove('success', 'warning');
            
            // Add type-specific class
            notificationBanner.classList.add(type);
            notificationBanner.classList.add('visible');
            
            // Auto-hide after 3 seconds (or 5 seconds for warnings)
            const duration = type === 'warning' ? 5000 : 3000;
            setTimeout(() => {
                notificationBanner.classList.remove('visible');
            }, duration);
        }
    }
    
    /**
     * Show field-specific error
     * @param {string} field - Field name
     * @param {string} message - Error message
     */
    static showFieldError(field, message) {
        const errorElement = document.getElementById(`${field}Error`);
        if (errorElement) {
            errorElement.textContent = message;
        }
    }
    
    /**
     * Clear all field errors
     */
    static clearFieldErrors() {
        const errorElements = document.querySelectorAll('.error-message');
        errorElements.forEach(el => {
            el.textContent = '';
        });
    }
}

// ============================================
// Transaction List Renderer
// Handles rendering of transaction list UI
// ============================================

/**
 * Format timestamp to readable format
 * @param {string} isoTimestamp - ISO 8601 timestamp
 * @returns {string} Formatted date and time string
 */
function formatTimestamp(isoTimestamp) {
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
 * @param {number} amount - Amount to format
 * @returns {string} Formatted amount string
 */
function formatAmount(amount) {
    const sign = amount >= 0 ? '+' : '';
    return sign + amount.toFixed(2);
}

/**
 * Render the transaction list
 * Updates the transaction list UI based on current appState.transactions
 */
function renderTransactionList() {
    const transactionsList = document.getElementById('transactionsList');
    
    if (!transactionsList) {
        return;
    }
    
    // Get transactions sorted in reverse chronological order (newest first)
    const sortedTransactions = TransactionManager.getTransactionsSorted(appState.transactions);
    
    // Check if list is empty
    if (sortedTransactions.length === 0) {
        transactionsList.innerHTML = '<div class="empty-state">No transactions yet. Add your first expense to get started.</div>';
        return;
    }
    
    // Get exceeded categories for visual indicators (Requirement 7.9)
    const spendingByCategory = TransactionManager.getSpendingByCategory(appState.transactions);
    const exceededCategories = BudgetManager.getExceededCategories(spendingByCategory, appState.budgetLimits);
    
    // Build HTML for transaction items
    let html = '';
    sortedTransactions.forEach(transaction => {
        const amountClass = transaction.amount >= 0 ? 'positive' : 'negative';
        const formattedAmount = formatAmount(transaction.amount);
        const formattedTimestamp = formatTimestamp(transaction.timestamp);
        
        // Apply visual indicator if category is exceeded (Requirement 7.9)
        const isExceeded = exceededCategories.includes(transaction.category);
        const exceededClass = isExceeded ? 'budget-exceeded' : '';
        
        html += `
            <div class="transaction-item ${exceededClass}" data-id="${transaction.id}">
                <div class="transaction-details">
                    <div class="transaction-name">${escapeHtml(transaction.itemName)}</div>
                    <div class="transaction-meta">
                        <span class="transaction-category">${escapeHtml(transaction.category)}</span>
                        <span class="transaction-timestamp">${formattedTimestamp}</span>
                    </div>
                </div>
                <div class="transaction-amount ${amountClass}">$${formattedAmount}</div>
                <button class="btn btn-danger transaction-delete" data-id="${transaction.id}" aria-label="Delete transaction">Delete</button>
            </div>
        `;
    });
    
    transactionsList.innerHTML = html;
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Update total balance display
 * Updates the balance display element with the current total balance
 * Applies negative class styling when balance is negative
 */
function updateTotalBalance() {
    const totalBalanceElement = document.getElementById('totalBalance');
    
    if (!totalBalanceElement) {
        return;
    }
    
    // Calculate total balance using TransactionManager
    const balance = TransactionManager.calculateTotalBalance(appState.transactions);
    
    // Format balance to 2 decimal places with proper sign
    // For negative numbers, the minus sign will be included automatically by toFixed
    const formattedBalance = balance.toFixed(2);
    
    // Update DOM element
    totalBalanceElement.textContent = `$${formattedBalance}`;
    
    // Apply or remove negative class based on balance
    if (balance < 0) {
        totalBalanceElement.classList.add('negative');
    } else {
        totalBalanceElement.classList.remove('negative');
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

/**
 * Initialize application
 */
function initApp() {
    // Check Local Storage availability
    appState.isStorageAvailable = StorageManager.isAvailable();
    
    if (!appState.isStorageAvailable) {
        UIController.showError('Local storage is unavailable. Data will not be saved.');
    }
    
    // Load saved state
    if (appState.isStorageAvailable) {
        const savedState = StorageManager.loadState();
        if (savedState) {
            appState = {
                ...savedState,
                isStorageAvailable: true
            };
        } else {
            // No saved state or error loading - use defaults
            // Error message already shown by StorageManager if there was an error
        }
    }
    
    // Initialize UI components
    renderTransactionList();
    populateCategoryDropdown();
    renderCategoryManagement();
    renderBudgetManagement();
    updateTotalBalance();
    
    // Check for exceeded budgets on page load (Requirement 7.9)
    checkAndNotifyBudgetExceeded();
    
    // Set up event listeners
    setupEventListeners();
    
    console.log('Expense & Budget Visualizer initialized');
    console.log('Storage available:', appState.isStorageAvailable);
    console.log('Current state:', appState);
}

/**
 * Populate category dropdown with current categories
 */
function populateCategoryDropdown() {
    const categorySelect = document.getElementById('category');
    if (!categorySelect) return;
    
    // Clear existing options except the first one
    categorySelect.innerHTML = '<option value="">-- Select Category --</option>';
    
    // Add category options
    appState.categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });
}

/**
 * Render the category management UI
 * Shows list of all categories with count and limit display
 */
function renderCategoryManagement() {
    const categoryList = document.getElementById('categoryList');
    if (!categoryList) return;
    
    // Get current count and check if limit is reached
    const currentCount = appState.categories.length;
    const maxCount = CategoryManager.MAX_CATEGORIES;
    const isLimitReached = CategoryManager.isLimitReached(appState.categories);
    
    // Build category count display
    const countDisplay = document.createElement('div');
    countDisplay.className = 'category-count';
    countDisplay.textContent = `${currentCount} / ${maxCount} categories`;
    
    // Build category tags
    const tagsContainer = document.createElement('div');
    tagsContainer.className = 'category-tags-container';
    
    appState.categories.forEach(category => {
        const tag = document.createElement('span');
        tag.className = 'category-tag';
        tag.textContent = category;
        tagsContainer.appendChild(tag);
    });
    
    // Clear and update category list
    categoryList.innerHTML = '';
    categoryList.appendChild(countDisplay);
    categoryList.appendChild(tagsContainer);
    
    // Update add button state
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    if (addCategoryBtn) {
        if (isLimitReached) {
            addCategoryBtn.disabled = true;
            
            // Show limit message
            const categoryError = document.getElementById('categoryManagementError');
            if (categoryError) {
                categoryError.textContent = 'Category limit reached (50 maximum)';
            }
        } else {
            addCategoryBtn.disabled = false;
            
            // Clear any limit message
            const categoryError = document.getElementById('categoryManagementError');
            if (categoryError && categoryError.textContent.includes('limit reached')) {
                categoryError.textContent = '';
            }
        }
    }
}

/**
 * Check for exceeded budgets and display notifications
 * Shows alert for each category that has exceeded its budget limit (Requirements 7.7, 7.8, 7.9)
 */
function checkAndNotifyBudgetExceeded() {
    // Get spending by category
    const spendingByCategory = TransactionManager.getSpendingByCategory(appState.transactions);
    
    // Get exceeded categories
    const exceededCategories = BudgetManager.getExceededCategories(spendingByCategory, appState.budgetLimits);
    
    // Display notification for each exceeded category (Requirements 7.7, 7.8)
    exceededCategories.forEach(category => {
        const spending = spendingByCategory.get(category);
        const limit = appState.budgetLimits[category];
        const message = BudgetManager.formatBudgetAlert(category, spending, limit);
        UIController.showNotification(message, 'warning');
    });
}

/**
 * Render the budget management UI
 * Shows budget limit setting form and list of categories with their limits and spending
 */
function renderBudgetManagement() {
    const budgetList = document.getElementById('budgetList');
    if (!budgetList) return;
    
    // Get spending by category
    const spendingByCategory = TransactionManager.getSpendingByCategory(appState.transactions);
    
    // Get exceeded categories
    const exceededCategories = BudgetManager.getExceededCategories(spendingByCategory, appState.budgetLimits);
    
    // Build budget setting form
    let html = `
        <div class="budget-form">
            <div class="form-group">
                <label for="budgetCategory">Category</label>
                <select id="budgetCategory" name="budgetCategory">
                    <option value="">-- Select Category --</option>
                    ${appState.categories.map(cat => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label for="budgetAmount">Budget Limit</label>
                <input 
                    type="number" 
                    id="budgetAmount" 
                    name="budgetAmount"
                    step="0.01"
                    min="0.01"
                    placeholder="e.g., 500.00"
                >
            </div>
            <button id="setBudgetBtn" class="btn btn-primary">Set Budget</button>
            <span id="budgetError" class="error-message" role="alert"></span>
        </div>
        <div class="budget-items-list">
    `;
    
    // Display each category with its limit and spending
    if (appState.categories.length > 0) {
        appState.categories.forEach(category => {
            const spending = spendingByCategory.get(category) || 0;
            const limit = appState.budgetLimits[category];
            const hasLimit = limit !== undefined;
            const isExceeded = exceededCategories.includes(category);
            const exceededClass = isExceeded ? 'exceeded' : '';
            
            html += `
                <div class="budget-item ${exceededClass}" data-category="${escapeHtml(category)}">
                    <div class="budget-info">
                        <div class="budget-category">${escapeHtml(category)}</div>
                        <div class="budget-amounts">
                            <span class="budget-spending">Spending: $${spending.toFixed(2)}</span>
                            ${hasLimit ? `<span class="budget-limit">Limit: $${limit.toFixed(2)}</span>` : '<span class="budget-limit">No limit set</span>'}
                        </div>
                    </div>
                    <div class="budget-controls">
                        ${hasLimit ? `<button class="btn btn-danger budget-delete" data-category="${escapeHtml(category)}">Delete Limit</button>` : ''}
                    </div>
                </div>
            `;
        });
    } else {
        html += '<div class="empty-state">No categories available. Add categories first.</div>';
    }
    
    html += '</div>';
    
    budgetList.innerHTML = html;
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Transaction form submission
    const transactionForm = document.getElementById('transactionForm');
    if (transactionForm) {
        transactionForm.addEventListener('submit', handleTransactionSubmit);
    }
    
    // Transaction delete buttons (using event delegation)
    const transactionsList = document.getElementById('transactionsList');
    if (transactionsList) {
        transactionsList.addEventListener('click', handleTransactionDelete);
    }
    
    // Add category button
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', handleAddCategory);
    }
    
    // Category input - allow Enter key to add category
    const newCategoryInput = document.getElementById('newCategoryName');
    if (newCategoryInput) {
        newCategoryInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                handleAddCategory();
            }
        });
    }
    
    // Budget list event delegation for delete buttons
    const budgetList = document.getElementById('budgetList');
    if (budgetList) {
        budgetList.addEventListener('click', (event) => {
            // Handle delete button clicks
            handleBudgetDelete(event);
            
            // Handle set budget button clicks (re-attached when rendered)
            if (event.target && event.target.id === 'setBudgetBtn') {
                handleSetBudget();
            }
        });
    }
}

/**
 * Handle transaction form submission
 * @param {Event} event - Form submit event
 */
function handleTransactionSubmit(event) {
    event.preventDefault();
    
    // Clear previous errors
    UIController.clearFieldErrors();
    
    // Get form values
    const itemName = document.getElementById('itemName').value;
    const amount = document.getElementById('amount').value;
    const category = document.getElementById('category').value;
    
    // Validate inputs
    const validation = Validator.validateTransaction(itemName, amount, category);
    if (!validation.isValid) {
        UIController.showFieldError(validation.field, validation.errorMessage);
        return;
    }
    
    // Create and add transaction
    const numAmount = parseFloat(amount);
    const newTransaction = TransactionManager.addTransaction(itemName, numAmount, category);
    appState.transactions.push(newTransaction);
    
    // Save to storage and handle errors gracefully
    let saveSuccess = true;
    if (appState.isStorageAvailable) {
        saveSuccess = StorageManager.saveState(appState);
        if (!saveSuccess) {
            // Storage failed - show error but keep transaction in memory
            UIController.showError('Failed to save transaction to storage. Transaction is available for this session only.');
        }
    }
    
    // Update UI within 100ms (synchronous calls are well under 100ms)
    renderTransactionList();
    updateTotalBalance();
    
    // Check for exceeded budgets and show notifications (Requirements 7.7, 7.8)
    checkAndNotifyBudgetExceeded();
    
    // Clear form
    event.target.reset();
    
    // Show success notification only if save succeeded or storage is not available
    if (saveSuccess || !appState.isStorageAvailable) {
        UIController.showNotification('Transaction added successfully');
    }
}

/**
 * Handle transaction deletion (event delegation)
 * @param {Event} event - Click event
 */
function handleTransactionDelete(event) {
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
    
    // Confirm flow - delete transaction (Requirements 3.3, 3.4)
    const success = TransactionManager.deleteTransaction(transactionId, appState.transactions);
    
    if (success) {
        // Save to storage and handle errors gracefully (Requirement 3.8)
        let saveSuccess = true;
        if (appState.isStorageAvailable) {
            saveSuccess = StorageManager.saveState(appState);
            if (!saveSuccess) {
                // Storage failed - show error but transaction is deleted from memory
                UIController.showError('Failed to save deletion to storage. Change is available for this session only.');
            }
        }
        
        // Update UI within 100ms (Requirements 3.4, 3.6)
        // Synchronous calls are well under 100ms
        renderTransactionList();
        updateTotalBalance();
        
        // Check for exceeded budgets and show notifications (Requirements 7.7, 7.8)
        checkAndNotifyBudgetExceeded();
        
        // Show success notification only if save succeeded or storage is not available
        if (saveSuccess || !appState.isStorageAvailable) {
            UIController.showNotification('Transaction deleted successfully');
        }
    } else {
        UIController.showError('Failed to delete transaction');
    }
}

/**
 * Handle adding a new category
 * Validates input, adds category to appState, updates UI and storage
 */
function handleAddCategory() {
    const newCategoryInput = document.getElementById('newCategoryName');
    const categoryError = document.getElementById('categoryManagementError');
    
    if (!newCategoryInput || !categoryError) {
        return;
    }
    
    // Clear previous error
    categoryError.textContent = '';
    
    // Get input value
    const categoryName = newCategoryInput.value;
    
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
    
    // Add category (Requirement 5.2)
    appState.categories = CategoryManager.addCategory(validation.sanitizedName, appState.categories);
    
    // Save to storage (Requirement 5.5)
    let saveSuccess = true;
    if (appState.isStorageAvailable) {
        saveSuccess = StorageManager.saveState(appState);
        if (!saveSuccess) {
            UIController.showError('Failed to save category to storage. Category is available for this session only.');
        }
    }
    
    // Update UI (Requirement 5.6)
    populateCategoryDropdown();
    renderCategoryManagement();
    renderBudgetManagement();
    
    // Clear input
    newCategoryInput.value = '';
    
    // Show success notification
    if (saveSuccess || !appState.isStorageAvailable) {
        UIController.showNotification(`Category "${validation.sanitizedName}" added successfully`);
    }
}

/**
 * Handle setting or updating a budget limit
 * Validates input, sets budget limit in appState, updates UI and storage
 */
function handleSetBudget() {
    const budgetCategorySelect = document.getElementById('budgetCategory');
    const budgetAmountInput = document.getElementById('budgetAmount');
    const budgetError = document.getElementById('budgetError');
    
    if (!budgetCategorySelect || !budgetAmountInput || !budgetError) {
        return;
    }
    
    // Clear previous error
    budgetError.textContent = '';
    
    // Get values
    const category = budgetCategorySelect.value;
    const amount = budgetAmountInput.value;
    
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
            UIController.showError('Failed to save budget limit to storage. Limit is available for this session only.');
        }
    }
    
    // Update UI
    renderBudgetManagement();
    
    // Clear inputs
    budgetCategorySelect.value = '';
    budgetAmountInput.value = '';
    
    // Show success notification
    if (saveSuccess || !appState.isStorageAvailable) {
        UIController.showNotification(`Budget limit set for ${category}: $${numAmount.toFixed(2)}`);
    }
}

/**
 * Handle deleting a budget limit (event delegation)
 * @param {Event} event - Click event
 */
function handleBudgetDelete(event) {
    // Check if delete button was clicked
    if (!event.target.classList.contains('budget-delete')) {
        return;
    }
    
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
            UIController.showError('Failed to save deletion to storage. Change is available for this session only.');
        }
    }
    
    // Update UI
    renderBudgetManagement();
    
    // Show success notification
    if (saveSuccess || !appState.isStorageAvailable) {
        UIController.showNotification(`Budget limit deleted for ${category}`);
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
