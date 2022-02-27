import React, { useEffect, useState } from "react";
import { AOM_ADDRESS, AOM_ABI } from "./config";
import getWeb3 from "./getWeb3";
import "./App.css";

var ethUtil = require("ethereumjs-util");
var sigUtil = require("eth-sig-util");

const App = () => {
  const [web3, setWeb3] = useState(null);
  const [connected, setConnected] = useState(false);
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState(0);
  const [nftBalance, setNftBalance] = useState([]);
  const [networkId, setNetworkId] = useState(null);
  const [signature, setSignature] = useState(null);
  const [selectedNft, setSelectedNft] = useState(null);
  const [selectedExp, setSelectedExp] = useState(50);
  const [AOM, setAOM] = useState({
    instance: null,
    isOwner: false,
    presaleActive: false,
    publicActive: false,
    breedingActive: false,
    upgradeActive: false,
  });

  useEffect(() => {
    const init = async () => {
      try {
        const web3 = await getWeb3();
        const accounts = await web3.eth.requestAccounts();
        const networkId = await web3.eth.net.getId();

        setWeb3(web3);
        setAccount(accounts[0]);
        setNetworkId(networkId);
      } catch (error) {
        alert(
          `Failed to load web3, accounts, or contract. Check console for details.`
        );
        console.error(error);
      }
    };

    init();
  }, []);

  useEffect(() => {
    const loadAomContract = async () => {
      if (web3) {
        let isOwner = false;
        const _aom = new web3.eth.Contract(AOM_ABI, AOM_ADDRESS);

        if (account != null) {
          const owner = await _aom.methods.owner().call();
          isOwner = owner === account;

          const balanceOf = await _aom.methods.balanceOf(account).call();
          if (balanceOf > 0) {
            let tokens = [];
            for (var i = 0; i < balanceOf; i++) {
              tokens.push(
                await _aom.methods.tokenOfOwnerByIndex(account, i).call()
              );
            }
            setSelectedNft(tokens[0]);
            setNftBalance(tokens);
          }
        }

        const presaleActive = await _aom.methods.presaleMintActive().call();
        const publicActive = await _aom.methods.publicMintActive().call();
        const breedingActive = await _aom.methods.breedingActive().call();
        const upgradeActive = await _aom.methods.upgradeActive().call();
        const newState = {
          ...AOM,
          instance: _aom,
          isOwner,
          presaleActive,
          publicActive,
          breedingActive,
          upgradeActive,
        };
        setAOM(newState);
      }
    };

    loadAomContract();
  }, [AOM, account, web3]);

  const connectWallet = async () => {
    const accounts = await web3.eth.requestAccounts();
    var balance = web3.eth.getBalance(accounts[0]); //Will give value in.
    balance = web3.utils.fromWei(await balance, "ether");

    setAccount(accounts[0]);
    setBalance(balance);
    setNetworkId(await web3.eth.net.getId());
    setConnected(true);
  };

  const upgradeAOM = async () => {
    const signer = account;
    const tokenId = selectedNft;
    const signExp = selectedExp;

    const msgParams = JSON.stringify({
      domain: {
        name: "Age Of Meta",
        version: "1",
        chainId: networkId,
        verifyingContract: AOM_ADDRESS,
      },
      message: {
        user: signer,
        id: tokenId,
        exp: signExp,
      },
      primaryType: "Upgrade",
      types: {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" },
        ],
        Upgrade: [
          { name: "user", type: "address" },
          { name: "id", type: "uint256" },
          { name: "exp", type: "uint256" },
        ],
      },
    });

    var from = ethUtil.toChecksumAddress(signer);
    console.log("CLICKED, SENDING PERSONAL SIGN REQ", "from", from, msgParams);
    var params = [from, msgParams];
    console.dir(params);
    var method = "eth_signTypedData_v4";

    web3.currentProvider.sendAsync(
      { method, params, from },
      async (err, result) => {
        if (err) return console.log(err);
        if (result.error) return console.error("ERROR", result);
        console.log("TYPED SIGNED:" + JSON.stringify(result.result));
        setSignature(result.result);

        // Call the actual upgrade function
        // await AOM?.instance.methods.Upgrade(tokenId, signExp, signature).send({from: signer});
      }
    );
  };

  const verifySignatureOffChain = () => {
    const signer = account;
    const tokenId = selectedNft;
    const signExp = selectedExp;

    const msgParams = JSON.stringify({
      domain: {
        name: "Age Of Meta",
        version: "1",
        chainId: networkId,
        verifyingContract: AOM_ADDRESS,
      },
      message: {
        user: signer,
        id: tokenId,
        exp: signExp,
      },
      primaryType: "Upgrade",
      types: {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" },
        ],
        Upgrade: [
          { name: "user", type: "address" },
          { name: "id", type: "uint256" },
          { name: "exp", type: "uint256" },
        ],
      },
    });

    const recovered = sigUtil.recoverTypedSignature({
      data: JSON.parse(msgParams),
      sig: signature,
    });

    if (
      ethUtil.toChecksumAddress(recovered) === ethUtil.toChecksumAddress(signer)
    ) {
      console.log(recovered);
      alert("Successfully verify signer as " + recovered);
    } else {
      alert("Failed to verify signature");
    }

    //getting r s v from a signature
    const sig = signature.substring(2);
    const r = "0x" + sig.substring(0, 64);
    const s = "0x" + sig.substring(64, 128);
    const v = parseInt(sig.substring(128, 130), 16);
    console.log("r:", r);
    console.log("s:", s);
    console.log("v:", v);
  };

  const verifySignatureOnChain = async () => {
    const signer = account;
    const tokenId = selectedNft;
    const signExp = selectedExp;

    const result = await AOM?.instance.methods
      .verify(signer, tokenId, signExp, signature)
      .call();

    if (result === signer) {
      alert("Successfully verify signer as " + result);
    } else {
      alert("Failed to verify signature");
    }
  };

  return (
    <div className="App">
      {!connected && <button onClick={connectWallet}>Connect Metamask</button>}
      {connected && (
        <>
          <h4>
            Address: {account} {AOM?.isOwner && "(Contract Owner)"}
          </h4>
          <h4>Balance: {balance.toString()}</h4>
          {nftBalance.length > 0 && (
            <div className="column center">
              <div className="column center">
                <label htmlFor="nft">Choose NFT to upgrade:</label>

                <select
                  value={selectedNft}
                  onChange={(e) => setSelectedNft(e.target.value)}
                  name="nft"
                  id="nft"
                >
                  {nftBalance.map((item, i) => (
                    <option key={i} value={item}>
                      {item}
                    </option>
                  ))}
                </select>

                <label htmlFor="nft">Select how much exp:</label>
                <select
                  value={selectedExp}
                  onChange={(e) => setSelectedExp(e.target.value)}
                  name="exp"
                  id="exp"
                >
                  <option value={50}>50</option>
                  <option value={150}>150</option>
                  <option value={300}>300</option>
                  <option value={600}>600</option>
                  <option value={1200}>1200</option>
                  <option value={2400}>2400</option>
                  <option value={4800}>4800</option>
                  <option value={9600}>9600</option>
                  <option value={19200}>19200</option>
                  <option value={38400}>38400</option>
                </select>
              </div>

              <button onClick={upgradeAOM}>Upgrade</button>
              {signature && (
                <>
                  <button onClick={verifySignatureOffChain}>
                    Verify Signature Off-Chain
                  </button>
                  <button onClick={verifySignatureOnChain}>
                    Verify Signature On-Chain
                  </button>
                </>
              )}
            </div>
          )}

          {networkId && networkId !== 4 && (
            <h4 style={{ color: "red" }}>Please change to Rinkeby Network!</h4>
          )}
        </>
      )}

      {AOM != null && (
        <>
          <h2 style={{ marginTop: 50 }}>AOM Info</h2>
          <div className="aom-info">
            <h4>Presale Active : {AOM?.presaleActive.toString()}</h4>
            <h4>Public Active : {AOM?.publicActive.toString()}</h4>
            <h4>Breeding Active : {AOM?.breedingActive.toString()}</h4>
            <h4>Upgrade Active : {AOM?.upgradeActive.toString()}</h4>
          </div>
        </>
      )}
    </div>
  );
};

export default App;
