import EVMRevert from './helpers/EVMRevert.js';
import latestTime from './helpers/latestTime.js';
import { increaseTimeTo, duration } from './helpers/increaseTime.js';

const BigNumber = web3.BigNumber;

require('chai')
  .use(require('chai-as-promised'))
  .use(require('chai-bignumber')(BigNumber))
  .should();

const TestToken = artifacts.require('TestCoin');
const TokenVesting = artifacts.require('TokenVesting');

contract('TokenVesting', function ([_, owner, beneficiary]) {
  const amount = new BigNumber(1000);

  beforeEach(async function () {
    this.token = await TestToken.new({ from: owner });

    this.start = latestTime() + duration.minutes(1); // +1 minute so it starts after contract instantiation
    this.cliff = duration.years(1);
    this.duration = duration.years(2);

    this.vesting = await TokenVesting.new(this.token.address, beneficiary, this.start, this.cliff, this.duration, { from: owner });

    await this.token.mint(this.vesting.address, amount, { from: owner });
  });

  it('cannot withdraw before cliff', async function () {
    await this.vesting.withdraw().should.be.rejectedWith(EVMRevert);
  });

  it('cannot withdraw after cliff if not beneficiary', async function () {
    await increaseTimeTo(this.start + this.cliff + duration.weeks(1));
    await this.vesting.withdraw().should.be.rejectedWith(EVMRevert);
  });

  it('can be withdrawn after cliff by beneficiary', async function () {
    await increaseTimeTo(this.start + this.cliff + duration.weeks(1));
    await this.vesting.withdraw.call({from: beneficiary}).should.be.fulfilled;
  });

  it('should withdraw proper amount after cliff', async function () {
    await increaseTimeTo(this.start + this.cliff);

    const { receipt } = await this.vesting.withdraw({from: beneficiary});
    const withdrawalTimestamp = web3.eth.getBlock(receipt.blockNumber).timestamp;
    const balance = await this.token.balanceOf(beneficiary);
    balance.should.bignumber.equal(amount.mul(withdrawalTimestamp - this.start).div(this.duration).floor());
  });

  it('should withdraw tokens linearly during vesting period', async function () {
    const vestingPeriod = this.duration - this.cliff;
    const checkpoints = 4;

    for (let i = 1; i <= checkpoints; i++) {
      const now = this.start + this.cliff + i * (vestingPeriod / checkpoints);
      await increaseTimeTo(now);

      await this.vesting.withdraw({ from: beneficiary});
      const balance = await this.token.balanceOf(beneficiary);
      const expectedVesting = amount.mul(now - this.start).div(this.duration).floor();

      balance.should.bignumber.equal(expectedVesting);
    }
  });

  it('should be able to withdraw all vested tokens after end of period', async function () {
    await increaseTimeTo(this.start + this.duration);
    await this.vesting.withdraw({ from: beneficiary});
    const balance = await this.token.balanceOf(beneficiary);
    balance.should.bignumber.equal(amount);
  });

  it('should be revokable by owner', async function () {
    await this.vesting.revoke({ from: owner }).should.be.fulfilled;
  });

  it('should fail to be revoked by anyone other than owner', async function () {
    const vesting = await TokenVesting.new(this.token.address, beneficiary, this.start, this.cliff, this.duration, { from: owner });
    await vesting.revoke({ from: beneficiary }).should.be.rejectedWith(EVMRevert);
  });

  it('should return the non-vested tokens when revoked by owner', async function () {
    await increaseTimeTo(this.start + this.cliff + duration.weeks(12));

    const vested = await this.vesting.vestedAmount();

    await this.vesting.revoke({ from: owner });

    const ownerBalance = await this.token.balanceOf(owner);
    ownerBalance.should.bignumber.equal(amount.sub(vested));
  });

  it('should keep the vested tokens when revoked by owner', async function () {
    await increaseTimeTo(this.start + this.cliff + duration.weeks(12));

    const vestedPre = await this.vesting.vestedAmount();

    await this.vesting.revoke({ from: owner });

    const vestedPost = await this.vesting.vestedAmount();

    vestedPre.should.bignumber.equal(vestedPost);
  });

  it('should fail to be revoked a second time', async function () {
    await increaseTimeTo(this.start + this.cliff + duration.weeks(12));

    await this.vesting.vestedAmount();

    await this.vesting.revoke({ from: owner });

    await this.vesting.revoke({ from: owner }).should.be.rejectedWith(EVMRevert);
  });
});
