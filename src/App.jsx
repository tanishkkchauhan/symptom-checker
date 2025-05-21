// src/App.jsx
import React, { useState, useEffect } from 'react';
import { 
  Container, 
  TextField, 
  Button, 
  Paper, 
  Typography, 
  CircularProgress,
  Box,
  Chip,
  Stack,
  Alert,
  Snackbar 
} from '@mui/material';
import './App.css';

const API_URL = 'http://localhost:5101/api/recommendations';

function App() {
  const [symptoms, setSymptoms] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [symptomsList, setSymptomsList] = useState([]);
  const [serverStatus, setServerStatus] = useState(false);

  // Check server health on component mount
  useEffect(() => {
    const checkServer = async () => {
      try {
        const response = await fetch('http://localhost:5101/api/health');
        setServerStatus(response.ok);
      } catch (err) {
        console.error('Server health check failed:', err);
        setServerStatus(false);
      }
    };
    checkServer();
  }, []);

  const handleSymptomInput = (e) => {
    setSymptoms(e.target.value);
    const symptomsArray = e.target.value
      .split(',')
      .map(symptom => symptom.trim())
      .filter(symptom => symptom.length > 0);
    setSymptomsList(symptomsArray);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!symptoms.trim()) {
      setError('Please enter your symptoms');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ symptoms: symptomsList.join(', ') }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get recommendation');
      }

      setRecommendation(data.recommendation);
    } catch (err) {
      console.error('Error:', err);
      setError(err.message || 'Failed to get recommendation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      {!serverStatus && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Server connection failed. Please check if the server is running.
        </Alert>
      )}

      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Symptom Advisor
        </Typography>
        
        <Typography variant="body1" gutterBottom color="text.secondary">
          Enter your symptoms, separated by commas (e.g., headache, fever, cough)
        </Typography>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            multiline
            rows={4}
            variant="outlined"
            label="Describe your symptoms"
            value={symptoms}
            onChange={handleSymptomInput}
            error={!!error}
            helperText={error}
            sx={{ mb: 2 }}
            placeholder="Enter symptoms separated by commas..."
            disabled={!serverStatus}
          />

          {symptomsList.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
              {symptomsList.map((symptom, index) => (
                <Chip 
                  key={index} 
                  label={symptom} 
                  color="primary" 
                  variant="outlined"
                />
              ))}
            </Stack>
          )}

          <Button 
            variant="contained" 
            type="submit" 
            disabled={loading || !serverStatus}
            sx={{ mb: 2 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Get Recommendation'}
          </Button>
        </form>

        {recommendation && (
          <Box sx={{ mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              Recommendation:
            </Typography>
            <Paper elevation={1} sx={{ p: 2, bgcolor: 'grey.50' }}>
              <Typography variant="body1" style={{ whiteSpace: 'pre-line' }}>
                {recommendation}
              </Typography>
            </Paper>
          </Box>
        )}
      </Paper>
    </Container>
  );
}

export default App;