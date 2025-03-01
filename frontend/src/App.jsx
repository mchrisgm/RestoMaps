import React, { useEffect } from "react";

const App = () => {
  useEffect(() => {
    console.log("React App Loaded: Fetching data...");
  }, []);

  return <></>; // No need to render anything
};

export default App;