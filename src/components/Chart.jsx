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
              <span
                className='event-combo'
              >
                {event['c']}
              </span>
              {renderEventNotes(event)}
              {event['n'] ? '' : JSON.stringify(event)}
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
    const offset = event['t'] - Math.floor(event['t']);
    if (offset === 0 || offset === 0.25 || offset === 0.5 || offset === 0.75) {
      name += ' chart-event-note-4';
    } else if (offset === 0.125 || offset === 0.375 || offset === 0.625 || offset === 0.875) {
      name += ' chart-event-note-8';
    } else if (offset === 0.0625 || offset === 0.1875 || offset === 0.3125 || offset === 0.4375 || offset === 0.5625 || offset === 0.6875 || offset === 0.8125 || offset === 0.9375) {
      name += ' chart-event-note-16';
    }
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
  return buffer;
}

// Events all have a t value which is the time or measure number
// This function groups events by measure for easier display
// It adds empty measures where needed.
function getMeasures(events) {
  if (!events || events.length === 0) {
    return []
  }

  let n = 0;
  let t = 0;
  const measures = [];
  let measureEvents = [];

  // When the first 2 events are bpm, long pause, then notes, don't
  // add empty measures for the long pause.
  if (events.length >= 2 && events[0]['b'] && events[1]['n'] &&
  events[1]['t'] >= events[0]['t'] + 1) {
    measures.push({ t, events: [events[0]] });
    n = 1;
    t = events[1]['t'];
  }

  for (; n < events.length; n++) {
    const ev = events[n];
    // We reached the next measure
    if (ev.t >= t + 1) {
      // Finalize the next measure with all buffered events
      measures.push({ t, events: measureEvents });
      measureEvents = [];
      t++;

      // Fill out empty measures.
      const extraMeasures = Math.floor(ev.t - t);
      for (let n2 = 0; n2 < extraMeasures; n2++) {
        measures.push({ t: t + n2, events: []});
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
