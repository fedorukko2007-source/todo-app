// API Configuration
const API_URL = 'http://localhost:3000/api/tasks';

// Global tasks array
let tasks = [];

// DOM Elements
const taskInput = document.getElementById('taskInput');
const taskList = document.getElementById('taskList');

// ==================== API FUNCTIONS ====================

// Fetch all tasks from backend
async function fetchTasks() {
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Failed to fetch tasks');
        tasks = await response.json();
        renderTasks();
    } catch (error) {
        console.error('Error fetching tasks:', error);
        alert('Failed to load tasks. Please check if backend is running.');
        tasks = [];
        renderTasks();
    }
}

// Add new task to backend
async function addTask() {
    const text = taskInput.value.trim();
    if (text === '') {
        alert('Please enter a task!');
        return;
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text })
        });

        if (!response.ok) throw new Error('Failed to add task');

        const newTask = await response.json();
        tasks.push(newTask);
        taskInput.value = '';
        renderTasks();
        
        // Visual feedback
        const addBtn = document.querySelector('.input-section button');
        addBtn.textContent = '✓ Added!';
        setTimeout(() => {
            addBtn.textContent = 'Add Task';
        }, 1000);
        
    } catch (error) {
        console.error('Error adding task:', error);
        alert('Failed to add task. Please try again.');
    }
}

// Toggle task completion
async function toggleTask(id) {
    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'PUT'
        });

        if (!response.ok) throw new Error('Failed to update task');

        const updatedTask = await response.json();
        const taskIndex = tasks.findIndex(task => task.id === id);
        if (taskIndex !== -1) {
            tasks[taskIndex] = updatedTask;
        }
        renderTasks();
    } catch (error) {
        console.error('Error toggling task:', error);
        alert('Failed to update task status.');
    }
}

// Delete task from backend
async function deleteTask(id) {
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to delete task');

        tasks = tasks.filter(task => task.id !== id);
        renderTasks();
        
        // Show notification
        showNotification('Task deleted successfully', 'success');
    } catch (error) {
        console.error('Error deleting task:', error);
        alert('Failed to delete task.');
    }
}

// Clear all completed tasks
async function clearCompleted() {
    const completedCount = tasks.filter(task => task.completed).length;
    if (completedCount === 0) {
        alert('No completed tasks to clear!');
        return;
    }

    if (!confirm(`Clear ${completedCount} completed task(s)?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_URL}/clear/completed`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Failed to clear completed tasks');

        const result = await response.json();
        tasks = tasks.filter(task => !task.completed);
        renderTasks();
        
        showNotification(`Cleared ${result.count} completed task(s)`, 'info');
    } catch (error) {
        console.error('Error clearing completed tasks:', error);
        alert('Failed to clear completed tasks.');
    }
}

// Clear ALL tasks
async function clearAll() {
    if (tasks.length === 0) {
        alert('No tasks to clear!');
        return;
    }

    if (!confirm(`Delete ALL ${tasks.length} task(s)? This cannot be undone!`)) {
        return;
    }

    try {
        // Delete tasks one by one (or implement bulk delete on backend)
        for (const task of tasks) {
            await fetch(`${API_URL}/${task.id}`, {
                method: 'DELETE'
            });
        }
        
        tasks = [];
        renderTasks();
        showNotification('All tasks deleted', 'warning');
    } catch (error) {
        console.error('Error clearing all tasks:', error);
        alert('Failed to clear all tasks.');
    }
}

// ==================== UI FUNCTIONS ====================

// Render tasks to the UI
function renderTasks() {
    taskList.innerHTML = '';
    
    if (tasks.length === 0) {
        taskList.innerHTML = `
            <div class="empty-state">
                <p>📝 No tasks yet</p>
                <p class="hint">Add your first task above!</p>
            </div>
        `;
        return;
    }

    // Sort tasks: incomplete first, then by creation date
    const sortedTasks = [...tasks].sort((a, b) => {
        if (a.completed !== b.completed) {
            return a.completed ? 1 : -1;
        }
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    sortedTasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;
        
        // Format date
        const date = new Date(task.createdAt);
        const dateStr = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        li.innerHTML = `
            <input type="checkbox" class="task-checkbox" 
                   ${task.completed ? 'checked' : ''} 
                   onchange="toggleTask('${task.id}')">
            <div class="task-content">
                <span class="task-text">${escapeHtml(task.text)}</span>
                <small class="task-date">${dateStr}</small>
            </div>
            <button class="delete-btn" onclick="deleteTask('${task.id}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
            </button>
        `;
        taskList.appendChild(li);
    });

    // Update task counter
    updateTaskCounter();
}

// Update task counter display
function updateTaskCounter() {
    const total = tasks.length;
    const completed = tasks.filter(task => task.completed).length;
    const pending = total - completed;
    
    // Add or update counter in header
    let counter = document.querySelector('.task-counter');
    if (!counter) {
        counter = document.createElement('div');
        counter.className = 'task-counter';
        document.querySelector('h1').after(counter);
    }
    
    counter.innerHTML = `
        <span class="counter-item">Total: <strong>${total}</strong></span>
        <span class="counter-item">Pending: <strong>${pending}</strong></span>
        <span class="counter-item">Completed: <strong>${completed}</strong></span>
    `;
}

// Show notification
function showNotification(message, type = 'info') {
    // Remove existing notification
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">×</button>
    `;
    
    document.querySelector('.container').appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 3000);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== EVENT LISTENERS ====================

// Add task on Enter key
taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') addTask();
});

// Focus input on page load
window.addEventListener('load', () => {
    taskInput.focus();
    fetchTasks();
});

// ==================== ADDITIONAL CSS STYLES ====================
// Add these styles to your style.css or include them here
const additionalStyles = `
    .empty-state {
        text-align: center;
        padding: 40px 20px;
        color: #666;
    }
    
    .empty-state p {
        margin: 10px 0;
    }
    
    .empty-state .hint {
        font-size: 14px;
        opacity: 0.7;
    }
    
    .task-counter {
        background: #f8f9fa;
        border-radius: 10px;
        padding: 10px 20px;
        margin-bottom: 20px;
        display: flex;
        justify-content: space-around;
        font-size: 14px;
    }
    
    .counter-item {
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    
    .counter-item strong {
        font-size: 18px;
        color: #6a11cb;
    }
    
    .task-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        margin-left: 10px;
    }
    
    .task-date {
        font-size: 12px;
        color: #888;
        margin-top: 3px;
    }
    
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 15px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        animation: slideIn 0.3s ease;
    }
    
    .notification.warning {
        background: #ffc107;
        color: #333;
    }
    
    .notification.info {
        background: #17a2b8;
    }
    
    .notification button {
        background: transparent;
        border: none;
        color: inherit;
        font-size: 20px;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    .delete-btn svg {
        display: block;
    }
`;

// Inject additional styles
const styleSheet = document.createElement("style");
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);