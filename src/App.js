import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import './App.css';
import abi from './utils/WavePortal.json';


const TWITTER_HANDLE = '_buildspace';
const TWITTER_LINK = `https://twitter.com/${TWITTER_HANDLE}`;

const App = () => {
  /*
  * Just a state variable we use to store our user's public wallet address.
  */
  const [currentAccount, setCurrentAccount] = useState("");
  const contractAddress = "0x83b751F54a56EFcB8bB54E69e40aC414080F5CDb";
  const contractABI = abi.abi;
  const [totalWaves, setTotalWaves] = useState("0");
  const [allWaves, setAllWaves] = useState([]);
  const [waveMessage, setWaveMessage] = useState("");

  const onChange = (event) => setWaveMessage(event.target.value);

  const getAllWaves = async () => {
    try {
      const provider = new ethers.getDefaultProvider("https://api.avax.network/ext/bc/C/rpc");
      const wavePortalContract = new ethers.Contract(contractAddress, contractABI, provider);
      
      const waves = await wavePortalContract.getAllWaves();

      let wavesCleaned = [];
      waves.forEach(wave => {
        wavesCleaned.push({
          address: wave.waver,
          timestamp: new Date(wave.timestamp * 1000),
          message: wave.message,
        });
      });
      setAllWaves(wavesCleaned);
    } catch (error) {
      console.log(error);
    }
  }

  const connectToAvalancheNetwork = async () => {
    const { ethereum } = window;
    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{chainId: '0xa86a' }],
      });
    } catch (switchError) {
      // Chain has not been added to Metamask
      if (switchError.code === 4902) {
        try {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{chainId: '0xa86a', rpcUrls: ['https://api.avax.network/ext/bc/C/rpc'], chainName: "Avalanche Network", blockExplorerUrls: ['https://snowtrace.io/'], nativeCurrency: {
              name: "Avalanche", symbol: "AVAX", decimals: 18
            }}],
          });
        } catch (addError) {
          // TODO: Handle AddChain error
          console.log("Error adding Avalanche Network");
        }
      }
    }
  }

  const checkIfWalletIsConnected = async () => {
    try {
    /* 
    * First make sure we have access to window.ethereum
    */
      const { ethereum } = window;

      if (!ethereum) {
        console.log("Make sure you have metamask!");
        // We don't need metamask to call these functions
        getTotalWaves();
        getAllWaves();
        return;
      } else {
        console.log("We have the ethereum object", ethereum);
      }

      // Make sure we are on the avalanche Network
      if (ethereum.chainId !== "0xa86a") {
        // We need to switch to the avalanche network
        connectToAvalancheNetwork();
      }

      /*
      * Check if we're authorized to access the user's wallet.
      */
      const accounts = await ethereum.request({ method: 'eth_accounts' });
      getTotalWaves();
      getAllWaves();

      if (accounts.length !== 0) {
        const account = accounts[0]; // We only grab the first wallet that the user has
        console.log("Found an authorized account:", account);
        setCurrentAccount(account);
      } else {
        console.log("No authorized account found!")
      } 
      } catch (error) {
        console.log(error);
    }
    
  }

  const connectWallet = async () => {
    try {
      const {ethereum } = window;

      if (!ethereum) {
        alert("Please install Metamask to use this site."); // TODO: Have this be a modal that pops up instead of an alert
        return;
      }

      const accounts = await ethereum.request({ method: "eth_requestAccounts" });

      console.log("Connected", accounts[0]);
      setCurrentAccount(accounts[0]);
    } catch (error) {
      console.log(error);
    }
  } 

  const getTotalWaves = async () => {
    try {
      const provider = new ethers.getDefaultProvider("https://api.avax.network/ext/bc/C/rpc");
      const wavePortalContract = new ethers.Contract(contractAddress, contractABI, provider);
      let count = await wavePortalContract.getTotalWaves();
      setTotalWaves(count.toNumber());
      console.log("TOTAL WAVES IS:", totalWaves);
    } catch (error) {
      console.log(error);
    }
  }

  const wave = async () => {
    try {
      const { ethereum } = window;

      if (ethereum) {
        if (ethereum.chainId !== "0xa86a") {
          connectToAvalancheNetwork();
        }
        if (ethereum.chainId === "0xa86a") {
          const provider = new ethers.providers.Web3Provider(ethereum);
          const signer = provider.getSigner();
          const wavePortalContract = new ethers.Contract(contractAddress, contractABI, signer);

          await getTotalWaves();
          console.log("Retrieved total wave count..", totalWaves);

          console.log("Waving with message:", waveMessage);
          const waveTxn = await wavePortalContract.wave(waveMessage, { gasLimit: 300000 });
          console.log("Mining...", waveTxn.hash);

          await waveTxn.wait();
          console.log("Mined -- ", waveTxn.hash);

          await getTotalWaves();
          console.log("Retrieved total wave count...", totalWaves);
        } else {
          alert("Please make sure you are connected to the Avalanche Mainnet");
          console.log("Trying to wave from the wrong network");
        }
      } else {
        alert("You need to connect your metamask wallet first");
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    let wavePortalContract;

    const onNewWave = (from, timestamp, message) => {
      console.log('NewWave', from, timestamp, message);
      setAllWaves(prevState => [
        ...prevState,
        {
          address: from,
          timestamp: new Date(timestamp * 1000),
          message: message,
        },
      ]);
    };

    const provider = new ethers.getDefaultProvider("https://api.avax.network/ext/bc/C/rpc");
    wavePortalContract = new ethers.Contract(contractAddress, contractABI, provider);
    wavePortalContract.on('NewWave', onNewWave);

    return () => {
      if (wavePortalContract) {
        wavePortalContract.off('NewWave', onNewWave);
      }
    };
  }, []);

  /*
  * This runs our function when the page loads
  */
  useEffect(() => {
    checkIfWalletIsConnected();
  }, [])

  return (
    <div className="">

      <div className="">
        <div className="window">
          <div className="header">
            ⛰️ Welcome to AvaSpace
            </div>

            <div className="bio">
            Write a message and store it on the blockchain forever for others to read.
            <br/>
            Every message you send also has a 15% chance of winning some free AVAX.
            <br/>
            Connect your Avalanche wallet and leave me a message!
          </div>
        </div>

        
        {!currentAccount && (
          <div className="window">
          &nbsp;You haven't connected a wallet.&nbsp;
            <button className="button" onClick={connectWallet}>
              Connect Wallet
            </button>
          </div>
        )}
        
        

        <div className="window white">
          <div className="fieldset">
            <p>
            Leave a comment on my wall :P
            </p>
          </div>
        </div>
        <div className="window white">
          <div className="fieldset">
            <input type="text" placeholder="Enter a message" value={waveMessage} onChange={onChange} />
            <div>
              <p className="trade-buttons">
                <button className="button" id="waveButton" onClick={wave}>
                  Wave at Me
                </button>
              </p>
            </div>
          </div>
        </div>
        
        <div className="window white">
          <div className="fieldset">
            <p>
            There have been {totalWaves} comments
            </p>
          </div>
        </div>

        {allWaves.slice(0).reverse().map((wave, index) => {
          return (
            <div key={index} className="window white">
              <div className="fieldset">
                <div className="waveDetails">Address: {wave.address}</div>
                <div className="waveDetails">Time: {wave.timestamp.toLocaleTimeString()}</div>
                <div className="waveDetails">Message: {wave.message}</div>
              </div>
            </div>)
        })}

        <div className="footer-container window white">
          #Twitter&nbsp;
          <a
            className="footer-text"
            href={TWITTER_LINK}
            target="_blank"
            rel="noreferrer"
          >{`built on @${TWITTER_HANDLE}`}</a>
        </div>
      </div>
    </div>
  );
}

export default App
