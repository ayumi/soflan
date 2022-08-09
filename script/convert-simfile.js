// Usage: cat [simfile.ssc|simfile.sc] | convert-simfile.js > simfile.json
// This script reads a simfile from pipe in and outputs to stdout a parsed version in JSON format.

import _ from "lodash";

import * as readline from "readline";

process.stdin.resume();
process.stdin.setEncoding("utf8");

const reader = readline.createInterface({
  input: process.stdin,
  crlfDelay: Infinity,
});

// Initialize song data.
const song = {
  title: "",
  artist: "",
  charts: {},
  otherData: {},
};

const CHART_BASE = {
  level: 0,
  combo: 0,
  bpmDisplay: null,
  bpmMin: 0,
  bpmMax: 0,
  events: [],
  bpms: [],
  stops: [],
};

const DIFF_OVERRIDES = {
  "Easy": "Basic",
  "Medium": "Difficult",
  "Hard": "Expert",
}

let baseBpmsBeats = [];
let baseStopsBeats = [];
let baseDisplayBpm = null;

// Initialize difficulty specific stepchart data. This holds
// data while we fill it in during NOTEDATA and NOTES.
let chart = _.cloneDeep(CHART_BASE);
let chartType = "";
let chartDiff = "";
// Null now but will be set to [] later
let chartBpmsBeats = null;
let chartStopsBeats = null;
let chartBpmNext = null;
let chartStopNext = null;
let chartDisplayBpm = null;
let smNotesPropList = []; // SM format has #NOTES: followed by Chart type, Description/author,  Difficulty, meter, Groove radar values. Store the data here.
let measureLines = [];

// For sanity checking
let notesActive = false;
let noteDataActive = false;

// Measure and Combo
let t = 0;
let c = 0;

const resetChart = () => {
  chart = _.cloneDeep(CHART_BASE);
  chartType = "";
  chartDiff = "";
  chartBpmsBeats = null;
  chartStopsBeats = null;
  chartBpmNext = null;
  chartStopNext = null;
  chartDisplayBpm = null;
  smNotesPropList = [];
  measureLines = [];
  notesActive = false;
  noteDataActive = false;
  t = 0;
  c = 0;
};

// Turning events by beat to by combo
const addBpmEvents = () => {
  if (chartBpmNext && t >= chartBpmNext[0]) {
    const bpm = {
      t: chartBpmNext[0],
      c,
      b: chartBpmNext[1],
    };
    chart.events.push(bpm);
    chart.bpms.push(bpm);
    chartBpmNext = chartBpmsBeats.shift();
  }
};
const addStopEvents = () => {
  if (chartStopNext && t >= chartStopNext[0]) {
    const stop = {
      t: chartStopNext[0],
      c,
      s: chartStopNext[1],
    };
    chart.events.push(stop);
    chart.stops.push(stop);
    chartStopNext = chartStopsBeats.shift();
  }
};

// Helper for aborting
const logAndExit = (line, message) => {
  console.error(`Error: ${message}`);
  console.debug(`line: ${line}`);
  console.debug(`chartType: ${chartType}`);
  console.debug(`chartDiff: ${chartDiff}`);
  console.debug(`smNotesPropList: ${smNotesPropList}`);
  console.debug(`chart: ${JSON.stringify(chart)}`);
  process.exit(1);
};

