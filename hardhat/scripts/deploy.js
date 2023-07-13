const hre = require("hardhat");

async function main() {
  const Airdrop = await hre.ethers.deployContract("Airdrop", [
    "0xBF62ef1486468a6bd26Dd669C06db43dEd5B849B",
    "0xbE406F0189A0B4cf3A05C286473D23791Dd44Cc6",
  ]);

  await Airdrop.waitForDeployment();

  console.log(`Airdrop contract deployed to ${await Airdrop.getAddress()}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

//NEW
//0xe66f6e95E3edECe3567290751c024B19DEebAACd
//0x86bE218aD2CC1Dc3270c4A594E7BA52Fd03d6a46
