// Logic for loading Song data and picking charts. Wraps the Chart viewer.
import React, { useEffect, useRef, useState } from 'react';
import Select from 'react-select';

import Chart from './Chart';
import { writeUrlHash } from '../util'

const SONG_DATA_DEFAULT = { charts: [] };
const DIFFICULTY_LABELS = {
  'dance-single': {
    'Beginner': 'bSP',
    'Basic': 'BSP',
    'Difficult': 'DSP',
    'Expert': 'ESP',
    'Challenge': 'CSP',
  },
  'dance-double': {
    'Beginner': 'bDP',
    'Basic': 'BDP',
    'Difficult': 'DDP',
    'Expert': 'EDP',
    'Challenge': 'CDP',
  },
}

const Song = (props) => {
  const [songData, setSongData] = useState(SONG_DATA_DEFAULT);
  const [chartData, setChartData] = useState([]);
  const [chart, setChart] = useState(props.defaultChart);
  const selectChartRef = useRef();
  function handleSelectChartChange(option) {
    const newChart = option.value;
    setChart(newChart);
    setChartData(songData.charts[newChart]);
    writeUrlHash({ c: newChart });
  }

  useEffect(() => {
    const url = props.songUrl;
    if (url === null) {
      return
    }
    console.log('Fetching song data: ' + url);

    const fetchData = async () => {
      try {
        const response = await fetch(url);
        const data = await response.json();
        console.log('Receieved', data);
        setSongData(data);
      } catch (error) {
        console.log('error', error);
      }
    };

    fetchData();
  }, [props.songUrl]);

  // When songData is loaded, then auto select chart based on the current chart.
  // Otherwise default to the last chart available.
  useEffect(() => {
    if (!songData || !songData['charts'] || songData['charts'].length === 0) {
      return
    }

    if (chart && songData['charts']['chart']) {
      setChartData[chart];
    } else {
      const chartNames = Object.keys(songData['charts']);
      const newChart = chartNames[chartNames.length - 1];
      setChart(newChart);
      selectChartRef.current.setValue({
        value: newChart,
        label: `${getDifficultyLabel(newChart, props.chartType)} ${songData['charts'][newChart]['level']}`
      });
      setChartData(songData['charts'][newChart]);
      writeUrlHash({ c: newChart });
    }
  }, [songData]);

  // Each difficulty has a chart
  const chartOptions = Object.entries(songData.charts).map(([difficulty, chartData]) => {
    return {
      value: difficulty,
      label: `${getDifficultyLabel(difficulty, props.chartType)} ${songData.charts[difficulty]['level']}`
    }
  });

  return (
    <div className='song'>
      <div className='song-meta'>
        <Select
          className='select-chart'
          classNamePrefix='react-select'
          defaultValue={{ value: props.defaultChart, label: getDifficultyLabel(props.defaultChart, props.chartType) }}
          onChange={handleSelectChartChange}
          options={chartOptions}
          ref={selectChartRef}
        />
        {renderBpmSummary(chartData.bpms)}
        {renderStopSummary(chartData.stops)}
        <div className='summary-spacer'></div>
        <div className='bpm-graph'>
        </div>
      </div>
      <Chart
        chartData={chartData}
      />
    </div>
  );
}

function getDifficultyLabel(difficulty, chartType) {
  return DIFFICULTY_LABELS[chartType][difficulty] || difficulty;
}

function renderStopSummary(stops) {
  if (!stops || stops.length === 0) { return []; }

  return (<div className='stop-summary'>
    <div className='stop-label'>Stops</div>
    <div className='stop-value'>{stops.length}</div>
  </div>);
}

function renderBpmSummary(bpms) {
  if (!bpms || bpms.length === 0) { return []; }

  let bpmLow = bpms[0]['b'];
  let bpmHigh = bpms[0]['b'];
  for (let n = 1; n < bpms.length; n++) {
    if (bpms[n]['b'] < bpmLow) {
      bpmLow = bpms[n]['b'];
    }
    if (bpms[n]['b'] > bpmHigh) {
      bpmHigh = bpms[n]['b'];
    }
  }
  return (<div className='bpm-summary'>
    <div className='bpm-label'>BPM</div>
    <div className='bpm-value'>
      {Math.round(bpmLow)}{bpmHigh !== bpmLow ? `—${Math.round(bpmHigh)}` : ''}
    </div>
  </div>);
}

export default Song
