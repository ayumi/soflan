// For viewing 1 specific Chart (e.g. ACE FOR ACES ESP 15)
import React from 'react';

// Stop beat values will be quantized to this
const T_QUANT = 1 / 32;

const Chart = (props) => {
  const chartData = props.chartData || {};
  const events = chartData.events || [];
  return (
    <div
      className='chart'
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
              style={getEventStyle(event)}
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
  if (event['h']) {
    name += ' chart-event-hold';
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

function getEventStyle(event) {
  const style = { top: `${100 * (event['t'] - Math.floor(event['t']))}%` }
  if (event['tEnd']) {
    style['height'] = `${100 * (event['tEnd'] - event['t'])}%`
  } else if (event['h']) {
    style['bottom'] = 0;
  }
  return style
}

// TODO: Support doubles notes
function renderEventNotes(event) {
  const data = event['n'] || event['h'];
  if (!data) { return null }
  let buffer = [];
  for (let i = 0; i < data.length; i++) {
    buffer.push(<span
      className={`event-note note-${i} note-val-${data[i]}`}
      key={`note-${i}`}
    ></span>);
  }
  return buffer;
}

function renderEventExtra(event) {
  if (event['n'] || event['h']) {
    return null;
  } else if (event['b']) {
    return (<span
      className='event-bpm'
    >
      {Math.round(event['b'])}
      <span className='bpm-label'>BPM</span>
    </span>);
  } else if (event['s']) {
    return (<span
      className='event-stop'
    >
      {event['s']}
      <span className='stop-label'>Beat</span>
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
  let bpm = events[0]['b'];
  let secondsPerBeat = 60 / bpm;
  const beats = [];
  let beatEvents = [];
  let holdStarts = {}; // { 0: 34.5 } Tracks active hold notes

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
      // If holds are still pending, generate hold body events
      beatEvents = beatEvents.concat(getHoldEvents(holdStarts));
      // Finalize the last beat with all buffered events
      beats.push({ t, events: beatEvents });
      beatEvents = [];
      t++;
      // HACK: Update hold tStarts to this beat
      Object.keys(holdStarts).forEach(noteIndex => {
        holdStarts[noteIndex] = t;
      });

      // Fill out empty beats.
      const extraBeats = Math.floor(ev.t - t);
      for (let n2 = 0; n2 < extraBeats; n2++) {
        let extraBeatEvents = [];
        // Replace holds's t start values with this empty measure's t value.
        const emptyBeatHoldStarts = Object.fromEntries(
          Object.entries(holdStarts).map(([k, _tStart]) => [k, t + n2])
        );
        extraBeatEvents = extraBeatEvents.concat(
          getHoldEvents(emptyBeatHoldStarts)
        );
        beats.push({ t: t + n2, events: extraBeatEvents});
      }
      t += extraBeats;
      // HACK: Update hold tStarts to this beat
      Object.keys(holdStarts).forEach(noteIndex => {
        holdStarts[noteIndex] = t;
      });
    }

    // Convert stops from seconds to beats
    if (ev['b']) {
      bpm = ev['b'];
      secondsPerBeat = 60 / bpm;
    }
    if (ev['s']) {
      ev['s'] = ev['s'] / secondsPerBeat;
      // Round to the the nearest 1/32 beat.
      ev['s'] = Math.round(ev['s'] * 32) / 32;
    }

    // Buffer events into the current beat
    beatEvents.push(ev);

    // Handle hold starts (2) and ends (3)
    if (ev['n']) {
      let holdsChanged = false;
      for (let i = 0; i < ev['n'].length; i++) {
        if (ev['n'][i] === '2') {
          holdStarts[i] = ev['t'];
          holdsChanged = true;
          // console.log(t, 'set hold', i);
        } else if (ev['n'][i] === '3') {
          // Emit hold event with t start and tEnd
          // console.log(t, 'emit hold event with start and end');
          beatEvents = beatEvents.concat(
            getHoldEvents({ [i]: holdStarts[i] }, { [i]: ev['t'] })
          );
          delete holdStarts[i];
          holdsChanged = true;
          // console.log(t, 'unset hold', i);
        }
      }
      // if (holdsChanged) {
      //   console.log(t, 'holdsChanged');
      //   beatEvents = beatEvents.concat(getHoldEvents(holdStarts));
      // }
    }
  }
  // Last beat
  beats.push({ t, events: beatEvents });
  // console.log(beats);
  window.beats = beats;
  return beats;
}

// Input: { 1: 34.5, 2: 34.75 }
// Output: [ { t: 34.5, h: "0H" }, { t: 34.75, h: "00H"} ]
// Input: { 1: 34.5 }, { 1: 35 }
// Output: [ { t: 34.5, tEnd: 35, h: "0H" } ]
// tOverride is for measures where you hold continuously
function getHoldEvents(holdStarts, holdEnds) {
  // console.log('getHoldEvents', holdStarts, holdEnds);
  const events = [];
  Object.entries(holdStarts).forEach(([noteIndex, tHoldStart]) => {
    noteIndex = parseInt(noteIndex);
    const data = new Array(noteIndex + 1).fill('0');
    data[noteIndex] = 'h';
    const event = { t: tHoldStart, h: data.join('') };
    if (holdEnds && holdEnds[noteIndex]) {
      // console.log('adding tEnd');
      event['tEnd'] = holdEnds[noteIndex];
    }
    // console.log('event', JSON.stringify(event));
    events.push(event);
  });
  return events;
}

export default Chart
