import React, { useState } from 'react';
import Select from 'react-select';

import Song from './Song';
import { readUrlHash, writeUrlHash } from '../util'

const Home = (props) => {
  const hashData = readUrlHash();
  console.log('Loaded hash data', hashData);
  const initialChartType = hashData['t'] || 'dance-single';
  const initialSong = hashData['s'] || null;
  const initialChart = hashData['c'] || 'Basic';
  // Set this because we don't call setSongUrl() for the loaded value
  const initialSongUrl = initialSong ? `/songs/${initialSong}--${initialChartType}.json` : null;

  // FIXME: Currently dance-single is hardcoded
  const [chartType, setChartType] = useState(initialChartType);
  const [song, setSong] = useState(initialSong);
  const [songUrl, setSongUrl] = useState(initialSongUrl);
  function handleSelectSongChange(option) {
    const newSong = option.value;
    setSong(newSong);
    setSongUrl(`/songs/${newSong}--${chartType}.json`);
    writeUrlHash({ s: newSong });
  }

  const options = props.songs.map(song => {
    return { value: song, label: song }
  });


  return (
    <div>
      <Select
        defaultValue={{ label: initialSong, value: initialSong }}
        onChange={handleSelectSongChange}
        options={options}
      />
      <Song
        songUrl={songUrl}
        defaultChart={initialChart}
      />
    </div>
  );
}

export default Home
