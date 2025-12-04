//////////////////////////////////////////////////////////////////////////
// WARNING!! Dynamically import this file to avoid bundling mock lib in prod
//////////////////////////////////////////////////////////////////////////

import { Contract, JsonRpcProvider } from "ethers";
import { MockFhevmInstance } from "@fhevm/mock-utils";
import { FhevmInstance } from "../../fhevmTypes";

export const fhevmMockCreateInstance = async (parameters: {
  rpcUrl: string;
  chainId: number;
  metadata: {
    ACLAddress: `0x${string}`;
    InputVerifierAddress: `0x${string}`;
    KMSVerifierAddress: `0x${string}`;
  };
}): Promise<FhevmInstance> => {
  const provider = new JsonRpcProvider(parameters.rpcUrl);
  
  // 查询 InputVerifier 合约的 EIP712 domain
  const inputVerifierContract = new Contract(
    parameters.metadata.InputVerifierAddress,
    ["function eip712Domain() external view returns (bytes1, string, string, uint256, address, bytes32, uint256[])"],
    provider
  );
  const domain = await inputVerifierContract.eip712Domain();
  const verifyingContractAddressInputVerification = domain[4]; // index 4 是 verifyingContract 地址
  const gatewayChainId = Number(domain[3]); // index 3 是 chainId

  const instance = await MockFhevmInstance.create(
    provider,
    provider,
    {
      aclContractAddress: parameters.metadata.ACLAddress,
      chainId: parameters.chainId,
      gatewayChainId: gatewayChainId,
      inputVerifierContractAddress: parameters.metadata.InputVerifierAddress,
      kmsContractAddress: parameters.metadata.KMSVerifierAddress,
      verifyingContractAddressDecryption:
        "0x5ffdaAB0373E62E2ea2944776209aEf29E631A64",
      verifyingContractAddressInputVerification:
        verifyingContractAddressInputVerification,
    },
    {
      // 第 4 个参数：properties (必需)
      inputVerifierProperties: {},
      kmsVerifierProperties: {},
    }
  );
  
  // 类型断言：MockFhevmInstance → FhevmInstance
  return instance as unknown as FhevmInstance;
};


