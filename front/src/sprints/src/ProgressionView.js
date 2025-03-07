import React from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LabelList,
  ResponsiveContainer,
} from 'recharts';

/**
 * tasks: Array of objects, each with:
 *   {
 *     task_title: "Task A",
 *     issues: [
 *       {
 *         issue_title: "Issue #1",
 *         expected_time: number,
 *         elapsed_time: number
 *       },
 *       ...
 *     ]
 *   },
 *   ...
 *
 * We'll create one row per issue, plus one summary row for each task.
 */
const TasksAndIssuesProgressChart = ({ tasks }) => {
  const threshold = 0.8; // 80% threshold for "warning"

  // ---- 1) Build chart data: (rows for issues + row for task total)
  let chartData = [];

  tasks.forEach((task) => {
    let taskExpectedSum = 0;
    let taskElapsedSum = 0;

    // For each issue in this task, create one row
    task.issues.forEach((issue) => {
      const expected = Number(issue.expected_time || 0);
      const elapsed = Number(issue.elapsed_time || 0);

      taskExpectedSum += expected;
      taskElapsedSum += elapsed;

      const onTime = Math.min(elapsed, expected);
      const over = elapsed > expected ? elapsed - expected : 0;
      const remaining = elapsed < expected ? expected - elapsed : 0;

      chartData.push({
        label: `   - ${issue.issue_title}`, // Indent or any style to show it's an issue
        isTaskSummary: false,
        task: task.task_title,
        issue: issue.issue_title,
        onTime,
        over,
        remaining,
        expected,
        elapsed,
      });
    });

    // After all issues, add a "summary row" for the task
    const onTimeTotal = Math.min(taskElapsedSum, taskExpectedSum);
    const overTotal =
      taskElapsedSum > taskExpectedSum ? taskElapsedSum - taskExpectedSum : 0;
    const remainingTotal =
      taskElapsedSum < taskExpectedSum ? taskExpectedSum - taskElapsedSum : 0;

    // Check if we exceed threshold
    const ratio = taskExpectedSum ? taskElapsedSum / taskExpectedSum : 0;
    const isWarning = ratio >= threshold;

    chartData.push({
      label: `${task.task_title} (Total)`,
      isTaskSummary: true,
      isWarning, // if total usage is above threshold
      task: task.task_title,
      onTime: onTimeTotal,
      over: overTotal,
      remaining: remainingTotal,
      expected: taskExpectedSum,
      elapsed: taskElapsedSum,
    });
  });

  // 2) If you want to keep tasks grouped, we can rely on the fact
  //    we're pushing issues first, then the summary row. 
  //    So the array is already in the order: [Issues..., Summary] 
  //    for each task in the order they appear in 'tasks'.
  //    If you need alphabetical or other sorting, you can do so here.

  // ---- 3) Custom Tooltip to display more detail
  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload || !payload.length) return null;

    // Because we have stacked bars, "payload[0].payload" is our data row
    const data = payload[0].payload;
    const difference = data.elapsed - data.expected;

    return (
      <div
        style={{
          backgroundColor: '#fff',
          border: '1px solid #ccc',
          padding: '0.5rem',
          borderRadius: '4px',
        }}
      >
        <strong>{label}</strong>
        <div>Expected: {data.expected}h</div>
        <div>Elapsed: {data.elapsed}h</div>
        {difference > 0 ? (
          <div style={{ color: 'red' }}>
            Over by {difference}h
          </div>
        ) : difference < 0 ? (
          <div style={{ color: 'green' }}>
            Under by {Math.abs(difference)}h
          </div>
        ) : (
          <div style={{ color: 'blue' }}>
            Exactly on target!
          </div>
        )}

        {data.isTaskSummary && data.isWarning && (
          <div style={{ color: '#d32f2f', marginTop: '0.5rem', fontWeight: 'bold' }}>
            Task usage is above {Math.round(threshold * 100)}% of estimate!
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        maxWidth: '100%',
        margin: '0 auto',
        padding: '1rem',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
      }}
    >
      <h2 style={{ textAlign: 'center', marginBottom: '1rem' }}>
        Tasks and Issues Progress
      </h2>

      <div style={{ width: '100%', height: 600 }}>
        <ResponsiveContainer>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 20, right: 20, left: 180, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              label={{ value: 'Hours', position: 'insideBottomRight', offset: -5 }}
            />
            <YAxis
              dataKey="label"
              type="category"
              width={170}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* 
              We'll do custom coloring for summary rows if they're in warning state.
              This requires using <Cell> in each Bar to color individually.
            */}
            <Bar dataKey="onTime" stackId="progress" name="On-Time">
              {chartData.map((entry, index) => {
                // If it's a summary row in warning, color differently
                if (entry.isTaskSummary && entry.isWarning) {
                  return <Cell key={index} fill="#ff7961" />; 
                  // A lighter red
                } else if (entry.isTaskSummary) {
                  return <Cell key={index} fill="#66bb6a" />; 
                  // A different color for summary row (greenish)
                } else {
                  return <Cell key={index} fill="#3f51b5" />;
                }
              })}
              <LabelList
                dataKey="onTime"
                position="insideLeft"
                fill="#fff"
                formatter={(val) => (val > 0 ? val : '')}
              />
            </Bar>

            <Bar dataKey="over" stackId="progress" name="Over">
              {chartData.map((entry, index) => {
                if (entry.isTaskSummary && entry.isWarning) {
                  return <Cell key={index} fill="#ef5350" />; // a deeper red
                } else if (entry.isTaskSummary) {
                  return <Cell key={index} fill="#ffb74d" />; // orange for summary row
                } else {
                  return <Cell key={index} fill="#d32f2f" />;
                }
              })}
              <LabelList
                dataKey="over"
                position="insideLeft"
                fill="#fff"
                formatter={(val) => (val > 0 ? `+${val}` : '')}
              />
            </Bar>

            <Bar dataKey="remaining" stackId="progress" name="Remaining">
              {chartData.map((entry, index) => {
                if (entry.isTaskSummary && entry.isWarning) {
                  return <Cell key={index} fill="#ffcdd2" />;
                } else if (entry.isTaskSummary) {
                  return <Cell key={index} fill="#c8e6c9" />;
                } else {
                  return <Cell key={index} fill="#9e9e9e" />;
                }
              })}
              <LabelList
                dataKey="remaining"
                position="insideRight"
                fill="#000"
                formatter={(val) => (val > 0 ? val : '')}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default TasksAndIssuesProgressChart;
