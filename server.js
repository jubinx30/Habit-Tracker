// server.js - Node.js Backend with Express and MongoDB

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins - change to specific domain in production
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
app.use(express.json());
app.use(express.static('public')); // Serve static files from 'public' folder

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/habittracker')
.then(() => console.log('✅ Connected to MongoDB successfully!'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Habit Schema
const habitSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  id: { type: Number, required: true },
  text: { type: String, required: true },
  completed: { type: Boolean, default: false },
  dateAdded: String,
  colorName: String,
  completionHistory: { type: Map, of: Number, default: {} }
}, { timestamps: true });

const Habit = mongoose.model('Habit', habitSchema);

// API Routes

// Get all habits for a user
app.get('/api/habits/:userId', async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.params.userId });
    res.json(habits);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a new habit
app.post('/api/habits', async (req, res) => {
  try {
    const habit = new Habit(req.body);
    await habit.save();
    res.status(201).json(habit);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update a habit
app.put('/api/habits/:id', async (req, res) => {
  try {
    const habit = await Habit.findOneAndUpdate(
      { id: req.params.id, userId: req.body.userId },
      req.body,
      { new: true }
    );
    res.json(habit);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete a habit
app.delete('/api/habits/:id/:userId', async (req, res) => {
  try {
    await Habit.findOneAndDelete({ 
      id: req.params.id, 
      userId: req.params.userId 
    });
    res.json({ message: 'Habit deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sync all habits (bulk update)
app.post('/api/habits/sync', async (req, res) => {
  try {
    const { userId, habits } = req.body;
    
    // Delete all existing habits for this user
    await Habit.deleteMany({ userId });
    
    // Insert new habits
    if (habits && habits.length > 0) {
      const habitsToInsert = habits.map(h => ({ ...h, userId }));
      await Habit.insertMany(habitsToInsert);
    }
    
    res.json({ message: 'Habits synced successfully', count: habits.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin endpoint - View all habits (for debugging)
app.get('/api/admin/all-habits', async (req, res) => {
  try {
    const allHabits = await Habit.find({}).limit(100);
    res.json({
      total: allHabits.length,
      habits: allHabits
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin endpoint - View habits by userId
app.get('/api/admin/user/:userId', async (req, res) => {
  try {
    const habits = await Habit.find({ userId: req.params.userId });
    res.json({
      userId: req.params.userId,
      total: habits.length,
      habits: habits
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Debug endpoint - list all databases
app.get('/api/admin/databases', async (req, res) => {
  try {
    const admin = mongoose.connection.db.admin();
    const { databases } = await admin.listDatabases();
    res.json({ 
      databases: databases,
      currentDatabase: mongoose.connection.db.databaseName
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Admin panel: http://localhost:${PORT}/api/admin/all-habits`);
});