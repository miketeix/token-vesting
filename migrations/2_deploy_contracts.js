const VestingContract = artifacts.require('../contracts/TokenVesting.sol');
console.log('VestingContract', VestingContract);

module.exports = function(deployer, network, accounts) {
    const now = Math.round((new Date()).getTime() / 1000); // js unix timestamp

    const beneficiary = "0xAB6e33d7a9f28b4a8bD2d51e3F63736A7964386f"; // beneficiary address

    const start = now + 60;  // unix timestamp of start time
    const cliff = 180 ; // cliff wait period in seconds
    const duration = 900; // vesting period duraction in seconds

    const revocable = true;

    return deployer
        .then(() => {
            return deployer.deploy(
              VestingContract,
              beneficiary,
              start,
              cliff,
              duration,
              revocable
            );
        });
};
