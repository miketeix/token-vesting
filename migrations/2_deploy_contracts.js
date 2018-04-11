const VestingContract = artifacts.require('../contracts/TokenVesting.sol');

module.exports = function(deployer, network, accounts) {
    const now = Math.round((new Date()).getTime() / 1000); // js unix timestamp

    const token = "0xd51373131f143ce4f77d9c8855cf3c20f87c149c"; // test coin
    const beneficiary = "0xAB6e33d7a9f28b4a8bD2d51e3F63736A7964386f"; // beneficiary address
    const start = now + 60;  // unix timestamp of start time
    const cliff = 180 ; // cliff wait period in seconds
    const duration = 900; // vesting period duraction in seconds

    return deployer
        .then(() => {
            return deployer.deploy(
              VestingContract,
              token,
              beneficiary,
              start,
              cliff,
              duration
            );
        });
};
