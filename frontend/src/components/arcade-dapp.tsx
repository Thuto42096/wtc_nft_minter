"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  formatEther,
  isAddressEqual,
  type Address,
  zeroAddress,
} from "viem";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useReadContract,
  usePublicClient,
  useWaitForTransactionReceipt,
  useWriteContract,
  useSwitchChain,
} from "wagmi";

import { contracts, SEPOLIA_CHAIN_ID, VAULT_ADDRESS } from "@/lib/contracts";

function shortAddress(value?: Address) {
  return value ? `${value.slice(0, 6)}...${value.slice(-4)}` : "Not connected";
}

function toBigInt(value: string) {
  if (!/^[0-9]+$/.test(value.trim())) return undefined;
  return BigInt(value);
}

function toPositiveInt(value: string) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function formatToken(value?: bigint, digits = 4) {
  if (value === undefined) return "0";
  const [whole, fraction = ""] = formatEther(value).split(".");
  const trimmed = fraction.slice(0, digits).replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : whole;
}

function formatStartedAt(value?: bigint) {
  if (!value || value === BigInt(0)) return "Not staked";
  return new Date(Number(value) * 1000).toLocaleString();
}

function getErrorMessage(error: unknown) {
  if (!error || typeof error !== "object") return null;

  const maybeShort = "shortMessage" in error ? error.shortMessage : undefined;
  if (typeof maybeShort === "string" && maybeShort.length > 0) return maybeShort;

  const maybeMessage = "message" in error ? error.message : undefined;
  return typeof maybeMessage === "string" && maybeMessage.length > 0
    ? maybeMessage
    : null;
}

function getNextStep({
  isConnected,
  onSepolia,
  nftBalance,
  tokenId,
  ownedByUser,
  approvedForVault,
  stakedByUser,
  rewards,
}: {
  isConnected: boolean;
  onSepolia: boolean;
  nftBalance: bigint | undefined;
  tokenId: bigint | undefined;
  ownedByUser: boolean;
  approvedForVault: boolean;
  stakedByUser: boolean;
  rewards: bigint | undefined;
}): string | null {
  if (!isConnected) return "→ Connect MetaMask to get started.";
  if (!onSepolia) return "→ Switch your wallet to Sepolia testnet.";
  if (!nftBalance || nftBalance === BigInt(0))
    return "→ Mint your first WTC NFT in the Mint Forge below.";
  if (tokenId === undefined)
    return "→ Click a token in your inventory or type a Token ID in Vault Ops.";
  if (ownedByUser && !approvedForVault)
    return "→ Approve this NFT so the Vault can accept it, then stake.";
  if (ownedByUser && approvedForVault && !stakedByUser)
    return "→ Stake this NFT to start earning 1 WTCC per day.";
  if (stakedByUser && rewards && rewards > BigInt(0))
    return "→ Claim your WTCC rewards or keep staking to accumulate more.";
  if (stakedByUser) return "→ NFT is staked and earning. Withdraw any time.";
  return null;
}

function chunkTokenIds(tokenIds: bigint[], size: number) {
  const chunks: bigint[][] = [];

  for (let index = 0; index < tokenIds.length; index += size) {
    chunks.push(tokenIds.slice(index, index + size));
  }

  return chunks;
}

function sortTokenIds(tokenIds: bigint[]) {
  return [...tokenIds].sort((left, right) => {
    if (left === right) return 0;
    return left < right ? -1 : 1;
  });
}

const DISCOVERY_BATCH_SIZE = 100;