reader.on("line", (line) => {
  line = line.trim()

  if (line.slice(0, 2) === "//" || line === "") {
    return;
  } else if (line === "#NOTEDATA:;") {
    if (noteDataActive) {
      logAndExit(line, "NOTEDATA while in previous NOTEDATA.");
    }
    // Init BPM changes and Stops by Beat. Later we calculate by Combo.
    chartBpmsBeats = _.cloneDeep(baseBpmsBeats);
    chartStopsBeats = _.cloneDeep(baseStopsBeats);
    noteDataActive = true;
    return;
  } else if (line === "#NOTES:") {
    if (notesActive) {
      logAndExit(line, "NOTES while in previous NOTES.");
    }
    // In case we didn't have NOTEDATA
    chartBpmsBeats = chartBpmsBeats || _.cloneDeep(baseBpmsBeats);
    chartStopsBeats = chartStopsBeats || _.cloneDeep(baseStopsBeats);
    chartBpmNext = chartBpmsBeats.shift();
    chartStopNext = chartStopsBeats.shift();
    notesActive = true;
    return;

    // Comma ends a measure in a NOTES, semicolon can as well.
  } else if (line === "," || line === ";") {
    const nextWholeT = t + 1;
    const tPerLine = 1 / measureLines.length;
    for (const mLine of measureLines) {
      // Only add events if arrows are present (nonzero)
      if (mLine.split("").some((s) => s !== "0")) {
        chart.events.push({
          t,
          c,
          n: mLine,
        });

        // Only add combo if there's notes besides hold tail (normal, hold head, roll head, mine all OK).
        if (
          mLine
            .split("")
            .some((s) => s === "1" || s === "2" || s === "4" || s === "M")
        ) {
          c++;
        }
      }
      t += tPerLine;
      addBpmEvents();
      addStopEvents();
    }
    t = nextWholeT;
    addBpmEvents();
    addStopEvents();
    measureLines = [];

    // When processing measure end (,), we can stop here.
    // When processing song end (;), then continue to song end logic.
    if (line == ",") {
      return
    }
  }

  // Semicolon ends NOTES and a chart
  if (line === ";") {
    if (!notesActive) {
      logAndExit(line, "Semicolon ; while not in NOTES.");
    }

    // Handle SM format
    // Unused: Description (1), Groove radar (4)
    if (smNotesPropList.length > 0) {
      chartType = smNotesPropList[0];
      chartDiff = smNotesPropList[2];
      chart.level = parseFloat(smNotesPropList[3]);
    }
    const bpmMin = chart.bpms[0] && chart.bpms[0].b
    const bpmMax = chart.bpms[chart.bpms.length - 1] && chart.bpms[chart.bpms.length - 1].b;
    chart.bpmMin = bpmMin;
    chart.bpmMax = bpmMax;
    chart.bpmDisplay = chartDisplayBpm || baseDisplayBpm || (bpmMin === bpmMax ? bpmMin : `${bpmMin}–${bpmMax}`);
    chart.combo = c;

    // Flush to song data and reset active chart
    const chartDiffKey = DIFF_OVERRIDES[chartDiff] || chartDiff;
    song.charts[chartType] = song.charts[chartType] || {};
    song.charts[chartType][chartDiffKey] = _.cloneDeep(chart);
    resetChart();
    return;
  }

  // If notes are active, then do notes stuff
  if (notesActive) {
    // Check if this is a notes prop line by looking for ending colon :
    if (line.slice(-1) === ":") {
      if (smNotesPropList.length >= 5) {
        logAndExit(line, "Over 5 NOTES colon props.");
      }
      const propData = line.trim().slice(0, -1);
      smNotesPropList.push(propData);

      // Otherwise it's a notes data line.
    } else {
      measureLines.push(line);
    }
    return;
  }

  // Old fashioned parsing
  if (line.slice(0, 1) !== "#" && line.slice(-1) !== ";") {
    logAndExit(line, "Malformed line; should start with # and end with ;");
  }
  const lineParts = line.slice(1, -1).split(":");
  const [key, value] = lineParts;
  switch (key) {
    case "TITLE":
      song.title = value;
      break;
    case "ARTIST":
      song.artist = value;
      break;
    case "BPMS":
      //0=100,20=200,52=825.608,63.875=200,128=100,160=200
      //[[0,100], [20,200], ...]
      const bpmsByBeat = value
        .split(",")
        .map((beatVal) => beatVal.split("=").map((s) => parseFloat(s)));
      if (noteDataActive || notesActive) {
        chartBpmsBeats = bpmsByBeat;
      } else {
        baseBpmsBeats = bpmsByBeat;
      }
      break;
    case "STOPS":
       const stopsByBeat = value
        .split(",")
        .map((beatVal) => beatVal.split("=").map((s) => parseFloat(s)));
      if (noteDataActive || notesActive) {
        chartStopsBeats = stopsByBeat;
      } else {
        baseStopsBeats = stopsByBeat;
      }
      break;
    case "STEPSTYPE":
      chartType = value;
      break;
    case "DIFFICULTY":
      chartDiff = value;
      break;
    case "METER":
      chart.level = parseFloat(value);
      break;
    case "DISPLAYBPM":
      // #DISPLAYBPM:90:270; -> BPM changes between two values.
      const displayBpmMax = lineParts[2];
      const displayBpmValue = displayBpmMax ? `${value}–${displayBpmMax}` : value;
      if (noteDataActive || notesActive) {
        chartDisplayBpm = displayBpmValue;
      } else {
        baseDisplayBpm = displayBpmValue;
      }
      break;
    default:
      _.set(song.otherData, key, value);
  }
});

reader.on("close", function () {
  console.log(JSON.stringify(song));
});