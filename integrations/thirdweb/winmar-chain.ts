// Winmar Chain mainnet: custom EVM chain setup for thirdweb TypeScript SDK v5.
// Local SDK compatibility only. Does not indicate official thirdweb network listing.
import { defineChain } from "thirdweb";

export const winmarChain = defineChain({
  id: 12142816,
  rpc: "https://rpc.winmarchain.io",
  name: "Winmar Chain",
  nativeCurrency: {
    name: "Winmar Coin",
    symbol: "WMC",
    decimals: 18,
  },
  blockExplorers: [
    { name: "Winmar Chain Explorer", url: "https://scan.winmarchain.io" },
  ],
});

// WMC logo for display purposes (not the Chainlist network icon):
export const wmcCoinLogoUrl = "https://winmarchain.io/logo/wmc.png";
