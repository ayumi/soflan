// Logic for loading Song data and picking charts. Wraps the Chart viewer.
import React, { useEffect, useRef, useState } from 'react';
import Select from 'react-select';
import { Scatter as ScatterChart } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip
);

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

  const [bpmLow, bpmHigh] = getBpmLowAndHigh(chartData);

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
        {renderBpmSummary(bpmLow, bpmHigh)}
        {renderStopSummary(chartData.stops)}
        <div className='summary-spacer'></div>
        <div className='bpm-graph'>
          {chartData.bpms ? (
            <ScatterChart
              data={getBpmGraphData(chartData)}
              options={getBpmGraphDataOptions(bpmLow, bpmHigh, chartData.combo)}
            />
          ) : null}
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

function getBpmLowAndHigh(chartData) {
  const bpms = chartData.bpms;
  if (!bpms || bpms.length === 0) { return [0, 0]; }

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
  return [bpmLow, bpmHigh]
}

function renderStopSummary(stops) {
  if (!stops || stops.length === 0) { return []; }

  return (<div className='stop-summary'>
    <div className='stop-label'>Stops</div>
    <div className='stop-value'>{stops.length}</div>
  </div>);
}

function renderBpmSummary(bpmLow, bpmHigh) {
  if (!bpmLow && !bpmHigh) { return []; }

  return (<div className='bpm-summary'>
    <div className='bpm-label'>BPM</div>
    <div className='bpm-value'>
      {Math.round(bpmLow)}{bpmHigh !== bpmLow ? `—${Math.round(bpmHigh)}` : ''}
    </div>
  </div>);
}

function getBpmGraphData(chartData) {
  // Add a point with the max combo so the graph is drawn fully to the right
  const lastNoteBpm = {
    x: chartData.events[chartData.events.length - 1]['c'],
    y: chartData.bpms[chartData.bpms.length - 1]['b'],
   }
  return {
    datasets: [
      {
        id: 1,
        label: '',
        data: chartData.bpms.map(bpm => ({ x: bpm['c'], y: bpm['b'] })).concat([lastNoteBpm]),
        borderColor: 'magenta',
        borderWidth: 1,
        stepped: true,
        pointStyle: false,
        showLine: true,
      },
    ],
  };
}

function getBpmGraphDataOptions(bpmLow, bpmHigh, maxCombo) {
  return {
    animation: false,
    maintainAspectRatio: false,
    responsive: true,
    layout: {
      autoPadding: false,
      padding: {
        right: 5,
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        min: 0,
        max: maxCombo,
        grid: {
          tickLength: 1,
        },
        ticks: {
          display: false,
          stepSize: 100,
        },
      },
      y: {
        beginAtZero: true,
        display: false,
        min: bpmLow,
        max: bpmHigh,
        ticks: { display: false },
      },
    }
  }
}

export default Song
