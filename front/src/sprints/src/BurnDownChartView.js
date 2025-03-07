import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// Helper to get all dates inclusive
function getAllDatesBetween(startDateStr, endDateStr) {
  const dates = [];
  let current = new Date(startDateStr);
  let end = endDateStr != null ? new Date(endDateStr) : new Date();
  while (current <= end) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

// Generate ideal line
function generateIdealLine(issues,dates, totalEstimated) {
  let remaining = totalEstimated;
  const usedIssues = new Set();
  const dataPoints = [];

  dates.forEach((dateObj) => {
    const issuesDue = [];
    issues.forEach((issue) => {
      if (
        issue.end_date &&
        new Date(issue.end_date) <= dateObj &&
        !usedIssues.has(issue)
      ) {
        // Subtract either expected_time or elapsed_time:
        remaining -= issue.expected_time;
        usedIssues.add(issue);
        issuesDue.push(issue.issue_title);
      }
    });
    dataPoints.push({
      date: dateObj.toISOString().split('T')[0],
      ideal: Math.max(remaining, 0),
      issuesDue: issuesDue, 
    });
  });
  return dataPoints;
}

// Generate actual line
function generateActualLine(issues, dates, totalEstimated) {
  let remaining = totalEstimated;
  const usedIssues = new Set();
  const dataPoints = [];
 

  dates.forEach((dateObj) => {
    const issuesCompleted = [];
    issues.forEach((issue) => {
      if (
        issue.finished_date && issue.end_date &&
        new Date(issue.finished_date) <= dateObj &&
        !usedIssues.has(issue)
      ) {
        // Subtract either expected_time or elapsed_time:
        remaining -= issue.expected_time;
        usedIssues.add(issue);
        issuesCompleted.push(issue.issue_title); 
        
        
      }
    });
    dataPoints.push({
      date: dateObj.toISOString().split('T')[0],
      actual: Math.max(remaining, 0),
      issuesCompleted: issuesCompleted
    });
  });
  return dataPoints;
}

const BurndownChartView = ({ sprint }) => {

  
  // 1) Gather all issues from tasks
  const allIssues = (sprint.tasks || []).flatMap((task) => task.issues || []);

  // 2) Sum totalEstimated from all issues
  const totalEstimated = allIssues.reduce((sum, issue) => sum + (Number(issue.expected_time) || 0), 0);

  // 3) Get array of each day from sprint.start_date to sprint.end_date
  const dates = useMemo(() => {
    if (!sprint.start_date || !sprint.end_date) return [];
    return getAllDatesBetween(sprint.start_date, sprint.end_date);
  }, [sprint.start_date, sprint.end_date]);

  // 4) Build "ideal" line
  const idealLine = useMemo(() => {
    if (!dates.length) return [];
    return generateIdealLine(allIssues, dates,totalEstimated);
  }, [dates, totalEstimated]);

  // 5) Build "actual" line
  const actualLine = useMemo(() => {
    if (!dates.length) return [];
    return generateActualLine(allIssues, dates, totalEstimated);
  }, [dates, allIssues, totalEstimated]);

  // 6) Merge the lines into single data array for Recharts
  // Each day => { date: '2025-01-01', ideal: number, actual: number }
  const chartData = useMemo(() => {
    return dates.map((_, i) => {
      return {
        date: idealLine[i]?.date,
        ideal: idealLine[i]?.ideal,
        actual: actualLine[i]?.actual,
        issuesDue: idealLine[i]?.issuesDue || [], // Include issues that were due
        issuesCompleted: actualLine[i]?.issuesCompleted || [] // Include issues that were completed
      };
    });
  }, [dates, idealLine, actualLine]);
  

  if (!dates.length) {
    return <div>No sprint date range specified.</div>;
  }
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const { issuesDue, issuesCompleted } = payload[0].payload;
  
      return (
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #ccc',
          borderRadius: '8px',
          padding: '10px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          fontSize: '14px',
          lineHeight: '1.5',
        }}>
          <p style={{ marginBottom: '8px', fontWeight: 'bold' }}>{`Date: ${label}`}</p>
          <p style={{ marginBottom: '4px' }}><strong>Ideal Remaining:</strong> {payload[0].value}</p>
          <p style={{ marginBottom: '8px' }}><strong>Actual Remaining:</strong> {payload[1]?.value || '-'}</p>
          {issuesDue.length > 0 && (
            <div>
              <strong>Issues Due:</strong>
              <ul style={{ paddingLeft: '20px', marginTop: '4px' }}>
                {issuesDue.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
          {issuesCompleted.length > 0 && (
            <div>
              <strong>Issues Completed:</strong>
              <ul style={{ paddingLeft: '20px', marginTop: '4px' }}>
                {issuesCompleted.map((issue, index) => (
                  <li key={index}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    }
  
    return null;
  };

  return (
    <div style={{ width: '100%', height: '400px' }}>
      <h2>Burndown Chart</h2>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
          <XAxis dataKey="date" />
          <YAxis label={{ value: 'Remaining (Hours)', angle: -90, position: 'insideLeft' }} />
          <Tooltip content={<CustomTooltip />} />
          <Legend />

          <Line
            type="monotone"
            dataKey="ideal"
            stroke="#8884d8"
            strokeDasharray="4 4"
            name="Ideal"
          />
          <Line
            type="monotone"
            dataKey="actual"
            stroke="#ff4d4f"
            name="Actual"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BurndownChartView;
