import type { FhevmRelayerSDKType as _Relayer, FhevmWindowType as _Win } from "../fhevmTypes";

export type FhevmRelayerSDKType = _Relayer;
export type FhevmWindowType = _Win;

export type FhevmInitSDKOptions = {
  trace?: (message?: unknown, ...optionalParams: unknown[]) => void;
};

export type FhevmLoadSDKType = () => Promise<void>;
export type FhevmInitSDKType = (options?: FhevmInitSDKOptions) => Promise<boolean>;


