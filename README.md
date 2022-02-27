Sampe DAPP for sign off-chain data & verify on-chain.
This sample is use for upgrading / level-up NFT with experience data.

Run locally:

- npm i
- npm run start

Build project:

- npm run build

NOTE:

- Connect to Rinkeby network
- I'm not implementing mint function because it's just standard mint function, use etherscan if you want to mint
- The actual Upgrade function call currently commented, go ahead to un-comment if you want
- I recommend to save the contract abi in json file
- Use environment variables to store some of the data (ie: smart contract address, owner private key if needed)
- Store experience value in your database
