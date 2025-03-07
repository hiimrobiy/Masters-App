import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { Box, Card, CardContent, Typography, IconButton, Tooltip, Chip, Stack } from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { createTheme, ThemeProvider } from '@mui/material/styles';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

// A custom theme for consistent styling
const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    // We'll rely more on custom colors below rather than palette success/error
  },
  typography: {
    fontFamily: 'Roboto, sans-serif',
  },
});

const softGreen = '#a5d6a7'; // soft, pastel green
const softRed = '#ef9a9a'; // soft, pastel red
const textColor = '#000000'; // black text for good contrast on pastel background

const AvailabilityCalendar = ({ user }) => {
  const [availability, setAvailability] = useState([]); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const res = await axios.get('http://localhost:5000/availability', {
          params: { user_id: user.id },
          withCredentials: true
        });
        setAvailability(res.data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching availability:', error);
        setLoading(false);
      }
    };
    fetchAvailability();
  }, [user.id]);

  const events = useMemo(() => {
    return availability.map(day => ({
      title: day.is_free ? 'Available' : 'Not Available',
      date: day.date,
      allDay: true, // mark as all-day so no time shows
      // Use softer colors:
      color: day.is_free ? softGreen : softRed,
      textColor: textColor,
      display: 'background' // show as a background highlight
    }));
  }, [availability]);

  const handleDateClick = async (info) => {
    const dateString = info.dateStr;
    const dayRecord = availability.find(a => a.date === dateString);

    // Toggle availability
    const currentStatus = dayRecord ? dayRecord.is_free : true; 
    const newStatus = !currentStatus;

    try {
      await axios.post('http://localhost:5000/availability', {
        user_id: user.id,
        date: dateString,
        is_free: newStatus
      }, { withCredentials: true });

      setAvailability(prev => prev.map(a => 
        a.date === dateString ? { ...a, is_free: newStatus } : a
      ));
    } catch (error) {
      console.error('Error updating availability:', error);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box sx={{ maxWidth: 900, margin: 'auto', mt: 4 }}>
        <Card variant="outlined" sx={{ borderRadius: '8px' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="h5" component="div" sx={{ flexGrow: 1 }}>
                {`Availability for ${user.username}`}
              </Typography>
              <Tooltip title="Click on a day to toggle your availability. Green = Available, Red = Unavailable">
                <IconButton>
                  <InfoIcon />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Legend */}
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <Chip
                label="Available"
                sx={{
                  backgroundColor: softGreen,
                  color: textColor,
                  fontWeight: 'bold',
                }}
              />
              <Chip
                label="Not Available"
                sx={{
                  backgroundColor: softRed,
                  color: textColor,
                  fontWeight: 'bold',
                }}
              />
            </Stack>

            {loading ? (
              <Typography variant="body1">Loading calendar...</Typography>
            ) : (
              <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                events={events}
                dateClick={handleDateClick}
                height="auto"
                eventDisplay="background"
                // We can also disable display of event titles since we show them as background highlights:
                eventContent={() => null}
              />
            )}
          </CardContent>
        </Card>
      </Box>
    </ThemeProvider>
  );
};

export default AvailabilityCalendar;
