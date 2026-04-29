/**
 * Sarah's Bakery Inventory Tracker - Pure JS 5-Category Auto-Sorting
 * Categories: expired | critical | warning | safe | used
 * Auto-updates stats, organized groups, localStorage
 */

let inventory = [];

const DOM = {
    form: document.getElementById('addItemForm'),
    nameInput: document.getElementById('itemName'),
    quantityInput: document.getElementById('itemQuantity'),
    expiryInput: document.getElementById('itemExpiry'),
    inventoryList: document.getElementById('inventoryList'),
    stats: {
        expired: document.getElementById('expiredCount'),
        critical: document.getElementById('criticalCount'),
        warning: document.getElementById('warningCount'),
        used: document.getElementById('usedCount'),
        total: document.getElementById('totalCount'),
        safe: document.getElementById('safeCount')
    },
    clearAllBtn: document.getElementById('clearAllBtn')
};

function generateId() {
    return 'item_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function daysUntilExpiry(expiryDate) {
    const now = new Date();
    const diffTime = expiryDate.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getItemStatus(expiryDate, isUsed = false) {
    if (isUsed) return 'used';
    const days = daysUntilExpiry(expiryDate);
    if (days < 0) return 'expired';
    if (days < 2) return 'critical';
    if (days < 7) return 'warning';
    return 'safe';
}

function createItem(name, quantity, expiryDateStr) {
    const expiryDate = new Date(expiryDateStr + 'T23:59:59');
    return {
        id: generateId(),
        name: name.trim(),
        quantity: quantity.trim(),
        expiryDate,
        status: getItemStatus(expiryDate),
        isUsed: false,
        addedDate: new Date().toISOString()
    };
}

function updateStats() {
    const stats = inventory.reduce((acc, item) => {
        acc.total++;
        acc[item.status]++;
        return acc;
    }, { total: 0, expired: 0, critical: 0, warning: 0, used: 0, safe: 0 });

    Object.keys(stats).forEach(key => {
        if (DOM.stats[key]) DOM.stats[key].textContent = stats[key];
    });
}

function groupInventoryByStatus() {
    return {
        expired: inventory.filter(item => item.status === 'expired'),
        critical: inventory.filter(item => item.status === 'critical'),
        warning: inventory.filter(item => item.status === 'warning'),
        safe: inventory.filter(item => item.status === 'safe'),
        used: inventory.filter(item => item.status === 'used')
    };
}

function renderItem(item) {
    const days = daysUntilExpiry(item.expiryDate);
    const daysText = days >= 0 ? `${days}d` : `${Math.abs(days)}d ago`;
    const isUsedClass = item.status === 'used' ? 'used-item' : '';
    
    return `
        <div class="inventory-item ${isUsedClass}" data-item-id="${item.id}">
            <div class="item-status status-${item.status}"></div>
            <div class="inventory-content">
                <div class="item-name">${escapeHtml(item.name)}</div>
                <div class="item-details">
                    ${item.status === 'used' ? '✅ Used' : `Expires in <strong>${daysText}</strong>`}
                    <strong>${escapeHtml(item.quantity)}</strong>
                </div>
            </div>
            <div class="item-actions">
                ${item.status !== 'used' ? 
                    `<button class="btn-action btn-use" onclick="markAsUsed('${item.id}')">✓ Used</button>` : ''
                }
                <button class="btn-action btn-delete" onclick="deleteItem('${item.id}')">🗑️ Delete</button>
            </div>
        </div>
    `;
}

function renderInventory() {
    const groups = groupInventoryByStatus();
    let html = '';

    const groupOrder = [
        { key: 'expired', label: '📅 EXPIRED', className: 'expired-group' },
        { key: 'critical', label: '🚨 CRITICAL', className: 'critical-group' },
        { key: 'warning', label: '⚠️ WARNING', className: 'warning-group' },
        { key: 'safe', label: '✅ SAFE', className: 'safe-group' },
        { key: 'used', label: '💚 USED', className: 'used-group' }
    ];

    groupOrder.forEach(group => {
        const items = groups[group.key];
        if (items.length > 0) {
            html += `
                <div class="inventory-group ${group.className}">
                    <h4>${group.label} <span>(${items.length})</span></h4>
                    ${items.map(renderItem).join('')}
                </div>
            `;
        }
    });

    if (html === '') {
        html = `
            <div class="empty-state">
                <div class="icon">📦</div>
                <h4>No ingredients yet</h4>
                <p>Add your first ingredient using the form above</p>
            </div>
        `;
    }

    DOM.inventoryList.innerHTML = html;
    updateStats();
}

function addItem(e) {
    e.preventDefault();
    if (!DOM.nameInput.value.trim()) {
        showFeedback('Please enter ingredient name', 'warning');
        return;
    }

    const item = createItem(
        DOM.nameInput.value,
        DOM.quantityInput.value || '1 unit',
        DOM.expiryInput.value
    );

    inventory.unshift(item);
    renderInventory();
    DOM.form.reset();
    DOM.nameInput.focus();
    showFeedback(`"${item.name}" → ${item.status.toUpperCase()} 🎉`, 'success');
}

function markAsUsed(itemId) {
    const itemIndex = inventory.findIndex(item => item.id === itemId);
    if (itemIndex !== -1) {
        inventory[itemIndex].status = 'used';
        inventory[itemIndex].isUsed = true;
        renderInventory();
        showFeedback('Moved to USED 💚', 'success');
    }
}

function deleteItem(itemId) {
    if (confirm('Delete ingredient?')) {
        const beforeCount = inventory.length;
        inventory = inventory.filter(item => item.id !== itemId);
        if (inventory.length < beforeCount) {
            renderInventory();
            showFeedback('Deleted 🗑️', 'warning');
        }
    }
}

function clearAll() {
    if (inventory.length === 0) return;
    if (confirm(`Delete ALL ${inventory.length} ingredients?`)) {
        inventory = [];
        renderInventory();
        showFeedback('Cleared 🧹', 'danger');
    }
}

function showFeedback(message, type = 'success') {
    document.querySelectorAll('.toast').forEach(toast => toast.remove());
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span>${message}</span>
        <button class="toast-close" onclick="this.parentElement.remove()">×</button>
    `;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
        if (toast.parentNode) {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }
    }, 4000);
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

document.addEventListener('DOMContentLoaded', function() {
    if (DOM.form) DOM.form.addEventListener('submit', addItem);
    if (DOM.clearAllBtn) DOM.clearAllBtn.addEventListener('click', clearAll);
    
    const defaultExpiry = new Date();
    defaultExpiry.setDate(defaultExpiry.getDate() + 7);
    if (DOM.expiryInput) DOM.expiryInput.value = defaultExpiry.toISOString().split('T')[0];
    
    if (DOM.nameInput) {
        DOM.nameInput.addEventListener('input', function() {
            this.style.background = this.value ? '#f0fdf4' : '#fef2f2';
        });
    }
    
    loadInventory();
});

function saveInventory() {
    localStorage.setItem('bakeryInventory_v2', JSON.stringify(inventory));
}

function loadInventory() {
    try {
        const saved = localStorage.getItem('bakeryInventory_v2');
        if (saved) {
            inventory = JSON.parse(saved).map(item => ({
                ...item,
                expiryDate: new Date(item.expiryDate)
            })).filter(item => item.expiryDate instanceof Date && !isNaN(item.expiryDate));
            inventory.forEach(item => {
                item.status = getItemStatus(item.expiryDate, item.isUsed);
            });
            renderInventory();
        }
    } catch (e) {
        console.warn('Load failed:', e);
    }
}

const originalRender = renderInventory;
renderInventory = function() {
    originalRender();
    saveInventory();
};

window.markAsUsed = markAsUsed;
window.deleteItem = deleteItem;
window.clearAll = clearAll;

console.log('🍞 Bakery Tracker Loaded - 5-Category Auto-Sort');