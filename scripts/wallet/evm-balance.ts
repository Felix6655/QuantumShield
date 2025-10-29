
import { ethers, JsonRpcProvider, Contract, Mnemonic, HDNodeWallet } from "ethers";
import { unlockVault, promptForPassword } from "./vault";

const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function balanceOf(address) view returns (uint256)"
];

function walletFromMnemonic(mnemonic: string, index = 0) {
  const path = `m/44'/60'/0'/0/${index}`;
  return HDNodeWallet.fromMnemonic(Mnemonic.fromPhrase(mnemonic), path);
}

async function main() {
  const idx = Number(process.env.INDEX || 0);
  const token = (process.env.TOKEN || "").trim(); // ERC20 address or empty for ETH
  const rpc = process.env.EVM_RPC_URL!;
  // Use vault if available, fallback to env
  const mnemonic = process.env.QS_MNEMONIC || await unlockVault(await promptForPassword());

  if (!rpc) throw new Error("EVM_RPC_URL missing");
  if (!mnemonic) throw new Error("Set QS_MNEMONIC or integrate vault unlock here");

  const provider = new JsonRpcProvider(rpc, Number(process.env.EVM_CHAIN_ID || 0) || undefined);
  const w = walletFromMnemonic(mnemonic, idx).connect(provider);

  if (!token) {
    const bal = await provider.getBalance(w.address);
    console.log(JSON.stringify({ address: w.address, eth: ethers.formatEther(bal) }, null, 2));
  } else {
    const erc = new Contract(token, ERC20_ABI, provider);
    const [dec, raw] = await Promise.all([erc.decimals(), erc.balanceOf(w.address)]);
    const human = ethers.formatUnits(raw, dec);
    console.log(JSON.stringify({ address: w.address, token, balance: human, decimals: dec }, null, 2));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
