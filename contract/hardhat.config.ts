import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    profiles: {
      // 0.8.28 satisfies the contracts' `pragma solidity ^0.8.24`.
      // Hardhat 3 requires exact compiler versions here (no semver ranges).
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    monadTestnet: {
      type: "http",
      chainType: "l1",
      url: "https://testnet-rpc.monad.xyz",
      chainId: 10143,
      // Lazily resolved: read from the MONAD_PRIVATE_KEY env var or the
      // encrypted hardhat-keystore (`npx hardhat keystore set MONAD_PRIVATE_KEY`).
      // Only required when a task actually connects to monadTestnet, so
      // compile/test never fail when the key is unset.
      accounts: [configVariable("MONAD_PRIVATE_KEY")],
    },
  },
});
