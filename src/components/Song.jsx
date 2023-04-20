import React, { useEffect, useState } from 'react';
import Select from 'react-select';
import _ from 'lodash';

const Song = (props) => {
  const [songData, setSongData] = useState(null);

  useEffect(() => {
    const url = props.songUrl;
    if (url === null) {
      console.log('songUrl null, returning');
      return
    }
    console.log('fetching: ' + url);

    const fetchData = async () => {
      try {
        const response = await fetch(url);
        const json = await response.json();
        console.log(json);
        setSongData(json);
      } catch (error) {
        console.log("error", error);
      }
    };

    fetchData();
  }, [props.songUrl]);


  // props.song
  // const options = _.map(props.songs, song => {
  //   return { value: song, label: song }
  // });

  return (
    <div>
      {JSON.stringify(songData)}
    </div>
  );
}

export default Song
