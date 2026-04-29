/**
 * Sarah's Bakery Inventory Tracker - Complete Pure JavaScript Solution
 * All features: CRUD, expiration logic, responsive stats, no external dependencies
 */

// Global inventory array - Single Source of Truth
let inventory = [];

// DOM Elements Cache for performance// Inventory State
let inventoryState = {
    items: JSON.parse(localStorage.getItem('inventory')) || [],
    currentItemIndex: -1,
    editingItem: null
};

// Categories
const categories = {
    used: [],
    'to-use': [],
    total: [],
    expiring: []
};

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
    const elements = {
        usedCount: document.querySelector('#usedCount'),
        toUseCount: document.querySelector('#toUseCount'),
        totalCount: document.querySelector('#totalCount'),
        expiringCount: document.querySelector('#expiringCount'),
        currentItem: document.querySelector('#currentItem'),
        resultText: document.querySelector('#resultText'),
        itemStatus: document.querySelector('#itemStatus'),
        statusDisplay: document.querySelector('#statusDisplay'),
        choicesGrid: document.querySelector('#choicesGrid'),
        newItemName: document.querySelector('#newItemName'),
        addBtn: document.querySelector('#addBtn'),
        resetBtn: document.querySelector('#resetBtn'),
        editModal: document.querySelector('#editModal'),
        editItemName: document.querySelector('#editItemName'),
        editExpiryDate: document.querySelector('#editExpiryDate'),
        saveBtn: document.querySelector('#saveBtn'),
        cancelBtn: document.querySelector('#cancelBtn')
    };

    function init() {
        updateStats();
        selectFirstItem();
        addEventListeners(elements);
        updateThemeToggle();
        saveInventory();
    }

    function addEventListeners(elements) {
        // Action buttons
        elements.choicesGrid.addEventListener('click', handleActionClick);
        
        // Add new item
        if (elements.addBtn) elements.addBtn.addEventListener('click', addNewItem);
        if (elements.newItemName) elements.newItemName.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addNewItem();
        });
        
        // Reset
        if (elements.resetBtn) elements.resetBtn.addEventListener('click', resetInventory);
        
        // Modal
        if (elements.saveBtn) elements.saveBtn.addEventListener('click', saveEdit);
        if (elements.cancelBtn) elements.cancelBtn.addEventListener('click', closeModal);
        
        // Theme toggle
        const themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
    }

    function handleActionClick(e) {
        const btn = e.target.closest('.choice-btn');
        if (!btn || inventoryState.currentItemIndex === -1) return;

        const action = btn.dataset.action;
        const item = inventoryState.items[inventoryState.currentItemIndex];

        switch(action) {
            case 'markUsed':
                markItemUsed(item);
                break;
            case 'markToUse':
                markItemToUse(item);
                break;
            case 'editExpiry':
                openEditModal(item);
                break;
            case 'delete':
                deleteItem(item);
                break;
        }
    }

    function markItemUsed(item) {
        item.status = 'used';
        updateCategories();
        updateStats();
        updateCurrentItemDisplay();
        showResult('✅ Item marked as USED!', 'success');
        saveInventory();
    }

    function markItemToUse(item) {
        item.status = 'to-use';
        updateCategories();
        updateStats();
        updateCurrentItemDisplay();
        showResult('🔴 Item marked TO BE USED!', 'warning');
        saveInventory();
    }

    function deleteItem(item) {
        inventoryState.items.splice(inventoryState.currentItemIndex, 1);
        selectNextItem();
        updateCategories();
        updateStats();
        showResult('🗑️ Item deleted!', 'danger');
        saveInventory();
    }

    function addNewItem() {
        const name = elements.newItemName.value.trim();
        if (!name) return;

        const newItem = {
            id: Date.now(),
            name: name,
            status: 'normal',
            expiryDate: null,
            addedDate: new Date().toISOString().split('T')[0]
        };

        inventoryState.items.unshift(newItem);
        elements.newItemName.value = '';
        selectItem(0);
        updateCategories();
        updateStats();
        showResult(`➕ "${name}" added to inventory!`, 'success');
        saveInventory();
    }

    function openEditModal(item) {
        inventoryState.editingItem = item;
        elements.editItemName.value = item.name;
        elements.editExpiryDate.value = item.expiryDate || '';
        elements.editModal.classList.add('active');
        document.querySelector('#modalTitle').textContent = `Edit: ${item.name}`;
    }

    function saveEdit() {
        if (!inventoryState.editingItem) return;
        
        inventoryState.editingItem.name = elements.editItemName.value.trim();
        inventoryState.editingItem.expiryDate = elements.editExpiryDate.value || null;
        
        updateCurrentItemDisplay();
        updateCategories();
        updateStats();
        closeModal();
        saveInventory();
        showResult('💾 Item updated!', 'success');
    }

    function closeModal() {
        elements.editModal.classList.remove('active');
        inventoryState.editingItem = null;
    }

    function selectFirstItem() {
        if (inventoryState.items.length > 0) {
            selectItem(0);
        }
    }

    function selectItem(index) {
        inventoryState.currentItemIndex = index;
        updateCurrentItemDisplay();
    }

    function selectNextItem() {
        const nextIndex = (inventoryState.currentItemIndex + 1) % inventoryState.items.length;
        if (inventoryState.items.length > 0) {
            selectItem(nextIndex);
        } else {
            inventoryState.currentItemIndex = -1;
            elements.currentItem.innerHTML = '<i class="fas fa-box"></i><span>No items</span>';
        }
    }

    function updateCurrentItemDisplay() {
        if (inventoryState.currentItemIndex === -1) return;

        const item = inventoryState.items[inventoryState.currentItemIndex];
        const statusClass = item.status || 'normal';
        
        elements.currentItem.innerHTML = `
            <i class="fas fa-${getItemIcon(item)}"></i>
            <span>${item.name}</span>
            ${item.expiryDate ? `<small>Expires: ${item.expiryDate}</small>` : ''}
        `;
        elements.currentItem.className = `choice-display ${statusClass}`;
        
        elements.statusDisplay.innerHTML = `<span class="status-badge ${statusClass}">${statusClass.toUpperCase()}</span>`;
    }

    function updateCategories() {
        categories.used = inventoryState.items.filter(item => item.status === 'used');
        categories['to-use'] = inventoryState.items.filter(item => item.status === 'to-use');
        categories.total = inventoryState.items;
        categories.expiring = inventoryState.items.filter(item => 
            item.expiryDate && isExpiringSoon(item.expiryDate)
        );
    }

    function isExpiringSoon(dateStr) {
        const expiryDate = new Date(dateStr);
        const today = new Date();
        const diffTime = expiryDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 3 && diffDays > 0;
    }

    function updateStats() {
        updateCategories();
        elements.usedCount.textContent = categories.used.length;
        elements.toUseCount.textContent = categories['to-use'].length;
        elements.totalCount.textContent = categories.total.length;
        elements.expiringCount.textContent = categories.expiring.length;
    }

    function showResult(message, type) {
        elements.resultText.textContent = message;
        elements.resultText.className = `result-text ${type}`;
        elements.itemStatus.textContent = `Status: ${type.toUpperCase()}`;
    }

    function getItemIcon(item) {
        if (item.status === 'used') return 'check-circle';
        if (item.status === 'to-use') return 'clock';
        if (isExpiringSoon(item.expiryDate)) return 'exclamation-triangle';
        return 'box';
    }

    function resetInventory() {
        if (confirm('Reset entire inventory? This cannot be undone.')) {
            inventoryState.items = [];
            inventoryState.currentItemIndex = -1;
            updateStats();
            updateCurrentItemDisplay();
            showResult('🗑️ Inventory reset!', 'danger');
            saveInventory();
        }
    }

    function saveInventory() {
        localStorage.setItem('inventory', JSON.stringify(inventoryState.items));
    }

    // Theme functions (keep your existing ones)
    function toggleTheme() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        const themeToggle = document.querySelector('.theme-toggle');
        themeToggle.innerHTML = newTheme === 'dark' ? '☀️' : '🌙';
    }

    function updateThemeToggle() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        const themeToggle = document.querySelector('.theme-toggle');
        if (themeToggle) {
            themeToggle.innerHTML = savedTheme === 'dark' ? '☀️' : '🌙';
        }
    }

    init();
});
const DOM = {
    form: document.getElementById('addItemForm'),
    nameInput: document.getElementById('itemName'),
    quantityInput: document.getElementById('itemQuantity'),
    expiryInput: document.getElementById('itemExpiry'),
    inventoryList: document.getElementById('inventoryList'),
    stats: {
        critical: document.getElementById('criticalCount'),
        warning: document.getElementById('warningCount'),
        safe: document.getElementById('safeCount'),
        total: document.getElementById('totalCount')
    },
    clearAllBtn: document.getElementById('clearAllBtn')
};

