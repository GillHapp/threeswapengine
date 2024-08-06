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
  const [swapProvider, setSwapProvider] = useState("ChainFlip");

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
          value: ethers.parseEther(amount),
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
  }, [depositAddr, status, id]);

  const postTransaction = async (e) => {
    e.preventDefault();
    setLoading(true);

    const url = 'https://api.swapkit.dev/channel';
    const headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    const body = {
      sellAsset: sourceAsset,
      buyAsset: destinationAsset,
      destinationAddress: destinationAddr,
      affiliateFee: 0
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
      });
      const data = await response.json();
      console.log('Success:', data);
      setId(data.channelId);
      setDepositAddr(data.depositAddress);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = (e) => {
    switch (swapProvider) {
      case "ChainFlip":
        handleClick(e);
        break;
      case "ThorChain":
        postTransaction(e);
        break;
      default:
        handleClick(e);
        break;
    }
  }

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
    console.log("Deposited");
  };

  return (
    <div className="swap-interface">
      <h1 className="title">Swap</h1>
      <div className="content">
        <div className="swap-form">
          <ul className='swap-providers'>
            <li className={`swap-provider ${swapProvider === 'Maya' ? 'selected' : ''}`}>
              <input type="radio" value="Maya" name="list-radio" checked={swapProvider === 'Maya'} onChange={(e) => setSwapProvider(e.target.value)} />
              <label>Maya</label>
            </li>
            <li className={`swap-provider ${swapProvider === 'ThorChain' ? 'selected' : ''}`}>
              <input type="radio" value="ThorChain" name="list-radio" checked={swapProvider === 'ThorChain'} onChange={(e) => setSwapProvider(e.target.value)} />
              <label>THORChain</label>
            </li>
            <li className={`swap-provider ${swapProvider === 'ChainFlip' ? 'selected' : ''}`}>
              <input type="radio" value="ChainFlip" name="list-radio" checked={swapProvider === 'ChainFlip'} onChange={(e) => setSwapProvider(e.target.value)} />
              <label>ChainFlip</label>
            </li>
          </ul>

          <div className="form-group">
            <label htmlFor="sourceAsset">Source Asset</label>
            <input type="text" id="sourceAsset" value={sourceAsset} onChange={(e) => setSourceAsset(e.target.value)} />
          </div>

          <div className="form-group">
            <label htmlFor="destinationAsset">Destination Asset</label>
            <input type="text" id="destinationAsset" value={destinationAsset} onChange={(e) => setDestinationAsset(e.target.value)} />
          </div>

          <div className="form-group">
            <label htmlFor="destinationAddr">Destination Address</label>
            <input type="text" id="destinationAddr" value={destinationAddr} onChange={(e) => setDestinationAddr(e.target.value)} />
          </div>

          <div className="form-actions">
            <button onClick={handleSwap} className={`swap-button ${loading ? 'loading' : ''}`} disabled={loading}>
              {loading ? 'Loading...' : 'Swap'}
            </button>
          </div>
        </div>
        <div className="deposit-info">
          <h2>Deposit Information</h2>
          <div className="form-group">
            <label htmlFor="amount">Amount</label>
            <input type="text" id="amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>

          <div className="form-group">
            <label htmlFor="depositAddr">Deposit Address</label>
            <input type="text" id="depositAddr" value={depositAddr} readOnly />
          </div>

          <div className="form-group">
            <label htmlFor="status">Status</label>
            <input type="text" id="status" value={status} readOnly />
          </div>

          <div className="form-actions">
            <button onClick={handleDeposit} className={`deposit-button ${loading ? 'loading' : ''}`} disabled={loading}>
              {loading ? 'Loading...' : 'Deposit'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SwapInterface;
