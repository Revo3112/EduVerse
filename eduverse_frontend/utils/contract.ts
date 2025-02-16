import { getContract } from "thirdweb";
import { client } from "@/app/client";
import { chain } from "@/app/chain";
import { contractABI } from "@/utils/contractABI";

const contractAddress = '0xe054C643abD045ADA25d7b9E07b4810b828A4143';

export const contract = getContract({
  client: client,
  chain: chain,
  address: contractAddress, // Include the contract address here
  abi : contractABI
});
