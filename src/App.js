import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Route, Routes, Link } from 'react-router-dom';
import Web3 from 'web3';

const CONTRACT_ADDRESS = "0x714F3169eB0BcB8A69cd7EC5B965678259876708";
const contractABI = [{ "anonymous": false, "inputs": [{ "indexed": false, "internalType": "uint256", "name": "identifier", "type": "uint256" }, { "indexed": false, "internalType": "int256", "name": "newEloScore", "type": "int256" }, { "indexed": false, "internalType": "uint256", "name": "matches", "type": "uint256" }], "name": "EloUpdated", "type": "event" }, { "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "name": "eloData", "outputs": [{ "internalType": "int256", "name": "eloScore", "type": "int256" }, { "internalType": "uint256", "name": "matches", "type": "uint256" }], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "getActivePlayers", "outputs": [{ "internalType": "uint256[]", "name": "", "type": "uint256[]" }], "stateMutability": "view", "type": "function" }, { "inputs": [{ "internalType": "uint256", "name": "identifier", "type": "uint256" }, { "internalType": "uint256", "name": "opponentIdentifier", "type": "uint256" }, { "internalType": "bool", "name": "identifierWon", "type": "bool" }], "name": "vote", "outputs": [], "stateMutability": "nonpayable", "type": "function" }]

function App() {
  const [web3, setWeb3] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [contract, setContract] = useState(null);
  const [images, setImages] = useState({
    image1: getRandomImageUrl(),
    image2: getRandomImageUrl()
  });

  useEffect(() => {
    const initWeb3 = async () => {
      if (window.ethereum) {
        try {
          await window.ethereum.enable();
          const web3Instance = new Web3(window.ethereum);
          setWeb3(web3Instance);
          const accs = await web3Instance.eth.getAccounts();
          setAccounts(accs);
          const contractInstance = new web3Instance.eth.Contract(contractABI, CONTRACT_ADDRESS);
          setContract(contractInstance);
        } catch (error) {
          console.error("Error connecting to web3: ", error);
        }
      } else {
        console.log('Non-Ethereum browser detected. You should consider trying MetaMask!');
      }
    };

    initWeb3();
  }, []);

  function getRandomImageUrl() {
    const projectId = Math.floor(Math.random() * 50);
    const mintNumber = Math.floor(Math.random() * 100);
    const totalLength = 6;
    const currentLength = mintNumber.toString().length;
    const zerosToPad = totalLength - currentLength;
    const zeroPadding = '0'.repeat(zerosToPad);
    return {
      url: `https://artblocks-mainnet.s3.amazonaws.com/${projectId}${zeroPadding}${mintNumber}.png`,
      projectId: projectId.toString(),
      mintId: `${projectId}${zeroPadding}${mintNumber}`
    };
  }

  async function trackSelection(selectedIndex) {
    const selectedImage = images[`image${selectedIndex}`];
    const opponentImage = images[`image${selectedIndex === 1 ? 2 : 1}`];

    try {
      if (contract && accounts.length > 0) {
        await contract.methods.vote(selectedImage.mintId, opponentImage.mintId, selectedIndex === 1).send({ from: accounts[0] });
        console.log('Vote recorded successfully');
      } else {
        console.error('Contract or accounts not loaded');
      }
    } catch (error) {
      console.error('Error recording vote:', error);
    }
    setImages({
      image1: getRandomImageUrl(),
      image2: getRandomImageUrl()
    });
  }

  function handleImageError(imageKey) {
    setImages(prevImages => ({
      ...prevImages,
      [imageKey]: getRandomImageUrl()
    }));
  }

  return (
    <Router>
      <div style={{ textAlign: 'center', paddingTop: '20px', paddingBottom: '10px', backgroundColor: 'black', minHeight: '100vh', color: 'white' }}>
        <header>
          <h1>ELO</h1>
          <nav style={{ marginBottom: '20px' }}>
            <Link to="/" style={{ color: 'white', marginRight: '10px' }}>Home</Link>
            <Link to="/info" style={{ color: 'white', marginRight: '10px' }}>About</Link>
            <Link to="/statistics" style={{ color: 'white' }}>Statistics</Link>
          </nav>
        </header>
        <Routes>
          <Route path="/" element={<ImageDisplay images={images} onImageSelect={trackSelection} onImageError={handleImageError} />} />
          <Route path="/info" element={<InfoPage />} />
          <Route path="/statistics" element={<Statistics contract={contract} />} />
        </Routes>
      </div>
    </Router>
  );
}
function ImageDisplay({ images, onImageSelect, onImageError, contract }) {
  const [eloData, setEloData] = useState({
    image1: { elo: '?', matches: '?' },
    image2: { elo: '?', matches: '?' }
  });

  // Function to fetch ELO and matches for a given mint ID
  const fetchEloData = async (mintId) => {
    if (contract) {
      try {
        const data = await contract.methods.eloData(mintId).call();
        return {
          elo: data.eloScore,
          matches: data.matches
        };
      } catch (error) {
        console.error('Error fetching ELO data:', error);
        return { elo: '?', matches: '?' }; // Fallback in case of an error
      }
    }
    return { elo: 1000, matches: 0 }; // Default if contract is not loaded
  };

  // Effect to fetch data whenever images change
  useEffect(() => {
    const loadData = async () => {
      const eloData1 = await fetchEloData(images.image1.mintId);
      const eloData2 = await fetchEloData(images.image2.mintId);
      setEloData({
        image1: {
          elo: eloData1.matches === '0' ? '1000?' : eloData1.elo,
          matches: eloData1.matches === '0' ? '0?' : eloData1.matches
        },
        image2: {
          elo: eloData2.matches === '0' ? '1000?' : eloData2.elo,
          matches: eloData2.matches === '0' ? '0?' : eloData2.matches
        }
      });
    };

    loadData();
  }, [images, contract]);

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
      <div style={{ width: '45%', textAlign: 'center' }}>
        <img src={images.image1.url} alt="Random Art 1" style={{ width: '100%', cursor: 'pointer' }}
          onClick={() => onImageSelect(1)} onError={() => onImageError('image1')} />
        <p style={{ color: 'white' }}>ELO: {eloData.image1.elo}, Matches: {eloData.image1.matches}</p>
      </div>
      <div style={{ width: '45%', textAlign: 'center' }}>
        <img src={images.image2.url} alt="Random Art 2" style={{ width: '100%', cursor: 'pointer' }}
          onClick={() => onImageSelect(2)} onError={() => onImageError('image2')} />
        <p style={{ color: 'white' }}>ELO: {eloData.image2.elo}, Matches: {eloData.image2.matches}</p>
      </div>
    </div>
  );
}


function InfoPage() {
  return (
    <div>
      <h2>About ELO ART</h2>
      <p>ELO ART leverages the ELO rating system to evaluate and rank NFT artworks and collections within the Art Blocks ecosystem. Users participate by choosing their preferred artwork in head-to-head matchups, influencing the ELO scores and discovering new artworks.</p>
      <h3>FAQ</h3>
      <ul>
        <li>How does voting affect ELO scores? Each vote can either increase or decrease an artwork's ELO score, affecting its ranking.</li>
        <li>What is Art Blocks? Art Blocks is a platform that hosts generative art projects, where artworks are uniquely generated by an algorithm.</li>
      </ul>
    </div>
  );
}

function Statistics({ contract }) {
  const [stats, setStats] = useState({
    projects: [],
    mints: []
  });

  const [displayMode, setDisplayMode] = useState({
    type: 'projects',  // 'projects' or 'mints'
    ranking: 'top'     // 'top' or 'bottom'
  });
  useEffect(() => {
    const fetchData = async () => {
      if (contract) {
        try {
          const activePlayers = await contract.methods.getActivePlayers().call();
          const projectEloDataMap = new Map(); // Use a Map to track projects by ID
          const mintEloDataMap = new Map(); // Use a Map to track mints by ID

          for (let identifier of activePlayers) {
            const eloData = await contract.methods.eloData(identifier).call();
            const projectId = identifier.toString().substring(0, identifier.toString().length - 3); // Adjust according to your ID format
            const mintId = identifier.toString().slice(-3); // Adjust according to your ID format

            // Update project data only if it hasn't been added yet
            if (!projectEloDataMap.has(projectId)) {
              projectEloDataMap.set(projectId, {
                id: projectId,
                elo: parseInt(eloData.eloScore),
                matches: parseInt(eloData.matches)
              });
            }

            // Update mint data only if it hasn't been added yet
            if (!mintEloDataMap.has(identifier)) {
              mintEloDataMap.set(identifier, {
                id: identifier.toString(),
                projectId: projectId,
                mintId: mintId,
                elo: parseInt(eloData.eloScore),
                matches: parseInt(eloData.matches)
              });
            }
          }

          // Convert Map values to array for sorting and setting state
          const projectEloData = Array.from(projectEloDataMap.values());
          const mintEloData = Array.from(mintEloDataMap.values());

          // Sorting logic based on the current display mode
          projectEloData.sort((a, b) => displayMode.ranking === 'top' ? b.elo - a.elo : a.elo - b.elo);
          mintEloData.sort((a, b) => displayMode.ranking === 'top' ? b.elo - a.elo : a.elo - b.elo);

          setStats({
            projects: projectEloData,
            mints: mintEloData
          });
        } catch (error) {
          console.error('Error fetching ELO data:', error);
        }
      }
    };

    fetchData();
  }, [contract, displayMode.ranking]);

  const toggleDisplay = (type, ranking) => {
    setDisplayMode({ type, ranking });
  };

  const getImageUrl = (projectId, mintId = "0") => {
    const totalLength = 3;
    const currentLength = projectId.toString.length + mintId.toString().length;
    const zerosToPad = Math.max(0, totalLength - currentLength); // Prevent negative values
    const zeroPadding = '0'.repeat(zerosToPad);
    return `https://artblocks-mainnet.s3.amazonaws.com/${projectId}${zeroPadding}${mintId}.png`;
  };

  const renderEloList = (items, title) => {
    const filteredItems = items.length >= 5
      ? (displayMode.ranking === 'top' ? items.slice(0, 5) : items.slice(-5).reverse())
      : items;  // Check array length before slicing for bottom items

    return (
      <div>
        <h3>{title}</h3>
        <ul>
          {filteredItems.map(item => (
            <li key={item.id} style={{ listStyleType: 'none', margin: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
              <img src={getImageUrl(item.projectId || item.id, item.mintId || '0')} alt="Project or Mint Image" style={{ width: '150px', height: '150px', marginRight: '30px' }} />
              <p style={{ textAlign: 'center' }}>Elo: {Math.round(item.elo)}, Matches: {item.matches} &nbsp;&nbsp;&nbsp; ProjectId: {item.projectId || item.id} &nbsp;&nbsp;&nbsp; Mint: {item.mintId || '0'}</p>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center', margin: '20px' }}>
        <button onClick={() => toggleDisplay('projects', 'top')} style={{ textDecoration: displayMode.type === 'projects' && displayMode.ranking === 'top' ? 'underline' : 'none', fontSize: '1.2rem' }}>Top Projects</button>
        <button onClick={() => toggleDisplay('projects', 'bottom')} style={{ textDecoration: displayMode.type === 'projects' && displayMode.ranking === 'bottom' ? 'underline' : 'none', fontSize: '1.2rem' }}>Bottom Projects</button>
        <button onClick={() => toggleDisplay('mints', 'top')} style={{ textDecoration: displayMode.type === 'mints' && displayMode.ranking === 'top' ? 'underline' : 'none', fontSize: '1.2rem' }}>Top Mints</button>
        <button onClick={() => toggleDisplay('mints', 'bottom')} style={{ textDecoration: displayMode.type === 'mints' && displayMode.ranking === 'bottom' ? 'underline' : 'none', fontSize: '1.2rem' }}>Bottom Mints</button>
      </div>
      {displayMode.type === 'projects' ? renderEloList(stats.projects, `${displayMode.ranking} Projects`) : renderEloList(stats.mints, `${displayMode.ranking} Mints`)}
    </div>
  );
}


export default App;
