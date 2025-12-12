const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3000;
const TASKS_FILE = path.join(__dirname, 'tasks.json');

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend (опционально)
app.use(express.static(path.join(__dirname, '../frontend')));

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ 
        message: 'Backend is working!', 
        timestamp: new Date().toISOString(),
        status: 'OK'
    });
});

// Health check
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'healthy' });
});

// Read tasks from file
async function readTasks() {
    try {
        // Check if file exists
        try {
            await fs.access(TASKS_FILE);
        } catch {
            // Create file if it doesn't exist
            await fs.writeFile(TASKS_FILE, JSON.stringify([]));
            return [];
        }

        const data = await fs.readFile(TASKS_FILE, 'utf8');
        if (!data.trim()) {
            return [];
        }
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading tasks file:', error);
        return [];
    }
}

// Write tasks to file
async function writeTasks(tasks) {
    try {
        await fs.writeFile(TASKS_FILE, JSON.stringify(tasks, null, 2));
        console.log(`Tasks saved: ${tasks.length} tasks`);
    } catch (error) {
        console.error('Error writing tasks file:', error);
        throw error;
    }
}

// Initialize tasks file
async function initializeTasksFile() {
    try {
        const tasks = await readTasks();
        console.log(`Initialized with ${tasks.length} existing tasks`);
        return tasks;
    } catch (error) {
        console.error('Failed to initialize tasks file:', error);
        return [];
    }
}

// =============== ROUTES ===============

// GET all tasks
app.get('/api/tasks', async (req, res) => {
    try {
        console.log('GET /api/tasks requested');
        const tasks = await readTasks();
        console.log(`Returning ${tasks.length} tasks`);
        res.json(tasks);
    } catch (error) {
        console.error('Error in GET /api/tasks:', error);
        res.status(500).json({ 
            error: 'Failed to fetch tasks',
            details: error.message 
        });
    }
});

// POST new task
app.post('/api/tasks', async (req, res) => {
    try {
        console.log('POST /api/tasks:', req.body);
        const { text } = req.body;
        
        if (!text || typeof text !== 'string' || text.trim() === '') {
            return res.status(400).json({ 
                error: 'Task text is required and must be a non-empty string' 
            });
        }

        const tasks = await readTasks();
        const newTask = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            text: text.trim(),
            completed: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        tasks.push(newTask);
        await writeTasks(tasks);
        
        console.log(`Task added: ${newTask.id} - ${newTask.text}`);
        res.status(201).json(newTask);
    } catch (error) {
        console.error('Error in POST /api/tasks:', error);
        res.status(500).json({ 
            error: 'Failed to add task',
            details: error.message 
        });
    }
});

// PUT update task (toggle completion)
app.put('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`PUT /api/tasks/${id}`);
        
        const tasks = await readTasks();
        const taskIndex = tasks.findIndex(task => task.id === id);

        if (taskIndex === -1) {
            return res.status(404).json({ error: 'Task not found' });
        }

        tasks[taskIndex].completed = !tasks[taskIndex].completed;
        tasks[taskIndex].updatedAt = new Date().toISOString();
        
        await writeTasks(tasks);
        
        console.log(`Task ${id} toggled: ${tasks[taskIndex].completed ? 'completed' : 'incomplete'}`);
        res.json(tasks[taskIndex]);
    } catch (error) {
        console.error(`Error in PUT /api/tasks/${req.params.id}:`, error);
        res.status(500).json({ 
            error: 'Failed to update task',
            details: error.message 
        });
    }
});

// DELETE task
app.delete('/api/tasks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log(`DELETE /api/tasks/${id}`);
        
        const tasks = await readTasks();
        const initialLength = tasks.length;
        const filteredTasks = tasks.filter(task => task.id !== id);

        if (tasks.length === filteredTasks.length) {
            return res.status(404).json({ error: 'Task not found' });
        }

        await writeTasks(filteredTasks);
        
        console.log(`Task ${id} deleted. Remaining: ${filteredTasks.length} tasks`);
        res.json({ 
            message: 'Task deleted successfully',
            deletedId: id,
            remainingTasks: filteredTasks.length 
        });
    } catch (error) {
        console.error(`Error in DELETE /api/tasks/${req.params.id}:`, error);
        res.status(500).json({ 
            error: 'Failed to delete task',
            details: error.message 
        });
    }
});

// DELETE completed tasks
app.delete('/api/tasks/clear/completed', async (req, res) => {
    try {
        console.log('DELETE /api/tasks/clear/completed');
        
        const tasks = await readTasks();
        const completedTasks = tasks.filter(task => task.completed);
        const activeTasks = tasks.filter(task => !task.completed);

        if (completedTasks.length === 0) {
            return res.json({ 
                message: 'No completed tasks to clear',
                cleared: 0,
                remaining: tasks.length 
            });
        }

        await writeTasks(activeTasks);
        
        console.log(`Cleared ${completedTasks.length} completed tasks. Remaining: ${activeTasks.length}`);
        res.json({ 
            message: 'Completed tasks cleared successfully',
            cleared: completedTasks.length,
            remaining: activeTasks.length 
        });
    } catch (error) {
        console.error('Error in DELETE /api/tasks/clear/completed:', error);
        res.status(500).json({ 
            error: 'Failed to clear completed tasks',
            details: error.message 
        });
    }
});

// 404 handler for undefined API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ 
        error: 'API endpoint not found',
        path: req.originalUrl,
        method: req.method 
    });
});

// Start server
async function startServer() {
    try {
        // Initialize tasks file
        await initializeTasksFile();
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log('='.repeat(50));
            console.log('🚀 BACKEND SERVER STARTED SUCCESSFULLY');
            console.log('='.repeat(50));
            console.log(`📡 Server URL: http://localhost:${PORT}`);
            console.log(`🛠️  API Base URL: http://localhost:${PORT}/api`);
            console.log(`📊 Test endpoint: http://localhost:${PORT}/api/test`);
            console.log(`❤️  Health check: http://localhost:${PORT}/api/health`);
            console.log(`📁 Tasks file: ${TASKS_FILE}`);
            console.log('='.repeat(50));
            console.log('Available endpoints:');
            console.log('  GET    /api/tasks                 - Get all tasks');
            console.log('  POST   /api/tasks                 - Add new task');
            console.log('  PUT    /api/tasks/:id             - Toggle task completion');
            console.log('  DELETE /api/tasks/:id             - Delete specific task');
            console.log('  DELETE /api/tasks/clear/completed - Clear all completed tasks');
            console.log('='.repeat(50));
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the server
startServer();