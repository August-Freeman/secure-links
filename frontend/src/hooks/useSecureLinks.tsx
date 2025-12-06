"use client";

import { ethers } from "ethers";
import {
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { FhevmInstance } from "@/fhevm/fhevmTypes";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import { GenericStringStorage } from "@/fhevm/GenericStringStorage";

import { SecureLinksAddresses } from "@/abi/SecureLinksAddresses";
import { SecureLinksABI } from "@/abi/SecureLinksABI";

export type ClearValueType = {
  handle: string;
  clear: string | bigint | boolean;
};

type ContractInfoType = {
  abi: typeof SecureLinksABI.abi;
  address?: `0x${string}`;
  chainId?: number;
  chainName?: string;
};

function getContractByChainId(
  chainId: number | undefined
): ContractInfoType {
  if (!chainId) {
    return { abi: SecureLinksABI.abi };
  }

  const entry =
    SecureLinksAddresses[chainId.toString() as keyof typeof SecureLinksAddresses];

  if (!entry || !("address" in entry) || entry.address === ethers.ZeroAddress) {
    return { abi: SecureLinksABI.abi, chainId };
  }

  return {
    address: entry?.address as `0x${string}` | undefined,
    chainId: entry?.chainId ?? chainId,
    chainName: entry?.chainName,
    abi: SecureLinksABI.abi,
  };
}

export const useSecureLinks = (parameters: {
  instance: FhevmInstance | undefined;
  fhevmDecryptionSignatureStorage: GenericStringStorage;
  eip1193Provider: ethers.Eip1193Provider | undefined;
  chainId: number | undefined;
  ethersSigner: ethers.JsonRpcSigner | undefined;
  ethersReadonlyProvider: ethers.ContractRunner | undefined;
  sameChain: RefObject<(chainId: number | undefined) => boolean>;
  sameSigner: RefObject<
    (ethersSigner: ethers.JsonRpcSigner | undefined) => boolean
  >;
}) => {
  const {
    instance,
    fhevmDecryptionSignatureStorage,
    chainId,
    ethersSigner,
    ethersReadonlyProvider,
    sameChain,
    sameSigner,
  } = parameters;

  const [countHandle, setCountHandle] = useState<string | undefined>(undefined);
  const [clearCount, setClearCount] = useState<ClearValueType | undefined>(
    undefined
  );
  const clearCountRef = useRef<ClearValueType>(undefined);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isDecrypting, setIsDecrypting] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  const [myUrls, setMyUrls] = useState<string[]>([]);
  const [myTimestamps, setMyTimestamps] = useState<bigint[]>([]);
  const [allUrls, setAllUrls] = useState<string[]>([]);
  const [urlCounts, setUrlCounts] = useState<Record<string, bigint>>({});

  const contractRef = useRef<ContractInfoType | undefined>(undefined);
  const isRefreshingRef = useRef<boolean>(isRefreshing);
  const isDecryptingRef = useRef<boolean>(isDecrypting);
  const isSubmittingRef = useRef<boolean>(isSubmitting);

  const isDecrypted = countHandle && countHandle === clearCount?.handle;

  const contract = useMemo(() => {
    const c = getContractByChainId(chainId);
    contractRef.current = c;
    if (!c.address && chainId) {
      setMessage(`Contract not deployed on this network (Chain ${chainId})`);
    }
    return c;
  }, [chainId]);

  const isDeployed = useMemo(() => {
    if (!contract) {
      return undefined;
    }
    return Boolean(contract.address) && contract.address !== ethers.ZeroAddress;
  }, [contract]);

  const canGetCount = useMemo(() => {
    return contract.address && ethersReadonlyProvider && !isRefreshing;
  }, [contract.address, ethersReadonlyProvider, isRefreshing]);

  const refreshCountHandle = useCallback(() => {
    if (isRefreshingRef.current) {
      return;
    }
    if (
      !contractRef.current ||
      !contractRef.current?.chainId ||
      !contractRef.current?.address ||
      !ethersReadonlyProvider
    ) {
      setCountHandle(undefined);
      return;
    }
    isRefreshingRef.current = true;
    setIsRefreshing(true);
    const thisChainId = contractRef.current.chainId;
    const thisAddress = contractRef.current.address;
    const c = new ethers.Contract(thisAddress, contractRef.current.abi, ethersReadonlyProvider);
    c.getMyLinkCount()
      .then((value: string) => {
        if (sameChain.current(thisChainId) && thisAddress === contractRef.current?.address) {
          setCountHandle(value);
        }
        isRefreshingRef.current = false;
        setIsRefreshing(false);
      })
      .catch((e: unknown) => {
        const errorMsg = e instanceof Error ? e.message : String(e);
        setMessage(`Failed to retrieve link count: ${errorMsg}`);
        isRefreshingRef.current = false;
        setIsRefreshing(false);
      });
  }, [ethersReadonlyProvider, sameChain]);

  useEffect(() => {
    refreshCountHandle();
  }, [refreshCountHandle]);

  const canDecrypt = useMemo(() => {
    return (
      contract.address &&
      instance &&
      ethersSigner &&
      !isRefreshing &&
      !isDecrypting &&
      countHandle &&
      countHandle !== ethers.ZeroHash &&
      countHandle !== clearCount?.handle
    );
  }, [contract.address, instance, ethersSigner, isRefreshing, isDecrypting, countHandle, clearCount]);

  const decryptCountHandle = useCallback(() => {
    if (isRefreshingRef.current || isDecryptingRef.current) { return; }
    if (!contract.address || !instance || !ethersSigner) { return; }
    if (countHandle === clearCountRef.current?.handle) { return; }
    if (!countHandle) {
      setClearCount(undefined); clearCountRef.current = undefined; return;
    }
    if (countHandle === ethers.ZeroHash) {
      setClearCount({ handle: countHandle, clear: BigInt(0) });
      clearCountRef.current = { handle: countHandle, clear: BigInt(0) };
      return;
    }
    const thisChainId = chainId;
    const thisAddress = contract.address;
    const thisHandle = countHandle;
    const thisSigner = ethersSigner;
    isDecryptingRef.current = true;
    setIsDecrypting(true);
    setMessage("Preparing to decrypt your data...");
    const run = async () => {
      const isStale = () => thisAddress !== contractRef.current?.address || !sameChain.current(thisChainId) || !sameSigner.current(thisSigner);
      try {
        const sig = await FhevmDecryptionSignature.loadOrSign(
          instance,
          [thisAddress as `0x${string}`],
          ethersSigner,
          fhevmDecryptionSignatureStorage
        );
        if (!sig) { 
          setMessage("Unable to create decryption signature. Please try again."); 
          return; 
        }
        if (isStale()) { 
          setMessage("Network or wallet changed, decryption cancelled"); 
          return; 
        }
        setMessage("Decrypting your encrypted data...");
        const res = await instance.userDecrypt(
          [{ handle: thisHandle, contractAddress: thisAddress }],
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );
        setMessage("Decryption completed successfully!");
        if (isStale()) { 
          setMessage("Network or wallet changed, decryption cancelled"); 
          return; 
        }
        setClearCount({ handle: thisHandle, clear: res[thisHandle] });
        clearCountRef.current = { handle: thisHandle, clear: res[thisHandle] };
        setMessage(`Your encrypted link count: ${clearCountRef.current.clear}`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        setMessage(`Decryption failed: ${errorMsg}`);
      } finally {
        isDecryptingRef.current = false; 
        setIsDecrypting(false);
      }
    };
    run();
  }, [fhevmDecryptionSignatureStorage, ethersSigner, contract.address, instance, countHandle, chainId, sameChain, sameSigner]);

  const canSubmit = useMemo(() => {
    return contract.address && instance && ethersSigner && !isRefreshing && !isSubmitting;
  }, [contract.address, instance, ethersSigner, isRefreshing, isSubmitting]);

  const saveLink = useCallback((url: string, tags: string[]) => {
    if (isRefreshingRef.current || isSubmittingRef.current) { return; }
    if (!contract.address || !instance || !ethersSigner) { return; }
    const thisChainId = chainId; 
    const thisAddress = contract.address; 
    const thisSigner = ethersSigner;
    const c = new ethers.Contract(thisAddress, contract.abi, thisSigner);
    const valueAbs = 1;
    isSubmittingRef.current = true; 
    setIsSubmitting(true); 
    setMessage("Encrypting your link...");
    const run = async () => {
      const isStale = () => thisAddress !== contractRef.current?.address || !sameChain.current(thisChainId) || !sameSigner.current(thisSigner);
      try {
        const input = instance.createEncryptedInput(thisAddress, thisSigner.address);
        input.add32(valueAbs);
        await new Promise((resolve) => setTimeout(resolve, 100));
        const enc = await input.encrypt();
        if (isStale()) { 
          setMessage("Network or wallet changed, save cancelled"); 
          return; 
        }
        const urlHash = ethers.keccak256(ethers.toUtf8Bytes(url));
        const tagHashes = tags.map((t) => ethers.keccak256(ethers.toUtf8Bytes(t)));
        setMessage("Saving link to blockchain...");
        const tx: ethers.TransactionResponse = await c.saveLink(urlHash, tagHashes, enc.handles[0], enc.inputProof);
        setMessage(`Transaction submitted, waiting for confirmation...`);
        await tx.wait();
        setMessage("Link saved successfully!");
        if (isStale()) { 
          setMessage("Network or wallet changed, save cancelled"); 
          return; 
        }
        refreshCountHandle();
        await refreshMyLinks();
        await refreshAllLinks();
      } catch (e) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        if (errorMsg.includes("user rejected")) {
          setMessage("Transaction cancelled by user");
        } else {
          setMessage(`Failed to save link: ${errorMsg}`);
        }
      } finally { 
        isSubmittingRef.current = false; 
        setIsSubmitting(false); 
      }
    };
    run();
  }, [ethersSigner, contract.address, contract.abi, instance, chainId, refreshCountHandle, sameChain, sameSigner]);

  const refreshMyLinks = useCallback(async () => {
    if (!contract.address || !ethersReadonlyProvider) return;
    const c = new ethers.Contract(contract.address, contract.abi, ethersReadonlyProvider);
    const [urls, timestamps] = await c.getOwnerLinks(ethersSigner?.address ?? ethers.ZeroAddress);
    setMyUrls(urls);
    setMyTimestamps(timestamps);
  }, [contract.address, contract.abi, ethersReadonlyProvider, ethersSigner?.address]);

  const refreshAllLinks = useCallback(async () => {
    if (!contract.address || !ethersReadonlyProvider) return;
    const c = new ethers.Contract(contract.address, contract.abi, ethersReadonlyProvider);
    const urls: string[] = await c.getAllLinks();
    const entries: Record<string, bigint> = {};
    for (let i = 0; i < urls.length; ++i) {
      const cnt: bigint = await c.getLinkCount(urls[i]);
      entries[urls[i]] = cnt;
    }
    setAllUrls(urls);
    setUrlCounts(entries);
  }, [contract.address, contract.abi, ethersReadonlyProvider]);

  useEffect(() => { refreshMyLinks(); refreshAllLinks(); }, [refreshMyLinks, refreshAllLinks]);

  return {
    contractAddress: contract.address,
    canDecrypt,
    canGetCount,
    canSubmit,
    saveLink,
    decryptCountHandle,
    refreshCountHandle,
    refreshMyLinks,
    refreshAllLinks,
    isDecrypted,
    message,
    clear: clearCount?.clear,
    handle: countHandle,
    isDecrypting,
    isRefreshing,
    isSubmitting,
    isDeployed,
    myUrls,
    myTimestamps,
    allUrls,
    urlCounts,
  };
};


