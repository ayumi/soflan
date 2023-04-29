import React, { useState } from 'react';
import Select from 'react-select';

import Song from './Song';
import { readUrlHash, useHash, writeUrlHash } from '../util'

const Home = (props) => {
  const hashData = readUrlHash();
  const initialChartType = hashData['t'] || 'dance-single';
  const initialSong = hashData['s'] || null;
  const initialChart = hashData['c'] || null;
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

  // TODO Back/Forward
  // const [hash, setHash] = useHash();
  // React.useEffect(() => {
  //   console.log('aaaaaa');
  //   const hashData = readUrlHash();
  //   const newChartType = hashData['t'] || 'dance-single';
  //   const newSong = hashData['s'] || null;
  //   const newChart = hashData['c'] || null;
  //   // Set this because we don't call setSongUrl() for the loaded value
  //   const newSongUrl = newSong ? `/songs/${newSong}--${newChartType}.json` : null;
  //   setSong(newSong);
  //   setChartType(newChart);
  //   // FIXME: When u press back button the hash changes but then the chart does not change??? why
  //   // FIXME also: this ewffect seems to call even when we're changing it, not when pressing back button..
  //   setSongUrl(newSongUrl);
  // }, [hash]);

  return (
    <div className='home'>
      <Select
        className='select-song'
        classNamePrefix='react-select'
        defaultValue={{ label: initialSong, value: initialSong }}
        onChange={handleSelectSongChange}
        options={options}
        placeholder='Select song...'
        value={song && song.value}
      />
      <Song
        chartType={chartType}
        songUrl={songUrl}
        defaultChart={initialChart}
      />
    </div>
  );
}

export default Home
