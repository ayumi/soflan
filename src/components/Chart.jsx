// For viewing 1 specific Chart (e.g. ACE FOR ACES ESP 15)
import React from 'react';

const Chart = (props) => {
  const chartData = props.chartData || {};
  const events = chartData.events || [];
  return (
    <div>
      {events.map((event, index) => {
        return <div key={`chart-event-${index}`}>
          {JSON.stringify(event)}
        </div>
      })}
    </div>
  );
}

export default Chart
