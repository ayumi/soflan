// For viewing 1 specific Chart (e.g. ACE FOR ACES ESP 15)
import React from 'react';

const Chart = (props) => {
  const chartData = props.chartData || {};
  const events = chartData.events || [];
  return (
    <div
      className='chart-beats'
    >
      {getBeats(events).map((beat, index) => {
        return <div
          className={`chart-beat chart-beat-mod-${index % 4}`}
          key={`chart-beat-${index}`}
        >
          {beat.events.map((event, index) => {
            return <div
              className={getEventClassName(event)}
              key={`chart-event-${index}`}
              style={{ top: `${100 * (event['t'] - Math.floor(event['t']))}%` }}
            >
              <span
                className={`event-combo ${event['c'] % 10 === 0 ? 'event-combo-mod-10' : ''}`}
              >
                {event['c']}
              </span>
              <span
                className='event-notes'
              >
                {renderEventNotes(event)}
              </span>
              <span
                className='event-extra'
              >
                {renderEventExtra(event)}
              </span>
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
    if (offset === 0) {
      name += ' chart-event-note-4';
    } else if (offset === 0.5) {
      name += ' chart-event-note-8';
    } else if (offset === 0.25 || offset === 0.75) {
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

function renderEventExtra(event) {
  if (event['n']) {
    return null;
  } else if (event['b']) {
    return (<span
      className='event-bpm'
    >
      {event['b']} BPM
    </span>);
  } else if (event['s']) {
    return (<span
      className='event-stop'
    >
      {event['s']}s
    </span>);
  } else {
    const shortEvent = { ...event };
    delete shortEvent['c'];
    delete shortEvent['t'];
    return (<span
      className='event-unknown'
    >
      {JSON.stringify(shortEvent)}
    </span>);
  }
}

// Events all have a t value which is the beat number
// This function adds empty beats where needed.
function getBeats(events) {
  if (!events || events.length === 0) {
    return []
  }

  let n = 0;
  let t = 0;
  const beats = [];
  let beatEvents = [];

  // When the first 2 events are bpm, long pause, then notes, don't
  // add empty beats for the long pause.
  if (events.length >= 2 && events[0]['b'] && events[1]['n'] &&
  events[1]['t'] >= events[0]['t'] + 1) {
    beats.push({ t, events: [events[0]] });
    n = 1;
    t = events[1]['t'];
  }

  for (; n < events.length; n++) {
    const ev = events[n];
    // We reached the next beat
    if (ev.t >= t + 1) {
      // Finalize the next beat with all buffered events
      beats.push({ t, events: beatEvents });
      beatEvents = [];
      t++;

      // Fill out empty beats.
      const extraBeats = Math.floor(ev.t - t);
      for (let n2 = 0; n2 < extraBeats; n2++) {
        beats.push({ t: t + n2, events: []});
      }
      t += extraBeats;
    }

    // Buffer events into the current beat
    beatEvents.push(ev);
  }
  // Last beat
  beats.push({ t, events: beatEvents });
  console.log(beats);
  window.beats = beats;
  return beats;
}

export default Chart
