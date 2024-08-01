/* eslint-disable import/no-extraneous-dependencies */
import React, { useState, useEffect, useRef } from 'react';
import Web3Modal from 'web3modal';
import { Buffer } from 'buffer';
import axios from 'axios';
import { create as ipfsHttpClient } from 'ipfs-http-client';

import { MarketAddress, MarketAddressABI } from './constants';

export const NFTContext = React.createContext();
const ethers = require('ethers');

const fetchContract = signerorProvider =>
  new ethers.Contract(MarketAddress, MarketAddressABI, signerorProvider);

const projectId = process.env.IPFS_PROJECT_ID;
const projectSecret = process.env.API_KEY_SECRET;
const auth = `Basic ${Buffer.from(`${projectId}:${projectSecret}`).toString(
  'base64'
)}`;

export const NFTProvider = ({ children }) => {
  console.log('auth: ', auth);
  const client = useRef({});
  console.log('client: ', client);
  const [currentAccount, setCurrentAccount] = useState('');
  const [isLoadingNFT, setIsLoadingNFT] = useState(false);
  const nftCurrency = 'ETH';

  const checkIfWalletIsConnected = async () => {
    if (!window.ethereum) return alert('Please install MetaMask');

    const accounts = await window.ethereum.request({ method: 'eth_accounts' });

    if (accounts.length) {
      setCurrentAccount(accounts[0]);
    } else {
      console.log('No Accounts Found');
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) return alert('Please install MetaMask');

    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts',
    });

    setCurrentAccount(accounts[0]);

    window.location.reload();
  };

  const uploadToPinata = async file => {
    if (file) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        const response = await axios({
          method: 'POST',
          url: 'https://api.pinata.cloud/pinning/pinFileToIPFS',
          data: formData,
          headers: {
            pinata_api_key: '4a86a8be0709d53c0eba',
            pinata_secret_api_key:
              'b602a8ba8ce3a572fb3cb83573d93af1066f3fccee4d1647bde0e6299a9723ed',
            'Content-Type': 'multipart/form-data',
          },
        });
        const CID = response.data.IpfsHash;
        const ImgHash = `https://gateway.pinata.cloud/ipfs/${CID}`;
        console.log(ImgHash);
        return ImgHash;
      } catch (error) {
        console.log('Unable to upload image to Pinata');
      }
    }
  };

  const pinJSONToIPFS = async (name, description, external_url, CID) => {
    try {
      console.log('JWT', process.env.PINATA_JWT);
      const data = JSON.stringify({
        name: name,
        description: description,
        external_url: external_url,
        image: `ipfs://${CID}`,
      });
      const res = await fetch(
        'https://api.pinata.cloud/pinning/pinJSONToIPFS',
        {
          method: 'POST',
          headers: {
            'Content-type': 'application/json',
            Authorization: `Bearer  ${process.env.PINATA_JWT}`,
          },
          body: data,
        }
      );
      const resData = await res.json();
      console.log('Metadata uploaded,CID:', resData.IpfsHash);
      return resData.IpfsHash;
    } catch (error) {
      console.log(error);
    }
  };

  const uploadToIPFS = async file => {
    const subdomain = 'https://gateway.pinata.cloud';
    try {
      console.log(file);
      const added = await client.add({ content: file });

      const url = `${subdomain}/ipfs/${added.path}`;

      return url;
    } catch (error) {
      console.error('Error uploading to file to IPFS. Details: ', error);
    }
  };

  const fetchAuth = async () => {
    const response = await fetch('/api/secure');
    const data = await response.json();
    return data;
  };

  const getClient = author => {
    const responseClient = ipfsHttpClient({
      host: 'ipfs.infura.io',
      port: 5001,
      protocol: 'https',
      apiPath: '/api/v0',
      headers: {
        authorization: author,
      },
    });
    return responseClient;
  };

  const createSale = async (url, formInputPrice, isReselling, id) => {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    console.log('connection: ', connection);
    const provider = new ethers.BrowserProvider(connection);
    const signer = await provider.getSigner();

    const price = ethers.parseUnits(formInputPrice, 'ether');
    const contract = fetchContract(signer);
    const listingPrice = await contract.getListingPrice();

    const transaction = !isReselling
      ? await contract.createToken(url, price, {
        value: listingPrice.toString(),
      })
      : await contract.resellToken(id, price, {
        value: listingPrice.toString(),
      });

    setIsLoadingNFT(true);
    await transaction.wait();
  };

  const fetchNFTs = async () => {
    setIsLoadingNFT(false);

    // Replace with your own RPC endpoint
    const provider = new ethers.JsonRpcProvider(
      'https://eth-sepolia.g.alchemy.com/v2/0Hy758w6BteirxoloAs_K_vgQhMZuCIc'
    );
    const contract = fetchContract(provider);

    const data = await contract.fetchMarketItems();

    console.log('fetchMarketItems data: ', data);

    const dataProxy = data;

    // Iterate over each item in the data proxy
    const marketItems = [];
    for (let i = 0; i < dataProxy.length; i++) {
      const itemProxy = dataProxy[i];

      // Extract information from the item proxy
      const tokenId = itemProxy[0];
      const seller = itemProxy[1];
      const owner = itemProxy[2];
      const unformattedPrice = itemProxy[3];
      const isSold = itemProxy[4];

      // Push the extracted data into the marketItems array
      marketItems.push({
        tokenId,
        seller,
        owner,
        unformattedPrice,
        isSold,
      });
    }

    console.log('marketItems: ', marketItems);

    const items = await Promise.all(
      marketItems.map(async item => {
        const { tokenId, seller, owner, unformattedPrice, isSold } = item;

        // Fetch additional data related to the token
        const tokenURI = await contract.tokenURI(tokenId);
        console.log('tokenURI: ', tokenURI);
        const {
          data: { image, name, description },
        } = await axios.get(tokenURI);
        const price = ethers.formatUnits(unformattedPrice.toString(), 'ether');
        return {
          price,
          tokenId: tokenId,
          seller,
          owner,
          image,
          name,
          description,
          tokenURI,
        };
      })
    );
    return items;
  };

  const createNFT = async (formInput, fileUrl, router) => {
    const JWT =
      'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJjMzQ1ZDE3OC1kMWE3LTRiYTMtYjcwZS1hMjcwYTBlYjk2MDAiLCJlbWFpbCI6Imt1bmFsZ29sYTk5MzBAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBpbl9wb2xpY3kiOnsicmVnaW9ucyI6W3siaWQiOiJGUkExIiwiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjF9LHsiaWQiOiJOWUMxIiwiZGVzaXJlZFJlcGxpY2F0aW9uQ291bnQiOjF9XSwidmVyc2lvbiI6MX0sIm1mYV9lbmFibGVkIjpmYWxzZSwic3RhdHVzIjoiQUNUSVZFIn0sImF1dGhlbnRpY2F0aW9uVHlwZSI6InNjb3BlZEtleSIsInNjb3BlZEtleUtleSI6IjRhODZhOGJlMDcwOWQ1M2MwZWJhIiwic2NvcGVkS2V5U2VjcmV0IjoiYjYwMmE4YmE4Y2UzYTU3MmZiM2NiODM1NzNkOTNhZjEwNjZmM2ZjY2VlNGQxNjQ3YmRlMGU2Mjk5YTk3MjNlZCIsImlhdCI6MTcxMTYyMjUwOH0.mk4uKvmLqHfYB6TLt8OUf8z57Vr9GRKSuWEZNsdvN0k';
    const { name, description, price } = formInput ?? {};
    if (!name || !description || !price || !fileUrl) {
      console.error('Missing required input for NFT creation');
      return;
    }

    // const external_url = 'https://gateway.pinata.cloud/ipfs/';
    const external_url = 'https://gateway.pinata.cloud/';

    if (fileUrl.startsWith(external_url)) {
      // Extract CID from fileUrl
      const CID = fileUrl.substring(external_url.length);
      console.log('substring CID:', CID);

      // const fileUrlmetadata = await pinJSONToIPFS(
      //   name,
      //   description,
      //   external_url,
      //   CID
      // );
      // console.log('NFT fileUrlmetadata:', fileUrlmetadata);
      // fileUrl = `https://gateway.pinata.cloud/ipfs/${fileUrlmetadata}`;
      // console.log('NFT fileUrl:', fileUrl);
    } else {
      console.error('Invalid fileUrl format');
    }

    const data = JSON.stringify({
      pinataContent: {
        name: name,
        description: description,
        external_url: 'https://gateway.pinata.cloud/',
        image: fileUrl.substring(external_url.length),
      },
      pinataMetadata: {
        name: 'metadata.json',
      },
    });
    try {
      const res = await axios.post(
        'https://api.pinata.cloud/pinning/pinJSONToIPFS',
        data,
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: JWT,
          },
        }
      );
      console.log('PIN JSON func return: ', res.data);
      console.log('PIN JSON func return IPFSHash: ', res.data.IpfsHash);
      fileUrl = `https://gateway.pinata.cloud/ipfs/${res.data.IpfsHash}`;
    } catch (error) {
      console.log(error);
    }
    alert('NFT has been listed');
    // const subdomain = 'https://gateway.pinata.cloud/';
    // const added = await client.current.add({ content: data }).catch(err => {
    //   console.error('Error uploading to file to IPFS. Details: ', err);
    //   throw err;
    // });
    // const url = `${subdomain}/ipfs/${added.path}`;
    await createSale(fileUrl, price, false, null).catch(err => {
      console.error('Error creating sale', err);
      throw err;
    });
    // router.push('/').catch(err => {
    //   console.error('Error redirecting after NFT creation', err);
    //   throw err;
    // });
  };

  const buyNFT = async nft => {
    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    console.log(connection);
    const provider = new ethers.BrowserProvider(connection);
    // BrowserProvider
    const signer = await provider.getSigner();

    const contract = fetchContract(signer);

    const price = ethers.parseUnits(nft.price.toString(), 'ether');

    const transaction = await contract.createMarketSale(nft.tokenId, {
      value: price,
    });

    setIsLoadingNFT(true);
    await transaction.wait();
    setIsLoadingNFT(false);
  };

  const fetchMyNFTs = async () => {
    setIsLoadingNFT(false);

    const web3Modal = new Web3Modal();
    const connection = await web3Modal.connect();
    console.log('connection ====>', connection);
    // const provider = new ethers.JsonRpcProvider(
    //   'https://eth-sepolia.g.alchemy.com/v2/0Hy758w6BteirxoloAs_K_vgQhMZuCIc'
    // );
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    console.log('provider ====>', provider);

    const contract2 = fetchContract(signer);
    console.log('contract ====>', contract2);

    // const data = type === 'fetchItemsListed'
    //   ? await contract.fetchItemsListed()
    //   : await contract.fetchMyNFTs();

    const data2 = await contract2.fetchMyNFTs();
    const dataProxy2 = data2;

    console.log('data in fetch my NFT', data2);
    // Iterate over each item in the data proxy
    const marketItems2 = [];
    for (let i = 0; i < dataProxy2.length; i++) {
      const itemProxy = dataProxy2[i];

      // Extract information from the item proxy
      const tokenId = itemProxy[0];
      const seller = itemProxy[1];
      const owner = itemProxy[2];
      const unformattedPrice = itemProxy[3];
      const isSold = itemProxy[4];

      // Push the extracted data into the marketItems array
      marketItems2.push({
        tokenId,
        seller,
        owner,
        unformattedPrice,
        isSold,
      });
    }

    console.log('marketItems: ', marketItems2);

    const items2 = await Promise.all(
      marketItems2.map(async item => {
        const { tokenId, seller, owner, unformattedPrice, isSold } = item;
        console.log('seller ====> ', seller);
        const tokenURI = await contract2.tokenURI(tokenId);
        console.log('tokenURI: ', tokenURI);
        const {
          data: { image, name, description },
        } = await axios.get(tokenURI);
        const price = ethers.formatUnits(unformattedPrice.toString(), 'ether');

        return {
          price,
          tokenId: tokenId,
          seller,
          owner,
          image,
          name,
          description,
          tokenURI,
        };
      })
    );

    return items2;
  };

  useEffect(() => {
    async function fetchData() {
      await checkIfWalletIsConnected();
      const { data } = await fetchAuth();
      console.log(data);
      auth.current = data;
      console.log(auth.current);
      client.current = getClient(auth.current);
      console.log(client.current);
    }

    fetchData();
  }, []);

  return (
    <NFTContext.Provider
      value={{
        nftCurrency,
        connectWallet,
        currentAccount,
        uploadToIPFS,
        uploadToPinata,
        createNFT,
        fetchNFTs,
        fetchMyNFTs,
        buyNFT,
        createSale,
        isLoadingNFT,
      }}
    >
      {children}
    </NFTContext.Provider>
  );
};
