import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';
import './styles.css'; // Ensure your styles.css is imported

const SwapInterface: React.FC = () => {
  const [destinationAddr, setDestinationAddr] = useState('');
  const [sourceAsset, setSourceAsset] = useState('');
  const [destinationAsset, setDestinationAsset] = useState('');
  const [depositAddr, setDepositAddr] = useState('');
  const [status, setStatus] = useState('');
  const [id, setId] = useState('');
  const [amount, setAmount] = useState('1');
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInfoLoading, setIsInfoLoading] = useState(false); // New state for info loading

  const handleClick = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setIsInfoLoading(true); // Set info loading state to true

    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `https://perseverance.chainflip-broker.io/swap?apikey=dff049a53a4d4cc499cb5f555e316416&sourceAsset=${sourceAsset}&destinationAsset=${destinationAsset}&destinationAddress=${destinationAddr}`,
      headers: {},
    };

    try {
      const response = await axios.request(config);
      setId(response.data.id);
      setDepositAddr(response.data.address);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
      setIsInfoLoading(false); // Set info loading state to false
    }

    console.log("sourceAsset: ", sourceAsset);
    console.log("destinationAsset: ", destinationAsset);
    console.log("destinationAddress: ", destinationAddr);
  };

  const handleSendToken = async () => {
    if (!signer || !provider) {
      setStatus('MetaMask is not connected');
      return;
    }

    if (!depositAddr) {
      setStatus('Recipient address is required');
      return;
    }

    if (!amount || isNaN(Number(amount))) {
      setStatus('Invalid amount');
      return;
    }

    try {
      let tokenAddress;
      if (sourceAsset === "flip.eth") {
        tokenAddress = '0xdC27c60956cB065D19F08bb69a707E37b36d8086';
      } else if (sourceAsset === "usdt.eth") {
        tokenAddress = "0x27CEA6Eb8a21Aae05Eb29C91c5CA10592892F584";
      } else {
        alert("We don't switch from this source now, we are working on it....");
        return;
      }

      const erc20Abi = [
        "function transfer(address to, uint256 amount) public returns (bool)",
        "function balanceOf(address addr) view returns (uint)"
      ];

      const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, signer);
      const amountInUnits = ethers.parseUnits(amount, 6);

      const tx = await tokenContract.transfer(depositAddr, amountInUnits);
      await tx.wait();
      setStatus('Transaction confirmed!');
    } catch (error) {
      console.error('Error sending token:', error);
      setStatus('Error sending token');
    }
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const func = async () => {
      if (status === "COMPLETE") {
        return;
      }

      let config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `https://perseverance.chainflip-broker.io/status-by-id/?apikey=dff049a53a4d4cc499cb5f555e316416&swapId=${id}`,
        headers: {},
      };

      try {
        const response = await axios.request(config);
        setStatus(response.data.status.state);
      } catch (error) {
        console.error(error);
      }
    };

    if (depositAddr !== "") {
      func();
      intervalId = setInterval(func, 60000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [depositAddr]);

  useEffect(() => {
    const setupProvider = async () => {
      if (window.ethereum) {
        try {
          const newProvider = new ethers.BrowserProvider(window.ethereum);
          setProvider(newProvider);
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          const newSigner = await newProvider.getSigner();
          setSigner(newSigner);
        } catch (error) {
          console.error('Error setting up MetaMask:', error);
        }
      } else {
        setStatus('MetaMask is not installed');
      }
    };

    setupProvider();
  }, []);

  const handleDeposit = () => {
    handleSendToken();
  };

  return (
    <div className="container">
      <div className="header">Swap through broker channel</div>
      <div className="content">
        <div className="form-container">
          <form className="form">
            <div className="input-group">
              <input
                type="text"
                name="destinationAddress"
                id="destinationAddress"
                placeholder="Destination address"
                required
                value={destinationAddr}
                onChange={(e) => setDestinationAddr(e.target.value)}
                className="input"
              />
              <input
                type="text"
                name="amount"
                id="amount"
                placeholder="Amount to be swapped"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input"
              />
            </div>
            <label htmlFor="sourceAsset" className="label">Select Source Asset</label>
            <select
              id="sourceAsset"
              className="select"
              value={sourceAsset}
              onChange={(e) => setSourceAsset(e.target.value)}
            >
              <option value="">Choose an asset</option>
              {/* <option value="btc.btc">btc.btc</option> */}
              {/* <option value="dot.dot">dot.dot</option> */}
              {/* <option value="eth.arb">eth.arb</option> */}
              <option value="eth.eth">eth.eth</option>
              <option value="flip.eth">flip.eth</option>
              {/* <option value="usdc.arb">usdc.arb</option> */}
              <option value="usdt.eth">usdt.eth</option>
            </select>
            <label htmlFor="destinationAsset" className="label">Select Destination Asset</label>
            <select
              id="destinationAsset"
              className="select"
              value={destinationAsset}
              onChange={(e) => setDestinationAsset(e.target.value)}
            >
              <option value="">Choose an asset</option>
              <option value="btc.btc">btc.btc</option>
              <option value="dot.dot">dot.dot</option>
              <option value="eth.arb">eth.arb</option>
              <option value="eth.eth">eth.eth</option>
              <option value="flip.eth">flip.eth</option>
              <option value="usdc.arb">usdc.arb</option>
              <option value="usdt.eth">usdt.eth</option>
            </select>
            <button className="button" onClick={handleClick}>
              {isLoading ? <div className="spinner"><div className="double-bounce1"></div><div className="double-bounce2"></div></div> : 'Swap'}
            </button>
          </form>
        </div>
        <div className="info-container">
          {isInfoLoading ? (
            <div className="spinner-container">
              <div className="spinner">
                <div className="double-bounce1"></div>
                <div className="double-bounce2"></div>
              </div>
            </div>
          ) : (
            <>
              <h2 className="info-header">Info</h2>
              <p className="info-text">Deposit Address: {depositAddr ? `${depositAddr}` : '...'}</p>
              <p className="info-text">Time Duration: 24hrs</p>
              {depositAddr && (
                <p className="info-text">
                  Deposit {sourceAsset} to {depositAddr} address to initiate swap
                </p>
              )}
              <p className="info-text">Status: {status}</p>
              <button className="button" onClick={handleDeposit}>Deposit</button>
              {status === 'COMPLETE' && <p className="info-text">Swap Completed</p>}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default SwapInterface;
