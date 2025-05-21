// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
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
  Switch,
  FormControlLabel,
  Divider,
  IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import './App.css';

const BASE_URL = 'http://localhost:5000';

function App() {
  const [symptoms, setSymptoms] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [symptomsList, setSymptomsList] = useState([]);
  const [serverStatus, setServerStatus] = useState(false);
  const [streamingEnabled, setStreamingEnabled] = useState(true);
  const eventSourceRef = useRef(null);

  // Check server health on component mount
  useEffect(() => {
    const checkServer = async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/health`);
        setServerStatus(response.ok);
      } catch (err) {
        console.error('Server health check failed:', err);
        setServerStatus(false);
      }
    };
    
    checkServer();
    
    // Check server status periodically
    const interval = setInterval(checkServer, 10000);
    
    return () => {
      clearInterval(interval);
      // Clean up event source if it exists
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  const handleSymptomInput = (e) => {
    setSymptoms(e.target.value);
    const symptomsArray = e.target.value
      .split(',')
      .map(symptom => symptom.trim())
      .filter(symptom => symptom.length > 0);
    setSymptomsList(symptomsArray);
  };

  const removeSymptom = (indexToRemove) => {
    const updatedList = symptomsList.filter((_, index) => index !== indexToRemove);
    setSymptomsList(updatedList);
    setSymptoms(updatedList.join(', '));
  };

  const handleStreamingToggle = () => {
    setStreamingEnabled(!streamingEnabled);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!symptoms.trim()) {
      setError('Please enter your symptoms');
      return;
    }

    setLoading(true);
    setError('');
    setRecommendation('');

    // Close any existing event source
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    if (streamingEnabled) {
      // Streaming approach
      try {
        const response = await fetch(`${BASE_URL}/api/stream-recommendations`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ symptoms: symptomsList.join(', ') }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to get recommendation');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        setRecommendation('');
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.substring(6);
              
              if (data === '[DONE]') {
                break;
              }
              
              try {
                const parsedData = JSON.parse(data);
                if (parsedData.content) {
                  setRecommendation(prev => prev + parsedData.content);
                }
                if (parsedData.error) {
                  setError(parsedData.error);
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }
        }
      } catch (err) {
        console.error('Error with streaming:', err);
        setError(err.message || 'Failed to get recommendation. Please try again.');
      } finally {
        setLoading(false);
      }
    } else {
      // Non-streaming approach
      try {
        const response = await fetch(`${BASE_URL}/api/recommendations`, {
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
    }
  };

  return (
    <Container maxWidth="md" sx={{ my: 4 }}>
      {!serverStatus && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Server connection failed. Please check if the server is running.
        </Alert>
      )}

      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom className="app-title">
          Symptom Advisor
        </Typography>
        
        <Typography variant="body1" gutterBottom color="text.secondary" className="app-description">
          Enter your symptoms, separated by commas (e.g., headache, fever, cough)
        </Typography>

        <form onSubmit={handleSubmit} className="symptom-form">
          <TextField
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            label="Describe your symptoms"
            value={symptoms}
            onChange={handleSymptomInput}
            error={!!error}
            helperText={error}
            sx={{ mb: 2 }}
            placeholder="Enter symptoms separated by commas..."
            disabled={!serverStatus || loading}
            className="symptom-input"
          />

          {symptomsList.length > 0 && (
            <Box sx={{ mb: 3 }} className="symptoms-list">
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Your symptoms:</Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {symptomsList.map((symptom, index) => (
                  <Chip 
                    key={index} 
                    label={symptom} 
                    color="primary" 
                    variant="outlined"
                    onDelete={() => removeSymptom(index)}
                    deleteIcon={<DeleteIcon />}
                    className="symptom-chip"
                  />
                ))}
              </Stack>
            </Box>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={streamingEnabled}
                  onChange={handleStreamingToggle}
                  color="primary"
                />
              }
              label="Enable streaming response"
              disabled={loading}
            />
            
            <Button 
              variant="contained" 
              type="submit" 
              disabled={loading || !serverStatus || symptomsList.length === 0}
              sx={{ minWidth: 200 }}
              className="submit-button"
            >
              {loading ? <CircularProgress size={24} /> : 'Get Recommendation'}
            </Button>
          </Box>
        </form>

        {recommendation && (
          <Box sx={{ mt: 4 }} className="recommendation-container">
            <Divider sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Medical Recommendation:
            </Typography>
            <Paper elevation={1} sx={{ p: 3, bgcolor: 'rgba(240, 240, 245, 0.8)' }} className="recommendation-content">
              <Typography variant="body1" style={{ whiteSpace: 'pre-line' }}>
                {recommendation}
              </Typography>
            </Paper>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }} className="disclaimer">
              Disclaimer: This is general information only and should not replace professional medical advice.
              Always consult with a healthcare provider for proper diagnosis and treatment.
            </Typography>
          </Box>
        )}
      </Paper>
    </Container>
  );
}

export default App;