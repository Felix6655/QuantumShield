
import { ethers, JsonRpcProvider, Contract, Mnemonic, HDNodeWallet } from "ethers";
import { unlockVault, promptForPassword } from "./vault";

const ERC20_ABI = [
  "function decimals() view returns (uint8)",
  "function transfer(address to, uint256 amount) returns (bool)"
];

function walletFromMnemonic(mnemonic: string, index = 0) {
  const path = `m/44'/60'/0'/0/${index}`;
  return HDNodeWallet.fromMnemonic(Mnemonic.fromPhrase(mnemonic), path);
}

async function main() {
  const to = process.env.TO!;
  const amount = process.env.AMOUNT!;          // string like "0.01"
  const token = (process.env.TOKEN || "").trim(); // ERC20 address or empty for ETH
  const idx = Number(process.env.INDEX || 0);

  const rpc = process.env.EVM_RPC_URL!;
  const chainId = Number(process.env.EVM_CHAIN_ID || 0) || undefined;
  // Use vault if available, fallback to env
  const mnemonic = process.env.QS_MNEMONIC || await unlockVault(await promptForPassword());

  if (!rpc) throw new Error("EVM_RPC_URL missing");
  if (!to || !amount) throw new Error("Set TO and AMOUNT");
  if (!mnemonic) throw new Error("Set QS_MNEMONIC or integrate vault unlock");

  const provider = new JsonRpcProvider(rpc, chainId);
  const wallet = walletFromMnemonic(mnemonic, idx).connect(provider);
  const fee = await provider.getFeeData();

  if (!token) {
    // native ETH send (EIP-1559)
    const tx = await wallet.sendTransaction({
      to,
      value: ethers.parseEther(amount),
      maxFeePerGas: fee.maxFeePerGas ?? undefined,
      maxPriorityFeePerGas: fee.maxPriorityFeePerGas ?? undefined
    });
    console.log("ETH tx sent:", tx.hash);
    const rc = await tx.wait();
    console.log("Confirmed in block", rc?.blockNumber);
  } else {
    // ERC20 transfer
    const erc = new Contract(token, ERC20_ABI, wallet);
    const dec = await erc.decimals();
    const qty = ethers.parseUnits(amount, dec);
    const tx = await erc.transfer(to, qty);
    console.log("ERC20 tx sent:", tx.hash);
    const rc = await tx.wait();
    console.log("Confirmed in block", rc?.blockNumber);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
