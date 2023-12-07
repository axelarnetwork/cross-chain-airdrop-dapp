import { useEffect, useState } from "react";
import Switch from "react-switch";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import {
  useContractWrite,
  useContractRead,
  usePrepareContractWrite,
  useWaitForTransaction,
  erc20ABI,
  useAccount,
} from "wagmi";
import { ethers } from "ethers";
import {
  AxelarQueryAPI,
  Environment,
  EvmChain,
  GasToken,
} from "@axelar-network/axelarjs-sdk";

import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import AirdropContract from "../hardhat/artifacts/contracts/Airdrop.sol/Airdrop.json";

const POLYGON_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_POLYGON_CONTRACT_ADDRESS;
const AVALANCHE_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_AVALANCHE_CONTRACT_ADDRESS;
const AVALANCHE_RPC_URL = process.env.NEXT_PUBLIC_AVALANCHE_RPC_URL;

export default function Home() {
  const [darkMode, setDarkMode] = useState(false);
  const [amount, setAmount] = useState(0);
  const [Addresses, setAddresses] = useState("");
  const { address } = useAccount();
  const [isSendButtonVisible, setIsSendButtonVisible] = useState(false);
  const [isApproveButtonVisible, setIsApproveButtonVisible] = useState(true);
  const [isTextareaVisible, setIsTextareaVisible] = useState(false);
  const api = new AxelarQueryAPI({ environment: Environment.TESTNET });
  const [gasFee, setGasFee] = useState(0);
  const [amountReceived, setAmountReceived] = useState(0);
  const [airdropRecipients, setAirdropRecipients] = useState([]);

  const toastOptions = {
    position: "top-right",
    autoClose: 8000,
    closeOnClick: true,
    pauseOnHover: false,
    draggable: true,
  };

  // Approve USDC to be spent by the contract
  const { data: useContractWriteUSDCData, write: approveWrite } =
    useContractWrite({
      address: "0x2c852e740B62308c46DD29B982FBb650D063Bd07", // Address of the aUSDC contract on Polygon
      abi: erc20ABI,
      functionName: "approve",
      args: [
        POLYGON_CONTRACT_ADDRESS,
        ethers.utils.parseUnits(amount.toString(), 6),
      ],
    });

  const { data: useWaitForTransactionUSDCData, isSuccess: isUSDCSuccess } =
    useWaitForTransaction({
      hash: useContractWriteUSDCData?.hash,
    });

  // Check Allowance
  const {
    data: readAllowance,
    isError: isAllowanceError,
    isLoading: isAllowanceLoading,
  } = useContractRead({
    address: "0x2c852e740B62308c46DD29B982FBb650D063Bd07", // Address of the aUSDC contract on Polygon
    abi: erc20ABI,
    functionName: "allowance",
    args: [address, POLYGON_CONTRACT_ADDRESS],
  });

  // Estimate Gas
  const gasEstimator = async () => {
    const gas = await api.estimateGasFee(
      EvmChain.POLYGON,
      EvmChain.AVALANCHE,
      GasToken.MATIC,
      700000,
      2
    );
    setGasFee(gas);
  };

  // Send Airdrop
  const { data: useContractWriteData, write } = useContractWrite({
    address: POLYGON_CONTRACT_ADDRESS,
    abi: AirdropContract.abi,
    functionName: "sendToMany",
    args: [
      "Avalanche",
      AVALANCHE_CONTRACT_ADDRESS,
      Addresses.split(","),
      "aUSDC",
      ethers.utils.parseUnits(amount.toString(), 6),
    ],
    value: gasFee,
  });

  const { data: useWaitForTransactionData, isSuccess } = useWaitForTransaction({
    // Calling a hook to wait for the transaction to be mined
    hash: useContractWriteData?.hash,
  });

  // Handle send airdrop button
  const handleSendAirdrop = async () => {
    if (!(amount && Addresses)) {
      toast.error("Please enter amount and addresses", toastOptions);
      return;
    }

    if (isAllowanceError) {
      toast.error("Error checking allowance", toastOptions);
      return;
    }

    write();
    toast.info("Sending Airdrop...", {
      ...toastOptions,
    });
  };

  // Handle Approval
  const handleApprove = () => {
    if (!amount) {
      toast.error("Please enter amount", toastOptions);
      return;
    }
    approveWrite();

    toast.info("Approving...", toastOptions);
  };

  // Read data from Avalanche
  const provider = new ethers.providers.JsonRpcProvider(AVALANCHE_RPC_URL);
  const contract = new ethers.Contract(
    AVALANCHE_CONTRACT_ADDRESS,
    AirdropContract.abi,
    provider
  );

  async function readDestinationChainVariables() {
    try {
      const amountReceived = await contract.amountReceived();

      const airdropRecipients = await contract.getRecipients();

      setAmountReceived(amountReceived.toString());

      setAirdropRecipients(airdropRecipients);
    } catch (error) {
      console.log(error);
    }
  }

  useEffect(() => {
    gasEstimator();
    readDestinationChainVariables();
    const body = document.querySelector("body");
    darkMode ? body.classList.add("dark") : body.classList.remove("dark");

    isSuccess
      ? toast.success("Airdrop sent!", {
          toastOptions,
        })
      : useWaitForTransactionData?.error || useContractWriteData?.error
      ? toast.error("Error sending message")
      : null;

    if (isUSDCSuccess) {
      toast.success("USDC Approved!", { toastOptions });
      setIsApproveButtonVisible(false);
      setIsSendButtonVisible(true);
      setIsTextareaVisible(true);
    } else if (
      useWaitForTransactionUSDCData?.error ||
      useContractWriteUSDCData?.error
    ) {
      toast.error("Error approving USDC", { toastOptions });
    }
  }, [
    darkMode,
    useContractWriteData,
    useWaitForTransactionData,
    useContractWriteUSDCData,
    useWaitForTransactionUSDCData,
  ]);

  const handleToggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <div className="container mx-auto px-4 flex flex-col min-h-screen">
      <header className="py-4">
        <div className="flex justify-between items-center">
          <Switch
            onChange={handleToggleDarkMode}
            checked={darkMode}
            onColor="#4F46E5"
            offColor="#D1D5DB"
            uncheckedIcon={
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "100%",
                  fontSize: 15,
                  color: "#FFF",
                  paddingRight: 2,
                }}
              >
                ☀️
              </div>
            }
            checkedIcon={
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "100%",
                  fontSize: 15,
                  color: "#FFF",
                  paddingRight: 2,
                }}
              >
                🌙
              </div>
            }
            className="react-switch"
          />
          <ConnectButton />
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center justify-center">
        <div className="border border-gray-500 rounded-lg p-6 m-2 mb-28">
          <h1 className="text-4xl font-bold mb-8 text-center">
            Cross-chain Airdrop dApp with{" "}
            <span className="text-blue-500">Axelar 🔥 </span>
          </h1>
          <p className=" mb-8 text-center max-w-3xl text-gray-500">
            A cross-chain decentralized application using NextJs, Solidity, and
            Axelar General Message Passing that allows users to receive airdrop
            cross-chain.
          </p>
        </div>
        <div className="flex justify-center">
          <div className="border border-gray-300 rounded-lg p-8 m-2">
            <h2 className="text-2xl font-bold mb-4">
              Airdrop Tokens 💸 Polygon to Avalanche
            </h2>
            <div className="flex flex-col mb-4">
              <label className="font-semibold mb-2">Amount</label>
              <input
                type="number"
                placeholder="Enter amount"
                className="border border-gray-300 rounded-lg p-2"
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            {isTextareaVisible && (
              <div className="flex flex-col mb-4">
                <label className="font-semibold mb-2">Addresses</label>
                <textarea
                  placeholder="Enter addresses (separate with a comma)"
                  className="border border-gray-300 rounded-lg p-2 h-32"
                  onChange={(e) => setAddresses(e.target.value)}
                />
              </div>
            )}
            {isApproveButtonVisible && (
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-6 rounded-full mr-5"
                onClick={() => handleApprove()}
                display="none"
              >
                Approve
              </button>
            )}
            {isSendButtonVisible && (
              <button
                className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-6 rounded-full"
                onClick={handleSendAirdrop}
              >
                Send
              </button>
            )}
          </div>

          <div className="border border-gray-300 rounded-lg p-8 m-2 ">
            <h2 className="text-2xl font-bold mb-4">Airdrop Status 🎉</h2>
            {airdropRecipients.length > 0 ? (
              <>
                <div className="flex flex-col">
                  <p className="font-semibold mb-2">
                    Total Amount:{" "}
                    <span className="font-normal text-gray-500">
                      {amountReceived / 1000000}
                    </span>
                  </p>

                  <p className="font-semibold mb-2">
                    Total Addresses:{" "}
                    <span className="font-normal text-gray-500">
                      {airdropRecipients.length}
                    </span>
                  </p>

                  {airdropRecipients.map((recipient, index) => (
                    <div className="flex flex-col" key={index}>
                      <p className="font-semibold mb-2">
                        Address:{" "}
                        <span className="font-normal text-gray-500">
                          {recipient}
                        </span>
                      </p>
                      <p className="font-semibold mb-2">
                        Amount Received:{" "}
                        <span className="font-normal text-gray-500">
                          {amountReceived / airdropRecipients.length / 1000000}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <span className="text-red-500">Waiting for response...</span>
            )}
          </div>
        </div>
      </main>
      <ToastContainer />
      <footer className="flex justify-center items-center py-8 border-t border-gray-300">
        <a
          href="https://github.com/Olanetsoft/cross-chain-airdrop-dapp"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center font-bold text-blue-500 text-lg"
        >
          View on GitHub &rarr;
        </a>
      </footer>
    </div>
  );
}
