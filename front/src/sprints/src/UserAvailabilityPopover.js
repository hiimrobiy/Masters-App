import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import Popover from '@mui/material/Popover';
import Typography from '@mui/material/Typography';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';

const softGreen = '#a5d6a7';
const softRed = '#ef9a9a';
const textColor = '#000000';

const UserAvailabilityPopover = ({ anchorEl, userId, onClose ,userName}) => {
  const open = Boolean(anchorEl);
  const [availability, setAvailability] = useState([]);
  
  useEffect(() => {
    if (open && userId) {
      // Fetch availability when popover is opened
      const fetchAvailability = async () => {
        try {
          const res = await axios.get('http://localhost:5000/availability', {
            params: { user_id: userId },
            withCredentials: true
          });
          setAvailability(res.data);
        } catch (error) {
          console.error('Error fetching user availability:', error);
        }
      };
      fetchAvailability();
    }
  }, [open, userId]);

  const events = useMemo(() => {
    return availability.map(day => ({
      title: day.is_free ? 'Available' : 'Not Available',
      date: day.date,
      allDay: true,
      color: day.is_free ? softGreen : softRed,
      textColor: textColor,
      display: 'background'
    }));
  }, [availability]);

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
    
      anchorOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'left',
      }}
      style={{ pointerEvents: 'none',zIndex:9999 }} // so it behaves more like a tooltip
      PaperProps={{ style: { pointerEvents: 'auto', padding: '8px', maxWidth: '300px' } }}
    >
      <Typography variant="subtitle1" gutterBottom>
        {`${userName} availability`}
      </Typography>
      <div style={{ width: '250px' }}>
        <FullCalendar
          plugins={[dayGridPlugin]}
          initialView="dayGridMonth"
          events={events}
          height="auto"
          eventDisplay="background"
          eventContent={() => null}
          headerToolbar={false}
          footerToolbar={false}
          navLinks={false}
          editable={false}
          selectable={false}
          dayMaxEventRows={1}
        />
      </div>
    </Popover>
  );
};

export default UserAvailabilityPopover;
