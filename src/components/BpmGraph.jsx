// For viewing BPM graph of a chart
// This was separated out to hold state of the viewport from bubbling to Chart
import React, { useRef, useState, forwardRef, useImperativeHandle } from 'react';
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

// Stop beat values will be quantized to this
const T_QUANT = 1 / 32;

const BpmGraph = (props, ref) => {
  const chartData = props.chartData || {};
  const events = chartData.events || [];
  const [viewportLeft, setViewportLeft] = useState(0);
  const [viewportRight, setViewportRight] = useState(0);
  const mainRef = useRef();
  const chartJsRef = useRef();

  const setViewport = (left, right) => {
    setViewportLeft((100 * left).toFixed(3));
    setViewportRight((100 * (1 - right)).toFixed(3));
  };
  useImperativeHandle(ref, () => ({ setViewport }));

  // When mousing over the graph, tell Song who will then tell Chart
  // to sync its viewport as well
  function onMouse(e) {
    if (e.buttons === 0 || typeof props.onViewportChange !== 'function') { return; }

    const elRect = e.target.getBoundingClientRect();
    const x = e.clientX - elRect.left;;
    props.onViewportChange(x / mainRef.current.clientWidth);
  }

  return (
    <div
      className='bpm-graph'
      onMouseDown={onMouse}
      onMouseMove={onMouse}
      ref={mainRef}
    >
      {viewportLeft !== viewportRight ? (
        <div
          className='bpm-graph-viewport'
          style={{ 'left': `${viewportLeft}%`, 'right': `${viewportRight}%` }}
        >
        </div>
      ) : null}
      {props.chartData.bpms ? (
        <ScatterChart
          data={getBpmGraphData(props)}
          options={getBpmGraphDataOptions(props)}
          ref={chartJsRef}
        />
      ) : null}
    </div>
  );
}

function getBpmGraphData({ chartData, bpmLow, bpmHigh }) {
  // Add a point with the max T so the graph is drawn fully to the right
  const stopBpm = (bpmLow + bpmHigh)/2;
  const firstBpm = chartData.bpms[0]['b'];
  const lastNoteBpm = {
    x: chartData.events[chartData.events.length - 1]['t'],
    y: chartData.bpms[chartData.bpms.length - 1]['b'],
  }
  return {
    datasets: [
      {
        id: 1,
        label: 'BPM',
        data: chartData.bpms.map(bpm => ({ x: bpm['t'], y: bpm['b'], c: bpm['c'] })).concat([lastNoteBpm]),
        borderColor: 'blue',
        borderWidth: 1,
        stepped: true,
        pointStyle: false,
        showLine: true,
      },
      {
        id: 2,
        label: 'Stop',
        data: chartData.stops.map(stop => ({ x: stop['t'], y: stopBpm, c: stop['c'] })),
        borderColor: 'magenta',
        elements: {
          point: {
            pointHoverRadius: 20,
            pointStyle: 'line',
            radius: 20,
            rotation: 90,
          }
        }
      },
    ],
  };
}

function getBpmGraphDataOptions({ chartData, bpmLow, bpmHigh }) {
  const maxT = chartData.events[chartData.events.length - 1]['t'];
  const yMin = bpmLow === bpmHigh ? (bpmLow - 1) : bpmLow;
  const yMax = bpmLow === bpmHigh ? (bpmHigh + 1) : bpmHigh;
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
        max: maxT,
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
        min: yMin,
        max: yMax,
        ticks: { display: false },
      },
    },
    plugins: {
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        callbacks: {
          label: (context) => {
            return context.dataset.label === 'Stop'
              ? `Stop @ ${context.raw['c']}`
              : `${Math.round(context.raw.y)} BPM @ ${context.raw['c']}`;
          },
        },
        cornerRadius: 3,
        padding: 3,
        position: 'nearest',
        yAlign: 'bottom',
      }
    }
  }
}

export default forwardRef(BpmGraph);
