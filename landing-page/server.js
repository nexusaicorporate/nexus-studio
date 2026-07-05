const express = require('express');
const path = require('path');

const app = express();
const PORT = 3001;

// Serve static files from the landing-page directory
app.use(express.static(path.join(__dirname, '.')));

// Serve index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Landing page server running on http://localhost:${PORT}`);
});
