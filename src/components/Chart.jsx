// For viewing 1 specific Chart (e.g. ACE FOR ACES ESP 15)
import React from 'react';

const Chart = (props) => {
  const chartData = props.chartData || {};
  const events = chartData.events || [];
  return (
    <div
      className='chart-measures'
    >
      {getMeasures(events).map((measure, index) => {
        return <div
          className='chart-measure'
          key={`chart-measure-${index}`}
        >
          {measure.events.map((event, index) => {
            return <div
              className={getEventClassName(event)}
              key={`chart-event-${index}`}
              style={{ top: `${100 * (event['t'] - Math.floor(event['t']))}%` }}
            >
              {event['n'] ? '' : JSON.stringify(event)}
              {renderEventNotes(event)}
            </div>
          })}
        </div>
      })}
    </div>
  );
}

function getEventClassName(event) {
  let name = 'chart-event';
  if (event['b']) {
    name += ' chart-event-bpm';
  }
  if (event['s']) {
    name += ' chart-event-stop';
  }
  if (event['n']) {
    name += ' chart-event-note';
  }
  return name;
}

// TODO: Support doubles notes
function renderEventNotes(event) {
  if (!event['n']) { return null }
  let buffer = [];
  for (let i = 0; i < event['n'].length; i++) {
    buffer.push(<span
      className={`event-note note-${i} note-val-${event['n'][i]}`}
      key={`note-${i}`}
    ></span>);
  }
  return (
    <div
      className='event-notes'
    >
      {buffer}
    </div>
  );
}

// Events all have a t value which is the time or measure number
// This function groups events by measure for easier display
// It adds empty measures where needed.
function getMeasures(events) {
  let t = 0;
  const measures = [];
  let measureEvents = [];
  for (const ev of events) {
    // We reached the next measure
    if (ev.t >= t + 1) {
      // Finalize the next measure with all buffered events
      measures.push({ t, events: measureEvents });
      measureEvents = [];
      t++;

      // If needed, fill out empty measures
      const extraMeasures = Math.floor(ev.t - t);
      for (let n = 0; n < extraMeasures; n++) {
        measures.push({ t: t + n, events: []});
      }
      t += extraMeasures;
    }

    // Buffer events into the current measure
    measureEvents.push(ev);
  }
  // Last measure
  measures.push({ t, events: measureEvents });
  console.log(measures);
  window.measures = measures;
  return measures;
}

export default Chart
