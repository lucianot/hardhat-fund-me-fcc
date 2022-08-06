const { deployments, ethers, getNamedAccounts } = require("hardhat");
const { developmentChains } = require("../../hardhat-helper-config");
const { assert, expect } = require("chai");

!developmentChains.includes(network.name) // Is chain dev?
  ? describe.skip
  : describe("FundMe", async function () {
      let fundMe;
      let deployer;
      let mockV3Aggregator;
      const sendValue = ethers.utils.parseEther("0.01");

      beforeEach(async function () {
        deployer = (await getNamedAccounts()).deployer;
        await deployments.fixture(["all"]);
        fundMe = await ethers.getContract("FundMe", deployer);
        mockV3Aggregator = await ethers.getContract(
          "MockV3Aggregator",
          deployer
        );
      });

      describe("constructor", async function () {
        it("sets the aggregator address", async function () {
          const response = await fundMe.getPriceFeed();
          assert.equal(response, mockV3Aggregator.address);
        });
      });

      describe("fund", async function () {
        it("fails if you don't send enough ETH", async function () {
          await expect(fundMe.fund()).to.be.revertedWith("Didn't send enough!");
        });

        it("updates the amount funded data structure", async function () {
          await fundMe.fund({ value: sendValue });
          const response = await fundMe.getAddressToAmountFunded(deployer);
          assert.equal(response.toString(), sendValue.toString());
        });

        it("adds funder to funder array", async function () {
          await fundMe.fund({ value: sendValue });
          const response = await fundMe.getFunder(0);
          assert.equal(response, deployer);
        });
      });

      describe("withdraw", async function () {
        beforeEach(async function () {
          await fundMe.fund({ value: sendValue });
        });

        it("withdraws ETH from a single funder", async function () {
          // Arrange
          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );

          // Act
          const txResponse = await fundMe.withdraw();
          const txReceipt = await txResponse.wait(1);

          const { gasUsed, effectiveGasPrice } = txReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);
          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );

          // Assert
          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            startingFundMeBalance.add(startingDeployerBalance).toString(),
            endingDeployerBalance.add(gasCost).toString()
          );
        });

        describe("withdraws ETH from a multiple funders", async function () {
          let startingFundMeBalance,
            startingDeployerBalance,
            endingFundMeBalance,
            endingDeployerBalance,
            gasCost,
            accounts,
            fundersAmount;

          beforeEach(async function () {
            // Arrange
            fundersAmount = 6;
            accounts = await ethers.getSigners();
            for (let i = 1; i < fundersAmount; i++) {
              const fundMeConnectedContract = await fundMe.connect(accounts[i]);
              await fundMeConnectedContract.fund({ value: sendValue });
            }

            startingFundMeBalance = await fundMe.provider.getBalance(
              fundMe.address
            );
            startingDeployerBalance = await fundMe.provider.getBalance(
              deployer
            );

            // Act
            const txResponse = await fundMe.withdraw();
            const txReceipt = await txResponse.wait(1);

            const { gasUsed, effectiveGasPrice } = txReceipt;
            gasCost = gasUsed.mul(effectiveGasPrice);
            endingFundMeBalance = await fundMe.provider.getBalance(
              fundMe.address
            );
            endingDeployerBalance = await fundMe.provider.getBalance(deployer);
          });

          it("withdraws all funds from contract", async function () {
            assert.equal(endingFundMeBalance, 0);
          });

          it("sends all funds to owner", async function () {
            assert.equal(
              startingFundMeBalance.add(startingDeployerBalance).toString(),
              endingDeployerBalance.add(gasCost).toString()
            );
          });

          it("clears all funders balances", async function () {
            for (let i = 1; i < fundersAmount; i++) {
              const funderBalance = await fundMe.getAddressToAmountFunded(
                accounts[i].address
              );
              assert.equal(funderBalance, 0);
            }
          });

          it("clears funders array", async function () {
            const response = fundMe.getFunder.length;
            assert.equal(response, 0);
          });
        });

        it("only allows owner to withdraw ", async function () {
          const accounts = await ethers.getSigners();
          const attacker = accounts[1];
          const fundMeConnectedContract = await fundMe.connect(attacker);
          await expect(
            fundMeConnectedContract.withdraw()
          ).to.be.revertedWithCustomError(
            fundMeConnectedContract,
            "FundMe__NotOwner"
          );
        });
      });

      describe("cheaperWithdraw", async function () {
        beforeEach(async function () {
          await fundMe.fund({ value: sendValue });
        });

        it("withdraws ETH from a single funder", async function () {
          // Arrange
          const startingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const startingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );

          // Act
          const txResponse = await fundMe.cheaperWithdraw();
          const txReceipt = await txResponse.wait(1);

          const { gasUsed, effectiveGasPrice } = txReceipt;
          const gasCost = gasUsed.mul(effectiveGasPrice);
          const endingFundMeBalance = await fundMe.provider.getBalance(
            fundMe.address
          );
          const endingDeployerBalance = await fundMe.provider.getBalance(
            deployer
          );

          // Assert
          assert.equal(endingFundMeBalance, 0);
          assert.equal(
            startingFundMeBalance.add(startingDeployerBalance).toString(),
            endingDeployerBalance.add(gasCost).toString()
          );
        });

        describe("withdraws ETH from a multiple funders", async function () {
          let startingFundMeBalance,
            startingDeployerBalance,
            endingFundMeBalance,
            endingDeployerBalance,
            gasCost,
            accounts,
            fundersAmount;

          beforeEach(async function () {
            // Arrange
            fundersAmount = 6;
            accounts = await ethers.getSigners();
            for (let i = 1; i < fundersAmount; i++) {
              const fundMeConnectedContract = await fundMe.connect(accounts[i]);
              await fundMeConnectedContract.fund({ value: sendValue });
            }

            startingFundMeBalance = await fundMe.provider.getBalance(
              fundMe.address
            );
            startingDeployerBalance = await fundMe.provider.getBalance(
              deployer
            );

            // Act
            const txResponse = await fundMe.cheaperWithdraw();
            const txReceipt = await txResponse.wait(1);

            const { gasUsed, effectiveGasPrice } = txReceipt;
            gasCost = gasUsed.mul(effectiveGasPrice);
            endingFundMeBalance = await fundMe.provider.getBalance(
              fundMe.address
            );
            endingDeployerBalance = await fundMe.provider.getBalance(deployer);
          });

          it("withdraws all funds from contract", async function () {
            assert.equal(endingFundMeBalance, 0);
          });

          it("sends all funds to owner", async function () {
            assert.equal(
              startingFundMeBalance.add(startingDeployerBalance).toString(),
              endingDeployerBalance.add(gasCost).toString()
            );
          });

          it("clears all funders balances", async function () {
            for (let i = 1; i < fundersAmount; i++) {
              const funderBalance = await fundMe.getAddressToAmountFunded(
                accounts[i].address
              );
              assert.equal(funderBalance, 0);
            }
          });

          it("clears funders array", async function () {
            const response = fundMe.getFunder.length;
            assert.equal(response, 0);
          });
        });

        it("only allows owner to withdraw ", async function () {
          const accounts = await ethers.getSigners();
          const attacker = accounts[1];
          const fundMeConnectedContract = await fundMe.connect(attacker);
          await expect(
            fundMeConnectedContract.cheaperWithdraw()
          ).to.be.revertedWithCustomError(
            fundMeConnectedContract,
            "FundMe__NotOwner"
          );
        });
      });
    });