/**
 * Generates unique ID for inventory items
 * @returns {string} Unique ID
 */
function generateId() {
    return 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Calculates days until expiration
 * @param {Date} expiryDate - Item expiration date
 * @returns {number} Days remaining (negative if expired)
 */
function daysUntilExpiry(expiryDate) {
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Determines item status based on expiration rules
 * @param {Date} expiryDate - Item expiration date
 * @returns {'critical' | 'warning' | 'safe'} Status class
 */
function getItemStatus(expiryDate) {
    const days = daysUntilExpiry(expiryDate);
    if (days < 2) return 'critical';      // <48 hours = RED
    if (days < 7) return 'warning';       // <7 days = YELLOW
    return 'safe';                        // 7+ days = GREEN
}

/**
 * Creates complete inventory item object
 * @param {string} name - Ingredient name
 * @param {string} quantity - Quantity (e.g., "2kg")
 * @param {string} expiryDateStr - Date string
 * @returns {Object} Complete item
 */
function createItem(name, quantity, expiryDateStr) {
    const expiryDate = new Date(expiryDateStr + 'T23:59:59'); // End of day
    return {
        id: generateId(),
        name: name.trim(),
        quantity: quantity.trim(),
        expiryDate,
        status: getItemStatus(expiryDate)
    };
}

/**
 * Updates all statistics counters and displays
 */
function updateStats() {
    const stats = inventory.reduce((acc, item) => {
        acc.total++;
        acc[item.status]++;
        return acc;
    }, { total: 0, critical: 0, warning: 0, safe: 0 });

    DOM.stats.critical.textContent = stats.critical;
    DOM.stats.warning.textContent = stats.warning;
    DOM.stats.safe.textContent = stats.safe;
    DOM.stats.total.textContent = stats.total;
}

/**
 * Renders single inventory item as HTML string
 * @param {Object} item - Inventory item
 * @returns {string} HTML markup
 */
function renderItem(item) {
    const days = daysUntilExpiry(item.expiryDate);
    const daysText = days >= 0 ? `${days}d` : `${Math.abs(days)}d ago`;
    
    return `
        <div class="inventory-item" data-item-id="${item.id}">
            <div class="item-status status-${item.status}"></div>
            <div class="inventory-content">
                <div class="item-name">${escapeHtml(item.name)}</div>
                <div class="item-details">
                    <strong>${escapeHtml(item.quantity)}</strong> • Expires in <strong>${daysText}</strong>
                </div>
            </div>
            <div class="item-actions">
                <button class="btn-action btn-use" onclick="markAsUsed('${item.id}')">
                    ✓ Used
                </button>
                <button class="btn-action btn-delete" onclick="deleteItem('${item.id}')">
                    🗑️ Delete
                </button>
            </div>
        </div>
    `;
}

/**
 * Renders complete inventory list or empty state
 */
function renderInventory() {
    if (inventory.length === 0) {
        DOM.inventoryList.innerHTML = `
            <div class="empty-state">
                <div class="icon">📦</div>
                <h4>No ingredients yet</h4>
                <p>Add your first ingredient using the form above</p>
            </div>
        `;
    } else {
        // Sort by expiration date (soonest first)
        const sortedInventory = [...inventory].sort((a, b) => 
            daysUntilExpiry(a.expiryDate) - daysUntilExpiry(b.expiryDate)
        );
        
        DOM.inventoryList.innerHTML = sortedInventory.map(renderItem).join('');
    }
    
    updateStats();
}

/**
 * Handles form submission to add new item
 * @param {Event} e - Form submit event
 */
function addItem(e) {
    e.preventDefault();
    
    const item = createItem(
        DOM.nameInput.value,
        DOM.quantityInput.value,
        DOM.expiryInput.value
    );

    inventory.push(item);
    renderInventory();
    
    // Reset and refocus form
    DOM.form.reset();
    DOM.nameInput.focus();
    
    showFeedback('Ingredient added successfully! 🎉', 'success');
}

/**
 * Marks item as used (removes from inventory)
 * @param {string} itemId - Item ID
 */
function markAsUsed(itemId) {
    inventory = inventory.filter(item => item.id !== itemId);
    renderInventory();
    showFeedback('Ingredient marked as used! 💚', 'success');
}

/**
 * Deletes specific item
 * @param {string} itemId - Item ID
 */
function deleteItem(itemId) {
    if (confirm('Delete this ingredient from inventory?')) {
        inventory = inventory.filter(item => item.id !== itemId);
        renderInventory();
        showFeedback('Ingredient deleted', 'warning');
    }
}

/**
 * Clears entire inventory
 */
function clearAll() {
    if (inventory.length === 0) return;
    
    if (confirm(`Delete ALL ${inventory.length} ingredients? This cannot be undone.`)) {
        inventory = [];
        renderInventory();
        showFeedback('All ingredients cleared', 'danger');
    }
}

/**
 * Shows beautiful toast notification
 * @param {string} message - Message text
 * @param {'success' | 'warning' | 'danger'} type - Notification type
 */
function showFeedback(message, type = 'success') {
    // Remove existing toasts
    document.querySelectorAll('.toast').forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    
    document.body.appendChild(toast);
    
    // Show with animation
    requestAnimationFrame(() => toast.classList.add('show'));
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }
    }, 4000);
}

