const { getNamedAccounts, ethers, network } = require("hardhat");
const { developmentChains } = require("../../hardhat-helper-config");
const { assert } = require("chai");

developmentChains.includes(network.name)
  ? describe.skip
  : describe("FundMe", async function () {
      let fundMe, deployer;
      const sendValue = ethers.utils.parseEther("0.01");

      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        fundMe = await ethers.getContract("FundMe", deployer);
      });

      it("allows people to fund and withdraw", async function () {
        const fundTxResponse = await fundMe.fund({ value: sendValue });
        await fundTxResponse.wait(1);
        const withdrawTxResponse = await fundMe.withdraw();
        await withdrawTxResponse.wait(1);

        const endingContractBalance = await fundMe.provider.getBalance(
          fundMe.address
        );
        // console.log(`Contract balance: ${endingContractBalance}`);

        assert.equal(endingContractBalance.toString(), "0");
      });
    });
