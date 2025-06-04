// server.js
const express = require('express');
const path = require('path');
const app = express();

// Use the PORT environment variable if set (e.g., by Heroku, Render, etc.), otherwise default to 5001
const PORT = process.env.PORT || 5001;

// Middleware to parse JSON bodies (if you were to add API endpoints that accept JSON)
app.use(express.json());

// Serve static files from the React app's 'build' directory
// This is crucial for serving your production-ready React app
app.use(express.static(path.join(__dirname, 'build')));

// --- API Endpoints (Placeholder) ---
// If you were to build out a backend API, your routes would go here.
// For this Solo Leveling To-Do list (using localStorage), these are not strictly necessary
// but are good to have as placeholders for future expansion.

/*
app.get('/api/user', (req, res) => {
  // Example: Fetch user data from a database
  res.json({ message: "User data endpoint (not implemented)" });
});

app.get('/api/tasks', (req, res) => {
  // Example: Fetch tasks from a database
  res.json({ message: "Tasks endpoint (not implemented)" });
});

app.post('/api/tasks', (req, res) => {
  // Example: Add a new task to a database
  const newTask = req.body;
  console.log("Received new task (API):", newTask);
  res.status(201).json({ message: "Task created (not implemented)", task: newTask });
});
*/

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
// This is essential for client-side routing to work correctly.
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`[SYSTEM] Server listening on port ${PORT}`);
  console.log(`[SYSTEM] Serving static files from: ${path.join(__dirname, 'build')}`);
  console.log(`[SYSTEM] Access your app at http://localhost:${PORT} (if running locally)`);
});