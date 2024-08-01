import { useEffect, useState } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';
import './styles.css';

const SwapInterface = () => {
  const [destinationAddr, setDestinationAddr] = useState('');
  const [sourceAsset, setSourceAsset] = useState('');
  const [destinationAsset, setDestinationAsset] = useState('');
  const [depositAddr, setDepositAddr] = useState('');
  const [status, setStatus] = useState('');
  const [id, setId] = useState('');
  const [amount, setAmount] = useState('1');
  const [provider, setProvider] = useState('');
  const [signer, setSigner] = useState('')
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

        const tx = await (signer).sendTransaction({
          to: depositAddr,
          value: ethers.parseEther(amount)
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
      <div className='title'>Swap</div>
      <div className="wrapper">
        <div className="box">
          <ul className='radio-group'>
            <li className="radio-item">
              <div className="flex items-center ps-3">
                <input id="horizontal-list-radio-license" type="radio" value="" name="list-radio" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500" />
                <label htmlFor="horizontal-list-radio-license" className="radio-label">Maya</label>
              </div>
            </li>
            <li className="radio-item">
              <div className="flex items-center ps-3">
                <input id="horizontal-list-radio-license" type="radio" value="" name="list-radio" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500" />
                <label htmlFor="horizontal-list-radio-license" className="radio-label">THORChain</label>
              </div>
            </li>
            <li className="radio-item">
              <div className="flex items-center ps-3">
                <input id="horizontal-list-radio-license" type="radio" value="" name="list-radio" className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500" />
                <label htmlFor="horizontal-list-radio-license" className="radio-label">ChainFlip</label>
              </div>
            </li>
          </ul>
          <div className="flex w-full h-[90%] p-6">
            <div className="w-full border border-gray-400 p-8 rounded-xl mr-4 flex flex-col justify-center items-center min-h-[300px] bg-white shadow-md">
              <form className="form">
                <div className="form-group">
                  <input type="text" name="floating_email" id="floating_email" className="form-input" placeholder=" " required value={destinationAddr} onChange={(e) => setDestinationAddr(e.target.value)} />
                  <label htmlFor="floating_email" className="form-label">Destination address</label>
                </div>
                <div className="form-group pt-6">
                  <input type="text" name="floating_amount" id="floating_amount" className="form-input" placeholder=" " required value={amount} onChange={(e) => setAmount(e.target.value)} />
                  <label htmlFor="floating_amount" className="form-label">Amount to be swapped</label>
                </div>
                <label htmlFor="sourceAsset" className="block mt-4 text-sm font-medium text-black">Select Source Asset</label>
                <select
                  id="sourceAsset"
                  className="select"
                  value={sourceAsset}
                  onChange={(e) => setSourceAsset(e.target.value)}
                >
                  <option value="" disabled>Choose an asset</option>
                  <option value="eth.eth">eth.eth</option>
                  <option value="flip.eth">flip.eth</option>
                  <option value="usdt.eth">usdt.eth</option>
                </select>
                <label htmlFor="destAsset" className="block mt-4 text-sm font-medium text-gray-900">Select Destination Asset</label>
                <select
                  id="destAsset"
                  className="select"
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
                <button className="button" onClick={handleClick} disabled={loading}>
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin h-5 w-5 mr-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l4-4-4-4v4a12 12 0 11-8 8z"></path>
                      </svg>
                      Swapping...
                    </span>
                  ) : (
                    'Swap'
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
        <div className="info-box">
          <h2 className="info-title">Info</h2>
          <p className="info-text">Deposit Address: {depositAddr || '...'}</p>
          <p className="info-text">Time Duration: 24hrs</p>

          {depositAddr && (
            <p className="info-text">
              {`Deposit ${sourceAsset} to ${depositAddr} address to initiate swap`}
            </p>
          )}

          <p className='info-text'>{`Status: ${status}`}</p>

          <button onClick={handleDeposit} className='button' disabled={loading}>
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin h-5 w-5 mr-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l4-4-4-4v4a12 12 0 11-8 8z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              'Deposit'
            )}
          </button>

          {status === 'COMPLETE' && <p className='info-text-success'>Swap Completed</p>}
        </div>
      </div>
    </div>
  );
}

export default SwapInterface;
