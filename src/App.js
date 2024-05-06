import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';

const CONTRACT_ADDRESS = "0xa4ac7f3d073d30298899524f19764977c417fbaf";
const PROVIDER = new ethers.providers.JsonRpcProvider("https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID");

const eloContractABI = [
  "function vote(uint256 identifier, uint256 opponentIdentifier, bool identifierWon) public",
  "event EloUpdated(uint256 identifier, int256 newEloScore, uint256 matches)",
  "function eloData(uint256 identifier) public view returns (int256 eloScore, uint256 matches)"
];

function App() {
  const contract = new ethers.Contract(CONTRACT_ADDRESS, eloContractABI, PROVIDER);

  function getRandomTokenId() {
    const projectId = Math.floor(Math.random() * 50);
    const mintNumber = Math.floor(Math.random() * 100);
    return `${projectId}000${mintNumber}`;
  }

  const [images, setImages] = useState({
    image1: getRandomTokenId(),
    image2: getRandomTokenId()
  });

  async function trackSelection(selectedIndex) {
    const selectedTokenId = images[`image${selectedIndex}`];
    const opponentTokenId = images[`image${selectedIndex === 1 ? 2 : 1}`];

    const signer = PROVIDER.getSigner();
    const contractWithSigner = contract.connect(signer);

    try {
      await contractWithSigner.vote(selectedTokenId, opponentTokenId, true);
      setImages({
        image1: getRandomTokenId(),
        image2: getRandomTokenId()
      });
    } catch (error) {
      console.error('Error submitting vote:', error);
    }
  }

  function getImageUrl(tokenId) {
    return `https://artblocks-mainnet.s3.amazonaws.com/${tokenId}.png`;
  }

  return (
    <Router>
      <div style={{ textAlign: 'center', paddingTop: '20px', paddingBottom: '10px', backgroundColor: 'black', minHeight: '100vh', color: 'white' }}>
        <header>
          <h1>ELO</h1>
          <nav style={{ marginBottom: '20px' }}>
            <Link to="/" style={{ color: 'white', marginRight: '10px' }}>Home</Link>
            <Link to="/info" style={{ color: 'white', marginRight: '10px' }}>Info</Link>
            <Link to="/opt-in" style={{ color: 'white', marginRight: '10px' }}>Opt-in</Link>
            <Link to="/statistics" style={{ color: 'white' }}>Statistics</Link>
          </nav>
        </header>
        <Routes>
          <Route path="/" element={<ImageDisplay images={images} onImageSelect={trackSelection} getImageUrl={getImageUrl} />} />
          <Route path="/info" element={<InfoPage />} />
          <Route path="/opt-in" element={<OptInPage />} />
          <Route path="/statistics" element={<Statistics contract={contract} />} />
        </Routes>
      </div>
    </Router>
  );
}

function ImageDisplay({ images, onImageSelect, getImageUrl }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
      <div style={{ width: '45%', textAlign: 'center' }}>
        <img src={getImageUrl(images.image1)} alt="Random Art 1" style={{ width: '100%', cursor: 'pointer' }}
          onClick={() => onImageSelect(1)} />
        <p style={{ color: 'white' }}>Token ID: {images.image1}</p>
      </div>
      <div style={{ width: '45%', textAlign: 'center' }}>
        <img src={getImageUrl(images.image2)} alt="Random Art 2" style={{ width: '100%', cursor: 'pointer' }}
          onClick={() => onImageSelect(2)} />
        <p style={{ color: 'white' }}>Token ID: {images.image2}</p>
      </div>
    </div>
  );
}

function InfoPage() {
  return <h2>Information Page</h2>;
}

function OptInPage() {
  return <h2>Opt-In Page</h2>;
}


function Statistics() {
  const [stats, setStats] = useState({
    projects: [],
    mints: []
  });

  const [displayMode, setDisplayMode] = useState({
    type: 'projects',  // 'projects' or 'mints'
    ranking: 'top'     // 'top' or 'bottom'
  });

  useEffect(() => {
    const projectEloData = [];
    const mintEloData = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith('elo-')) {
        const eloData = JSON.parse(localStorage.getItem(key));
        const [type, id] = key.split('-');
        if (id.includes("000")) { // Assuming mint IDs contain '000'
          const projectId = id.substring(0, id.indexOf('000')); // Extract projectId
          const mintId = id.substring(projectId.length);
          mintEloData.push({ id, elo: eloData.elo, projectId, mintId });
        } else {
          projectEloData.push({ id, elo: eloData.elo });
        }
      }
    }

    projectEloData.sort((a, b) => b.elo - a.elo);
    mintEloData.sort((a, b) => b.elo - a.elo);

    setStats({
      projects: projectEloData,
      mints: mintEloData
    });
  }, []);

  const toggleDisplay = (type, ranking) => {
    setDisplayMode({ type, ranking });
  };

  const getImageUrl = (projectId, mintId = "0") => {
    const totalLength = 6;
    const currentLength = mintId.toString().length;
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
              <p style={{ textAlign: 'center' }}>Elo: {Math.round(item.elo)} &nbsp;&nbsp;&nbsp; ProjectId: {item.projectId || item.id} &nbsp;&nbsp;&nbsp; Mint: {item.mintId || '0'}</p>
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
