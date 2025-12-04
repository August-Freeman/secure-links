import type { FhevmInstance as SDKInstance } from "@zama-fhe/relayer-sdk/bundle";
import type { FhevmInstanceConfig as SDKInstanceConfig } from "@zama-fhe/relayer-sdk/web";
import type { HandleContractPair, UserDecryptResults as RelayerSDKUserDecryptResults } from "@zama-fhe/relayer-sdk/bundle";

export type { HandleContractPair };
export type UserDecryptResults = RelayerSDKUserDecryptResults;
// 向后兼容别名
export type DecryptedResults = UserDecryptResults;

export type FhevmInstance = SDKInstance;
export type FhevmInstanceConfig = SDKInstanceConfig;

export type FhevmRelayerSDKType = {
  __initialized__?: boolean;
  initSDK: (options?: FhevmInitSDKOptions) => Promise<boolean>;
  createInstance: (config: FhevmInstanceConfig) => Promise<FhevmInstance>;
  ZamaEthereumConfig?: {
    chainId: number;
    gatewayChainId: number;
    verifyingContractAddressDecryption: `0x${string}`;
    verifyingContractAddressInputVerification: `0x${string}`;
    aclContractAddress: `0x${string}`;
  };
  SepoliaConfig?: FhevmInstanceConfig;
};

export type FhevmInitSDKOptions = {
  trace?: (message?: unknown, ...optionalParams: unknown[]) => void;
};

export type FhevmWindowType = Window & { relayerSDK: FhevmRelayerSDKType } & typeof globalThis;

export type EIP712Type = {
  domain: Record<string, unknown>;
  primaryType: string;
  message: Record<string, unknown>;
  types: Record<string, unknown>;
};

export type FhevmDecryptionSignatureType = {
  publicKey: string;
  privateKey: string;
  signature: string;
  startTimestamp: number;
  durationDays: number;
  userAddress: `0x${string}`;
  contractAddresses: `0x${string}`[];
  eip712: EIP712Type;
};


