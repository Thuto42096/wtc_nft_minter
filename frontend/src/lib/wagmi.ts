import { createConfig, http, injected } from "wagmi";
import { sepolia } from "wagmi/chains";

export const wagmiConfig = createConfig({
  chains: [sepolia],
  connectors: [injected({ target: "metaMask" })],
  transports: {
    [sepolia.id]: http(process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL),
  },
});