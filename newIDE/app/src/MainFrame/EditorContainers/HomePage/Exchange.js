import React, { useEffect, useState } from 'react';
import { SwapSDK } from "@chainflip/sdk/swap";
import { Wallet } from "ethers";

const ExchangeComponent = ({
  sellValue,
  buyValue,
  priceChange,
  exchangeRate,
}) => {
  const [sellAmount, setSellAmount] = useState(0); // Pre-filled sell amount
  const [sellCurrency, setSellCurrency] = useState('FLIP');
  const [buyCurrency, setBuyCurrency] = useState('ARB');
  const [chains, setChains] = useState([]);

  const options = {
    network: "perseverance", // Testnet
    backendServiceUrl: "https://example.chainflip.io",
    signer: Wallet.fromPhrase("fold unique social wild fury mammal strike rule pet observe mule curve"),
    broker: {
      url: 'https://my.broker.io',
      commissionBps: 0, // basis points, i.e. 100 = 1%
    },
  };
   
  const swapSDK = new SwapSDK(options);

  const getChains = async () => {
    const res = await swapSDK.getChains()
    return res;
  }

  useEffect(() => {
    const func = async () => {
        const res = await getChains();
        console.log(res);
        setChains(res);
        return res;
    }
    func()
  }, []);

  const handleSellAmountChange = (e) => {
    setSellAmount(parseFloat(e.target.value));
  };

  const handleSellCurrencyChange = (e) => {
    setSellCurrency(e.target.value);
  };

  const handleBuyCurrencyChange = (e) => {
    setBuyCurrency(e.target.value);
  };

  const buyAmount = sellAmount * exchangeRate;

  return (
    <div className="max-w-md mx-auto bg-gray-500 text-white p-6 rounded-lg shadow-lg dark:bg-gra dark:text-gray-200">
      <div className="flex justify-between items-center mb-2">
        <div className='p-2'>
          <h2 className="text-xl font-bold">Sell</h2>
          <input
            type="number"
            value={sellAmount}
            onChange={handleSellAmountChange}
            className="text-3xl bg-gray-800 p-2 rounded  w-full dark:bg-gray-800"
          />
          <p className="text-lg">${(sellAmount * sellValue).toFixed(2) !== 'NaN' ? (sellAmount * sellValue).toFixed(2) : '0.00'}</p>
        </div>
        <div className='p-2'>
          <select
            value={sellCurrency}
            onChange={handleSellCurrencyChange}
            className="bg-gray-800 px-3 py-1 rounded-full dark:bg-gray-800"
          >
            <option value="ETH">FLIP</option>
            <option value="BTC">ETH</option>
            <option value="USDT">USDC</option>
            {/* Add more options as needed */}
          </select>
        </div>
      </div>
      <div className="flex justify-center my-4">
        <div className="bg-gray-800 p-2 rounded-full dark:bg-gray-700">
          <span className="text-2xl">↓</span>
        </div>
      </div>
      <div className="flex justify-between items-center mb-4 ">
        <div className="p-2 bg-gray-800">
          <h2 className="text-xl font-bold ">Buy</h2>
          <p className="text-3xl">{buyAmount.toFixed(2) !== 'NaN' ? buyAmount.toFixed(2) : '0.00'}</p>
          <p className="text-lg">
            ${(buyAmount * buyValue).toFixed(2) !== 'NaN' ? (buyAmount * buyValue).toFixed(2) : '0.00'}{' '}
            <span className={`text-lg ${priceChange < 0 ? 'text-red-500' : 'text-green-500'}`}>
              ({priceChange.toFixed(2)}%)
            </span>
          </p>
        </div>
        <div className="p-2">
          <select
            value={buyCurrency}
            onChange={handleBuyCurrencyChange}
            className="bg-green-500 px-3 py-1 rounded-full dark:bg-green-700"
          >
            <option value="COMP">ARB</option>
            <option value="LINK">USDC</option>
            <option value="DAI">SOL</option>
            {/* Add more options as needed */}
          </select>
        </div>
      </div>
    </div>
  );
};

export default ExchangeComponent;
