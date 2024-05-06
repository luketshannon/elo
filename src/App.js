import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Route, Routes, Link } from 'react-router-dom';

const ethers = require("ethers")
const CONTRACT_ADDRESS = "0xa4ac7f3d073d30298899524f19764977c417fbaf";
const PROVIDER = new ethers.providers.JsonRpcProvider("https://sepolia.infura.io/v3/8db586c22ca6492d846b04c330a836df");

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

function Statistics({ contract }) {
  const [stats, setStats] = useState({
    elos: []
  });

  useEffect(() => {
    const loadElos = async () => {
      const elos = [];
      // Example to load for IDs 1 to 50. Adjust according to actual token IDs.
      for (let i = 1; i <= 50; i++) {
        try {
          const eloData = await contract.eloData(i);
          elos.push({
            id: i,
            eloScore: parseInt(eloData.eloScore),
            matches: parseInt(eloData.matches)
          });
        } catch (error) {
          console.error("Error fetching data for ID", i, error);
        }
      }
      elos.sort((a, b) => b.eloScore - a.eloScore);
      setStats({ elos });
    };

    loadElos();
  }, [contract]);

  return (
    <div>
      <h2>ELO Rankings</h2>
      <ul>
        {stats.elos.map((item) => (
          <li key={item.id}>
            Token ID: {item.id}, ELO Score: {item.eloScore}, Matches: {item.matches}
          </li>
        ))}
      </ul>
    </div>
  );
}


export default App;
