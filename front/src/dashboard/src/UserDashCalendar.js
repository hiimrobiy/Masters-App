import React, { useEffect, useState, useMemo, useCallback } from 'react';
import axios from 'axios';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction'; // <-- Important!

const softGreen = '#a5d6a7';
const softRed = '#ef9a9a';
const textColor = '#000000';

function UserDashCalendar({ userId }) {
  const [availability, setAvailability] = useState([]);

  useEffect(() => {
    if (userId) {
      const fetchAvailability = async () => {
        try {
          const res = await axios.get('http://localhost:5000/availability', {
            params: { user_id: userId },
            withCredentials: true,
          });
          setAvailability(res.data);
        } catch (error) {
          console.error('Error fetching user availability:', error);
        }
      };
      fetchAvailability();
    }
  }, [userId]);

  // Convert availability to events
  const events = useMemo(() => {
    return availability.map((day) => ({
      title: day.is_free ? 'Available' : 'Not Available',
      date: day.date,
      allDay: true,
      color: day.is_free ? softGreen : softRed,
      textColor: textColor,
      display: 'background',
    }));
  }, [availability]);

  // Date click handler
  const handleDateClick = useCallback(async (info) => {
     const clickedDateStr = info.dateStr;

    // Check if date already in local state
    const dayEntry = availability.find((d) => d.date === clickedDateStr);
    if (!dayEntry) {
      // If not found, default is assume 'is_free = true' (or false, your choice)
      // Push new object to local state
      const newObj = { date: clickedDateStr, is_free: true };
      setAvailability((prev) => [...prev, newObj]);

      // Also update server
      try {
        await axios.post(
          'http://localhost:5000/availability/toggle',
          { user_id: userId, date: clickedDateStr },
          { withCredentials: true }
        );
      } catch (error) {
        console.error('Error toggling availability:', error);
      }
    } else {
      // Toggle existing
      const updatedIsFree = !dayEntry.is_free;
      // Update local state
      setAvailability((prev) =>
        prev.map((d) =>
          d.date === clickedDateStr ? { ...d, is_free: updatedIsFree } : d
        )
      );

      // Update server
      try {
        await axios.post(
          'http://localhost:5000/availability/',
          { user_id: userId, date: clickedDateStr ,is_free: updatedIsFree},
          { withCredentials: true }
        );
      } catch (error) {
        console.error('Error toggling availability:', error);
      }
    }
  }, [availability, userId]);

  return (
    <div style={{ width: '100%', marginTop: '1rem' }}>
      <h3>Availability Calendar</h3>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]} // <-- Add interactionPlugin
        initialView="dayGridMonth"
        events={events}
        height="auto"
        eventDisplay="background"
        headerToolbar={{
          left: 'prev,next',
          center: 'title',
          right: '',
        }}
        dateClick={handleDateClick} // Now recognized because of interactionPlugin
      />
    </div>
  );
}

export default UserDashCalendar;