export function ArcadeDapp() {
  const [mintQuantity, setMintQuantity] = useState("1");
  const [tokenIdInput, setTokenIdInput] = useState("1");
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const vaultOpsRef = useRef<HTMLDivElement>(null);
  const [discoveredOwnedTokenIds, setDiscoveredOwnedTokenIds] = useState<bigint[]>([]);
  const [discoveredStakedTokenIds, setDiscoveredStakedTokenIds] = useState<bigint[]>([]);
  const [isDiscoveringTokens, setIsDiscoveringTokens] = useState(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);

  const { address, isConnected, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const publicClient = usePublicClient();
  const { connectors, connect, error: connectError, isPending: isConnecting } =
    useConnect();
  const { switchChain, error: switchError, isPending: isSwitching } =
    useSwitchChain();
  const {
    data: hash,
    error: writeError,
    isPending: isWriting,
    writeContract,
  } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  const mintQty = toPositiveInt(mintQuantity);
  const tokenId = toBigInt(tokenIdInput);
  const onSepolia = chainId === SEPOLIA_CHAIN_ID;
  const actionBusy = isWriting || isConfirming || isSwitching;
  const canTransact = isConnected && onSepolia && !actionBusy;

  const metaMaskConnector = useMemo(
    () =>
      connectors.find((connector) => connector.name.toLowerCase().includes("meta")) ??
      connectors[0],
    [connectors],
  );

  const { data: mintPrice } = useReadContract({
    ...contracts.nft,
    functionName: "mintPrice",
    query: { refetchInterval: 15000 },
  });

  const { data: totalSupply } = useReadContract({
    ...contracts.nft,
    functionName: "totalSupply",
    query: { refetchInterval: 30000 },
  });

  const { data: nftBalance } = useReadContract({
    ...contracts.nft,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address), refetchInterval: 10000 },
  });

  const { data: coinBalance } = useReadContract({
    ...contracts.coin,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address), refetchInterval: 10000 },
  });

  const { data: nftOwner, error: nftOwnerError } = useReadContract({
    ...contracts.nft,
    functionName: "ownerOf",
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: { enabled: tokenId !== undefined, refetchInterval: 8000, retry: false },
  });

  const { data: approvedFor } = useReadContract({
    ...contracts.nft,
    functionName: "getApproved",
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: { enabled: tokenId !== undefined, refetchInterval: 8000, retry: false },
  });

  const { data: staker } = useReadContract({
    ...contracts.vault,
    functionName: "ownerOfToken",
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: { enabled: tokenId !== undefined, refetchInterval: 8000 },
  });

  const { data: rewards } = useReadContract({
    ...contracts.vault,
    functionName: "calculateRewards",
    args: tokenId !== undefined ? [address ?? zeroAddress, tokenId] : undefined,
    query: {
      enabled: Boolean(address) && tokenId !== undefined,
      refetchInterval: 8000,
    },
  });

  const { data: startedAt } = useReadContract({
    ...contracts.vault,
    functionName: "timestampStarted",
    args: tokenId !== undefined ? [tokenId] : undefined,
    query: { enabled: tokenId !== undefined, refetchInterval: 8000 },
  });

  const ownedByUser = Boolean(
    address && nftOwner && isAddressEqual(nftOwner, address),
  );
  const approvedForVault = Boolean(
    approvedFor && isAddressEqual(approvedFor, VAULT_ADDRESS),
  );
  const stakedByUser = Boolean(address && staker && isAddressEqual(staker, address));
  const combinedError = writeError ?? connectError ?? switchError;

  const nextStep = getNextStep({
    isConnected,
    onSepolia,
    nftBalance,
    tokenId,
    ownedByUser,
    approvedForVault,
    stakedByUser,
    rewards,
  });

  useEffect(() => {
    let cancelled = false;

    async function discoverTokenIds() {
      if (!address || !publicClient) {
        setDiscoveredOwnedTokenIds([]);
        setDiscoveredStakedTokenIds([]);
        setIsDiscoveringTokens(false);
        setDiscoveryError(null);
        return;
      }

      if (totalSupply === undefined) {
        setIsDiscoveringTokens(true);
        return;
      }

      if (totalSupply === BigInt(0)) {
        setDiscoveredOwnedTokenIds([]);
        setDiscoveredStakedTokenIds([]);
        setIsDiscoveringTokens(false);
        setDiscoveryError(null);
        return;
      }

      setIsDiscoveringTokens(true);
      setDiscoveryError(null);

      try {
        const tokenIds = Array.from(
          { length: Number(totalSupply) },
          (_, index) => BigInt(index + 1),
        );
        const ownedTokenIds: bigint[] = [];
        const stakedTokenIds: bigint[] = [];

        for (const tokenIdChunk of chunkTokenIds(tokenIds, DISCOVERY_BATCH_SIZE)) {
          const [ownersResult, stakersResult] = await Promise.all([
            publicClient.multicall({
              allowFailure: false,
              contracts: tokenIdChunk.map((currentTokenId) => ({
                ...contracts.nft,
                functionName: "ownerOf",
                args: [currentTokenId],
              })),
            }),
            publicClient.multicall({
              allowFailure: false,
              contracts: tokenIdChunk.map((currentTokenId) => ({
                ...contracts.vault,
                functionName: "ownerOfToken",
                args: [currentTokenId],
              })),
            }),
          ]);

          const owners = ownersResult as unknown as Address[];
          const stakers = stakersResult as unknown as Address[];

          if (cancelled) return;

          tokenIdChunk.forEach((currentTokenId, index) => {
            const owner = owners[index];
            const currentStaker = stakers[index];

            if (isAddressEqual(owner, address)) {
              ownedTokenIds.push(currentTokenId);
            }

            if (
              currentStaker !== zeroAddress &&
              isAddressEqual(currentStaker, address)
            ) {
              stakedTokenIds.push(currentTokenId);
            }
          });
        }

        if (cancelled) return;

        setDiscoveredOwnedTokenIds(sortTokenIds(ownedTokenIds));
        setDiscoveredStakedTokenIds(sortTokenIds(stakedTokenIds));
      } catch (error) {
        if (cancelled) return;

        setDiscoveredOwnedTokenIds([]);
        setDiscoveredStakedTokenIds([]);
        setDiscoveryError(
          getErrorMessage(error) ?? "Could not auto-discover wallet NFTs yet.",
        );
      } finally {
        if (!cancelled) {
          setIsDiscoveringTokens(false);
        }
      }
    }

    void discoverTokenIds();

    return () => {
      cancelled = true;
    };
  }, [address, publicClient, totalSupply, hash, isConfirmed]);

  const statusMessage =
    getErrorMessage(combinedError) ??
    (isConnecting
      ? "Opening MetaMask..."
      : isSwitching
        ? "Switching wallet to Sepolia..."
        : isWriting
          ? `Sending ${activeAction ?? "transaction"}...`
          : isConfirming
            ? `Waiting for ${activeAction ?? "transaction"} confirmation...`
            : isConfirmed
              ? `${activeAction ?? "Transaction"} confirmed on Sepolia.`
              : null);

  const handleMint = () => {
    if (!mintQty || !mintPrice) return;
    setActiveAction("mint");
    writeContract({
      ...contracts.nft,
      functionName: "mint",
      args: [BigInt(mintQty)],
      value: mintPrice * BigInt(mintQty),
    });
  };

  const handleApprove = () => {
    if (tokenId === undefined) return;
    setActiveAction("approve");
    writeContract({
      ...contracts.nft,
      functionName: "approve",
      args: [VAULT_ADDRESS, tokenId],
    });
  };

  const handleStake = () => {
    if (tokenId === undefined) return;
    setActiveAction("stake");
    writeContract({
      ...contracts.vault,
      functionName: "stake",
      args: [tokenId],
    });
  };

  const handleClaim = () => {
    if (tokenId === undefined) return;
    setActiveAction("claim");
    writeContract({
      ...contracts.vault,
      functionName: "claimRewards",
      args: [tokenId],
    });
  };

  const handleUnstake = () => {
    if (tokenId === undefined) return;
    setActiveAction("withdraw");
    writeContract({
      ...contracts.vault,
      functionName: "unstake",
      args: [tokenId],
    });
  };

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <section className="pixel-panel overflow-hidden p-6 sm:p-8">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(83,247,194,0.2),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(255,222,89,0.18),transparent_28%)]" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-4">
              <p className="pixel-kicker">Sepolia // MetaMask // 8-bit staking zone</p>
              <h1 className="pixel-title text-3xl leading-tight sm:text-4xl">
                WTC PIXEL VAULT
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-[var(--muted)] sm:text-base">
                Mint your WTC NFT, approve the vault, stake it for 1 WTCC per day,
                claim rewards, or withdraw your NFT whenever you are ready.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[340px]">
              <div className="pixel-stat">
                <span className="pixel-kicker">Wallet</span>
                <strong>{shortAddress(address)}</strong>
              </div>
              <div className="pixel-stat">
                <span className="pixel-kicker">Network</span>
                <strong>{onSepolia ? "Sepolia" : chainId ? `Chain ${chainId}` : "Offline"}</strong>
              </div>
              <div className="pixel-stat">
                <span className="pixel-kicker">NFT price</span>
                <strong>{mintPrice ? `${formatToken(mintPrice)} ETH` : "Loading..."}</strong>
              </div>
              <div className="pixel-stat">
                <span className="pixel-kicker">Reward speed</span>
                <strong>1 WTCC / day</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="flex flex-col gap-6">
            <div className="pixel-panel p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <h2 className="pixel-heading">Player Console</h2>
                  <p className="pixel-copy">Connect MetaMask and enter the vault.</p>
                </div>
                <span className="pixel-badge">Chain #{SEPOLIA_CHAIN_ID}</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="pixel-stat">
                  <span className="pixel-kicker">Owned NFTs</span>
                  <strong>{nftBalance?.toString() ?? "0"}</strong>
                </div>
                <div className="pixel-stat">
                  <span className="pixel-kicker">WTCC balance</span>
                  <strong>{formatToken(coinBalance)} WTCC</strong>
                </div>
                <div className="pixel-stat">
                  <span className="pixel-kicker">Minted supply</span>
                  <strong>{totalSupply?.toString() ?? "0"}</strong>
                </div>
                <div className="pixel-stat">
                  <span className="pixel-kicker">Staked by you</span>
                  <strong>{discoveredStakedTokenIds.length.toString()}</strong>
                </div>
              </div>

              {!isConnected && (
                <ol className="mt-4 space-y-1 border-l-4 border-[var(--accent)] pl-4">
                  {[
                    "Connect MetaMask (Sepolia)",
                    "Mint a WTC NFT",
                    "Approve it for the vault",
                    "Stake it to earn 1 WTCC / day",
                    "Claim or withdraw any time",
                  ].map((step, index) => (
                    <li className="pixel-copy text-xs" key={step}>
                      <span className="pixel-kicker mr-2">{index + 1}.</span>
                      {step}
                    </li>
                  ))}
                </ol>
              )}

              <div className="mt-5 flex flex-wrap gap-3">
                {!isConnected ? (
                  <button
                    className="pixel-button"
                    disabled={!metaMaskConnector || isConnecting}
                    onClick={() => metaMaskConnector && connect({ connector: metaMaskConnector })}
                    type="button"
                  >
                    {isConnecting ? "CONNECTING..." : "CONNECT METAMASK"}
                  </button>
                ) : (
                  <>
                    {!onSepolia && (
                      <button
                        className="pixel-button pixel-button--accent"
                        disabled={isSwitching}
                        onClick={() => switchChain({ chainId: SEPOLIA_CHAIN_ID })}
                        type="button"
                      >
                        {isSwitching ? "SWITCHING..." : "SWITCH TO SEPOLIA"}
                      </button>
                    )}
                    <button
                      className="pixel-button pixel-button--ghost"
                      onClick={() => disconnect()}
                      type="button"
                    >
                      DISCONNECT
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="pixel-panel p-6">
              <div className="mb-5">
                <h2 className="pixel-heading">Auto-Discovered Inventory</h2>
                <p className="pixel-copy">
                  Pick a token below to load it into the vault controls automatically.
                </p>
              </div>

              <div className="grid gap-4">
                <div className="pixel-stat">
                  <span className="pixel-kicker">Wallet NFTs</span>
                  {isDiscoveringTokens ? (
                    <strong>Scanning minted supply...</strong>
                  ) : discoveredOwnedTokenIds.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {discoveredOwnedTokenIds.map((discoveredTokenId) => {
                        const isSelected = tokenId === discoveredTokenId;

                        return (
                          <button
                            className={`pixel-button px-3 py-2 text-[0.58rem] ${
                              isSelected ? "pixel-button--accent" : "pixel-button--ghost"
                            }`}
                            key={`owned-${discoveredTokenId.toString()}`}
                            onClick={() => {
                              setTokenIdInput(discoveredTokenId.toString());
                              vaultOpsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                            }}
                            type="button"
                          >
                            #{discoveredTokenId.toString()}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <strong className="text-[var(--muted)]">
                      {isConnected ? "No wallet NFTs found — mint one below." : "Connect wallet to see your NFTs."}
                    </strong>
                  )}
                </div>

                <div className="pixel-stat">
                  <span className="pixel-kicker">Vault-staked NFTs</span>
                  {isDiscoveringTokens ? (
                    <strong>Scanning vault...</strong>
                  ) : discoveredStakedTokenIds.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {discoveredStakedTokenIds.map((discoveredTokenId) => {
                        const isSelected = tokenId === discoveredTokenId;

                        return (
                          <button
                            className={`pixel-button px-3 py-2 text-[0.58rem] ${
                              isSelected ? "pixel-button--accent" : "pixel-button--ghost"
                            }`}
                            key={`staked-${discoveredTokenId.toString()}`}
                            onClick={() => {
                              setTokenIdInput(discoveredTokenId.toString());
                              vaultOpsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                            }}
                            type="button"
                          >
                            #{discoveredTokenId.toString()}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <strong className="text-[var(--muted)]">
                      {isConnected ? "No staked NFTs — approve and stake a wallet NFT." : "Connect wallet to see staked NFTs."}
                    </strong>
                  )}
                </div>
              </div>

              {discoveryError ? (
                <p className="pixel-copy mt-4 text-[var(--danger)]">{discoveryError}</p>
              ) : (
                <p className="pixel-copy mt-4">
                  Click any token to load it into Vault Ops instantly.
                </p>
              )}
            </div>

            <div className="pixel-panel p-6">
              <div className="mb-5">
                <h2 className="pixel-heading">Mint Forge</h2>
                <p className="pixel-copy">
                  Choose how many NFTs to mint. The contract requires exact ETH.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-[180px_1fr] md:items-end">
                <label className="flex flex-col gap-2">
                  <span className="pixel-label">Quantity</span>
                  <input
                    className="pixel-input"
                    inputMode="numeric"
                    min="1"
                    onChange={(event) => setMintQuantity(event.target.value)}
                    type="number"
                    value={mintQuantity}
                  />
                </label>

                <div className="rounded-xl border-4 border-[var(--panel-border)] bg-[var(--panel-dark)] p-4">
                  <p className="pixel-copy">
                    Total cost: {mintPrice && mintQty ? `${formatToken(mintPrice * BigInt(mintQty))} ETH` : "Enter a valid quantity"}
                  </p>
                </div>
              </div>

              <button
                className="pixel-button mt-5 w-full sm:w-auto"
                disabled={!canTransact || !mintQty || !mintPrice}
                onClick={handleMint}
                type="button"
              >
                MINT NFT
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="pixel-panel p-6" ref={vaultOpsRef}>
              <div className="mb-5">
                <h2 className="pixel-heading">Vault Ops</h2>
                <p className="pixel-copy">
                  Staking is two steps: <strong className="text-[var(--foreground)]">Approve</strong> the vault once,
                  then <strong className="text-[var(--foreground)]">Stake</strong>. Earn 1 WTCC per day.
                </p>
              </div>

              <label className="flex flex-col gap-2">
                <span className="pixel-label">Token ID</span>
                <input
                  className="pixel-input"
                  inputMode="numeric"
                  min="1"
                  onChange={(event) => setTokenIdInput(event.target.value)}
                  type="number"
                  value={tokenIdInput}
                />
              </label>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="pixel-stat">
                  <span className="pixel-kicker">NFT owner</span>
                  <strong>
                    {tokenId === undefined
                      ? "Enter token"
                      : nftOwnerError
                        ? "Not minted"
                        : shortAddress(nftOwner)}
                  </strong>
                </div>
                <div className="pixel-stat">
                  <span className="pixel-kicker">Approved for vault</span>
                  <strong>{approvedForVault ? "YES" : "NO"}</strong>
                </div>
                <div className="pixel-stat">
                  <span className="pixel-kicker">Current staker</span>
                  <strong>{staker && staker !== zeroAddress ? shortAddress(staker) : "Not staked"}</strong>
                </div>
                <div className="pixel-stat">
                  <span className="pixel-kicker">Started at</span>
                  <strong>{formatStartedAt(startedAt)}</strong>
                </div>
                <div className="pixel-stat sm:col-span-2">
                  <span className="pixel-kicker">Claimable rewards</span>
                  <strong>{formatToken(rewards)} WTCC</strong>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <button
                  className="pixel-button"
                  disabled={!canTransact || tokenId === undefined || !ownedByUser || approvedForVault}
                  onClick={handleApprove}
                  type="button"
                >
                  APPROVE NFT
                </button>
                <button
                  className="pixel-button pixel-button--accent"
                  disabled={!canTransact || tokenId === undefined || !ownedByUser || !approvedForVault || stakedByUser}
                  onClick={handleStake}
                  type="button"
                >
                  STAKE NFT
                </button>
                <button
                  className="pixel-button"
                  disabled={!canTransact || tokenId === undefined || !stakedByUser || !rewards || rewards <= BigInt(0)}
                  onClick={handleClaim}
                  type="button"
                >
                  CLAIM WTCC
                </button>
                <button
                  className="pixel-button pixel-button--danger"
                  disabled={!canTransact || tokenId === undefined || !stakedByUser}
                  onClick={handleUnstake}
                  type="button"
                >
                  WITHDRAW NFT
                </button>
              </div>
            </div>

            <div className="pixel-panel p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="pixel-heading">Status Feed</h2>
                {actionBusy ? (
                  <span className="pixel-badge">BUSY</span>
                ) : hash ? (
                  <span className="pixel-badge">TX SENT</span>
                ) : null}
              </div>

              {statusMessage ? (
                <p className="pixel-copy min-h-[3rem]">{statusMessage}</p>
              ) : (
                <p className="pixel-copy min-h-[3rem] opacity-60">Idle — no active transaction.</p>
              )}

              {hash ? (
                <a
                  className="pixel-link mt-3 inline-flex"
                  href={`https://sepolia.etherscan.io/tx/${hash}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  VIEW TX ON ETHERSCAN ↗
                </a>
              ) : null}

              {nextStep ? (
                <div className="mt-5 border-l-4 border-[var(--accent)] pl-4">
                  <p className="pixel-kicker mb-1">NEXT STEP</p>
                  <p className="pixel-copy">{nextStep}</p>
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}