/**
 * Escapes HTML to prevent XSS
 * @param {string} str - Input string
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// 🔔 EVENT LISTENERS
DOM.form.addEventListener('submit', addItem);
DOM.clearAllBtn.addEventListener('click', clearAll);

// 🎨 UX IMPROVEMENTS
// Set default expiry to tomorrow
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
DOM.expiryInput.value = tomorrow.toISOString().split('T')[0];

// Form validation feedback
DOM.nameInput.addEventListener('input', function() {
    this.style.background = this.value ? '#f0fdf4' : '#fef2f2';
});

// Initial render
renderInventory();

// Expose functions globally for onclick handlers
window.markAsUsed = markAsUsed;
window.deleteItem = deleteItem;

/**
 * Auto-save to localStorage (bonus feature)
 */
function saveInventory() {
    localStorage.setItem('bakeryInventory', JSON.stringify(inventory));
}

function loadInventory() {
    const saved = localStorage.getItem('bakeryInventory');
    if (saved) {
        inventory = JSON.parse(saved).map(item => ({
            ...item,
            expiryDate: new Date(item.expiryDate)
        }));
        renderInventory();
    }
}

// Auto-save on changes
const originalRenderInventory = renderInventory;
renderInventory = function() {
    originalRenderInventory();
    saveInventory();
};

// Load on startup
loadInventory();

console.log('🍞 Bakery Tracker loaded successfully!');
console.log('📊 Features: CRUD, expiration alerts, localStorage, responsive');
