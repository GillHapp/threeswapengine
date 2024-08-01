import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';
import './SwapInterface.css';

const SwapInterface = () => {
  const [destinationAddr, setDestinationAddr] = useState('');
  const [sourceAsset, setSourceAsset] = useState('');
  const [destinationAsset, setDestinationAsset] = useState('');
  const [depositAddr, setDepositAddr] = useState('');
  const [status, setStatus] = useState('');
  const [id, setId] = useState('');
  const [amount, setAmount] = useState('1');
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleClick = async (e) => {
    e.preventDefault();
    setLoading(true);

    const config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `https://perseverance.chainflip-broker.io/swap?apikey=dff049a53a4d4cc499cb5f555e316416&sourceAsset=${sourceAsset}&destinationAsset=${destinationAsset}&destinationAddress=${destinationAddr}`,
      headers: {}
    };

    try {
      const response = await axios.request(config);
      console.log(JSON.stringify(response.data));
      setId(response.data.id);
      setDepositAddr(response.data.address);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }

    console.log("sourceAsset:", sourceAsset);
    console.log("destinationAsset:", destinationAsset);
    console.log("destinationAddress:", destinationAddr);
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
      // Check if the source asset is Sepolia ETH'
      if (sourceAsset === "eth.eth") {

        const tx = await signer.sendTransaction({
          to: depositAddr,
          value: ethers.parseEther(amount) // ETH has 18 decimals
        });
        console.log('Transaction:', tx);
        await tx.wait();
        setStatus('Transaction confirmed!');
        return;
      } else {
        // Handle ERC-20 token transfers
        let tokenAddress;
        if (sourceAsset === "flip.eth") {
          tokenAddress = '0xdC27c60956cB065D19F08bb69a707E37b36d8086';
        } else if (sourceAsset === "usdt.eth") {
          tokenAddress = "0x27CEA6Eb8a21Aae05Eb29C91c5CA10592892F584";
        } else {
          alert("We don't switch from this source now, we are working on it....");
          return;
        }

        // ERC-20 contract ABI
        const erc20Abi = [
          "function transfer(address to, uint256 amount) public returns (bool)",
          "function balanceOf(address addr) view returns (uint)"
        ];

        const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, signer);
        const amountInUnits = ethers.parseUnits(amount, 6);
        const tx = await tokenContract.transfer(depositAddr, amountInUnits);
        console.log('Transaction:', tx);
        await tx.wait();
        setStatus('Transaction confirmed!');
      }

    } catch (error) {
      console.error('Error sending token:', error);
      setStatus('Error sending token');
    }
  };

  useEffect(() => {
    let intervalId;

    const func = async () => {
      if (status === "COMPLETE") {
        return;
      }
      const config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `https://perseverance.chainflip-broker.io/status-by-id/?apikey=dff049a53a4d4cc499cb5f555e316416&swapId=${id}`,
        headers: {}
      };
      try {
        const response = await axios.request(config);
        console.log(JSON.stringify(response.data));
        setStatus(response.data.status.state);
      } catch (error) {
        console.log(error);
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
          console.log('Provider:', newProvider);
          setProvider(newProvider);
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          const newSigner = await newProvider.getSigner();
          console.log('Signer:', newSigner);
          setSigner(newSigner);
        } catch (error) {
          console.error('Error setting up MetaMask:', error);
          setStatus('Error setting up MetaMask: ' + error);
        }
      } else {
        setStatus('MetaMask is not installed');
      }
    };

    setupProvider();
  }, []);

  const handleDeposit = () => {
    console.log("handleDeposit");
    setLoading(true);
    handleSendToken().finally(() => setLoading(false));
    console.log("Depositted");
  };

  return (
    <div className="container">
      <h1>Swap Interface</h1>
      <form>
        <div>
          <label>Destination address:</label>
          <input
            type="text"
            value={destinationAddr}
            onChange={(e) => setDestinationAddr(e.target.value)}
          />
        </div>
        <div>
          <label>Amount to be swapped:</label>
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div>
          <label>Select Source Asset:</label>
          <select
            value={sourceAsset}
            onChange={(e) => setSourceAsset(e.target.value)}
          >
            <option value="" disabled>Choose an asset</option>
            <option value="eth.eth">eth.eth</option>
            <option value="flip.eth">flip.eth</option>
            <option value="usdt.eth">usdt.eth</option>
          </select>
        </div>
        <div>
          <label>Select Destination Asset:</label>
          <select
            value={destinationAsset}
            onChange={(e) => setDestinationAsset(e.target.value)}
          >
            <option value="" disabled>Choose an asset</option>
            <option value="btc.btc">btc.btc</option>
            <option value="dot.dot">dot.dot</option>
            <option value="eth.arb">eth.arb</option>
            <option value="eth.eth">eth.eth</option>
            <option value="flip.eth">flip.eth</option>
            <option value="usdc.arb">usdc.arb</option>
            <option value="usdt.eth">usdt.eth</option>
          </select>
        </div>
        <button onClick={handleClick}>
          Swap
        </button>
      </form>

      <div className="info-container">
        {loading ? (
          <div className="loading"></div>
        ) : (
          <>
            <h2>Info</h2>
            <p>Deposit Address: {depositAddr || '...'}</p>
            <p>Time Duration: 24hrs</p>
            {depositAddr && (
              <p>Deposit {sourceAsset} to {depositAddr} address to initiate swap</p>
            )}
            <p>Status: {status}</p>
            <button onClick={handleDeposit}>
              Deposit
            </button>
            {status === 'COMPLETE' && <p>Swap Completed</p>}
          </>
        )}
      </div>
    </div>
  );

}

export default SwapInterface;