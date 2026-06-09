import { expect } from "chai";
import { network } from "hardhat";

const { ethers, networkHelpers } = await network.create();

const CREDITS_PER_MON = 10_000n;
const WEI_PER_CREDIT = ethers.parseEther("1") / CREDITS_PER_MON; // 1e14 wei

async function deployCreditsFixture() {
  const [alice, bob] = await ethers.getSigners();
  const aiQueryCredits = await ethers.deployContract("AIQueryCredits");
  return { aiQueryCredits, alice, bob };
}

describe("AIQueryCredits", function () {
  describe("topUp", function () {
    it("mints 10,000 credits for 1 MON", async function () {
      const { aiQueryCredits, alice } =
        await networkHelpers.loadFixture(deployCreditsFixture);

      await aiQueryCredits.topUp({ value: ethers.parseEther("1") });

      expect(await aiQueryCredits.credits(alice.address)).to.equal(
        CREDITS_PER_MON,
      );
    });

    it("mints proportionally for fractional amounts (0.5 MON -> 5,000)", async function () {
      const { aiQueryCredits, alice } =
        await networkHelpers.loadFixture(deployCreditsFixture);

      await aiQueryCredits.topUp({ value: ethers.parseEther("0.5") });

      expect(await aiQueryCredits.credits(alice.address)).to.equal(5_000n);
    });

    it("accumulates credits across top-ups and tracks users separately", async function () {
      const { aiQueryCredits, alice, bob } =
        await networkHelpers.loadFixture(deployCreditsFixture);

      await aiQueryCredits.topUp({ value: ethers.parseEther("1") });
      await aiQueryCredits.topUp({ value: ethers.parseEther("0.25") });
      await aiQueryCredits.connect(bob).topUp({ value: ethers.parseEther("2") });

      expect(await aiQueryCredits.credits(alice.address)).to.equal(12_500n);
      expect(await aiQueryCredits.credits(bob.address)).to.equal(20_000n);
    });

    it("emits CreditsToppedUp", async function () {
      const { aiQueryCredits, alice } =
        await networkHelpers.loadFixture(deployCreditsFixture);

      const value = ethers.parseEther("1");
      await expect(aiQueryCredits.topUp({ value }))
        .to.emit(aiQueryCredits, "CreditsToppedUp")
        .withArgs(alice.address, CREDITS_PER_MON, value);
    });

    it("reverts on zero value", async function () {
      const { aiQueryCredits } =
        await networkHelpers.loadFixture(deployCreditsFixture);

      await expect(
        aiQueryCredits.topUp({ value: 0n }),
      ).to.be.revertedWithCustomError(aiQueryCredits, "ZeroAmount");
    });

    it("reverts on dust that does not convert to a whole credit", async function () {
      const { aiQueryCredits } =
        await networkHelpers.loadFixture(deployCreditsFixture);

      const dusty = WEI_PER_CREDIT + 1n;
      await expect(aiQueryCredits.topUp({ value: dusty }))
        .to.be.revertedWithCustomError(aiQueryCredits, "NonIntegralTopUp")
        .withArgs(dusty);
    });
  });

  describe("consume", function () {
    it("deducts credits and emits CreditsConsumed with the remaining balance", async function () {
      const { aiQueryCredits, alice } =
        await networkHelpers.loadFixture(deployCreditsFixture);
      await aiQueryCredits.topUp({ value: ethers.parseEther("1") });

      await expect(aiQueryCredits.consume(1_500n))
        .to.emit(aiQueryCredits, "CreditsConsumed")
        .withArgs(alice.address, 1_500n, 8_500n);

      expect(await aiQueryCredits.credits(alice.address)).to.equal(8_500n);
    });

    it("can consume the entire balance", async function () {
      const { aiQueryCredits, alice } =
        await networkHelpers.loadFixture(deployCreditsFixture);
      await aiQueryCredits.topUp({ value: ethers.parseEther("1") });

      await expect(aiQueryCredits.consume(CREDITS_PER_MON))
        .to.emit(aiQueryCredits, "CreditsConsumed")
        .withArgs(alice.address, CREDITS_PER_MON, 0n);

      expect(await aiQueryCredits.credits(alice.address)).to.equal(0n);
    });

    it("reverts when consuming more than the balance", async function () {
      const { aiQueryCredits } =
        await networkHelpers.loadFixture(deployCreditsFixture);
      await aiQueryCredits.topUp({ value: ethers.parseEther("1") });

      await expect(aiQueryCredits.consume(CREDITS_PER_MON + 1n))
        .to.be.revertedWithCustomError(aiQueryCredits, "InsufficientCredits")
        .withArgs(CREDITS_PER_MON + 1n, CREDITS_PER_MON);
    });

    it("reverts on zero amount", async function () {
      const { aiQueryCredits } =
        await networkHelpers.loadFixture(deployCreditsFixture);

      await expect(
        aiQueryCredits.consume(0n),
      ).to.be.revertedWithCustomError(aiQueryCredits, "ZeroAmount");
    });
  });

  describe("withdraw", function () {
    it("burns credits and refunds the proportional MON", async function () {
      const { aiQueryCredits, alice } =
        await networkHelpers.loadFixture(deployCreditsFixture);
      await aiQueryCredits.topUp({ value: ethers.parseEther("1") });

      const refund = ethers.parseEther("0.4"); // 4,000 credits
      await expect(aiQueryCredits.withdraw(4_000n)).to.changeEtherBalances(
        ethers,
        [alice, aiQueryCredits],
        [refund, -refund],
      );

      expect(await aiQueryCredits.credits(alice.address)).to.equal(6_000n);
    });

    it("emits CreditsWithdrawn", async function () {
      const { aiQueryCredits, alice } =
        await networkHelpers.loadFixture(deployCreditsFixture);
      await aiQueryCredits.topUp({ value: ethers.parseEther("1") });

      await expect(aiQueryCredits.withdraw(CREDITS_PER_MON))
        .to.emit(aiQueryCredits, "CreditsWithdrawn")
        .withArgs(alice.address, CREDITS_PER_MON, ethers.parseEther("1"));
    });

    it("supports a full round trip: top up, consume, withdraw the rest", async function () {
      const { aiQueryCredits, alice } =
        await networkHelpers.loadFixture(deployCreditsFixture);
      await aiQueryCredits.topUp({ value: ethers.parseEther("2") });

      // The MON backing consumed credits stays in the contract: consumed
      // credits paid for AI queries and are no longer redeemable.
      await aiQueryCredits.consume(5_000n);

      const remaining = 15_000n;
      const refund = ethers.parseEther("1.5");
      await expect(aiQueryCredits.withdraw(remaining)).to.changeEtherBalance(
        ethers,
        alice,
        refund,
      );
      expect(await aiQueryCredits.credits(alice.address)).to.equal(0n);
    });

    it("reverts when withdrawing more credits than owned", async function () {
      const { aiQueryCredits } =
        await networkHelpers.loadFixture(deployCreditsFixture);
      await aiQueryCredits.topUp({ value: ethers.parseEther("1") });

      await expect(aiQueryCredits.withdraw(CREDITS_PER_MON + 1n))
        .to.be.revertedWithCustomError(aiQueryCredits, "InsufficientCredits")
        .withArgs(CREDITS_PER_MON + 1n, CREDITS_PER_MON);
    });

    it("reverts on zero amount", async function () {
      const { aiQueryCredits } =
        await networkHelpers.loadFixture(deployCreditsFixture);

      await expect(
        aiQueryCredits.withdraw(0n),
      ).to.be.revertedWithCustomError(aiQueryCredits, "ZeroAmount");
    });
  });
});
