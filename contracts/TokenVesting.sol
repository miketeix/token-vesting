pragma solidity ^0.4.18;

import "zeppelin-solidity/contracts/token/ERC20/ERC20Basic.sol";
import "zeppelin-solidity/contracts/token/ERC20/SafeERC20.sol";
import "zeppelin-solidity/contracts/ownership/Ownable.sol";
import "zeppelin-solidity/contracts/math/SafeMath.sol";


/**
 * @title TokenVesting
 * @dev A token holder contract that can release its token balance gradually
 * like a typical vesting scheme, with a cliff and vesting period. After
 * deployment, the owner must transfer ownership of some ERC-20 tokens to the
 * address of this deployed TokenVesting contract. Revocable by the
 * owner.
 */
contract TokenVesting is Ownable {
  using SafeMath for uint256;
  using SafeERC20 for ERC20Basic;

  event Withdrawal(uint256 amount);
  event Revoked();


  ERC20Basic public token; // ERC20 token
  address public beneficiary; // beneficiary address, tokens tokens to be sent there upon release
  uint256 public start; // unix timestamp;
  uint256 public cliff; // in seconds;
  uint256 public duration; // in seconds;

  uint256 public withdrawnAmount;
  bool public revoked;

  /**
   * @dev Creates a vesting contract that vests its balance of any ERC20 token _token to the
   * _beneficiary, gradually in a linear fashion until _start + _duration,  afterwhich all
   * of the balance will have vested... Vested tokens are only withdrawable after _start + _cliff.
   * @param _token address of the ERC20 token contract whose tokens will be vested by this contract
   * @param _beneficiary address of the beneficiary to whom vested tokens are transferred
   * @param _start unix timestamp of when the contract should start
   * @param _cliff duration in seconds of the cliff in which tokens will begin to vest
   * @param _duration duration in seconds of the period in which the tokens will vest
   */
  function TokenVesting(
    ERC20Basic _token,
    address _beneficiary,
    uint256 _start,
    uint256 _cliff,
    uint256 _duration
  )
    public
  {
    require(_beneficiary != address(0));
    require(_cliff <= _duration);

    token = _token; //ERC20Basic(_token);
    beneficiary = _beneficiary;
    cliff = _start.add(_cliff);
    start = _start;
    duration = _duration;
  }

  /**
   * @notice Transfers vested tokens to beneficiary. Only callable by beneficiary
   */
  function withdraw() public {
    require(block.timestamp > cliff);
    require(msg.sender == beneficiary);

    uint256 withdrawable = withdrawableAmount();
    require(withdrawable > 0);

    withdrawnAmount = withdrawnAmount.add(withdrawable);

    token.safeTransfer(beneficiary, withdrawable);

    emit Withdrawal(withdrawable);
  }

  /**
   * @notice Allows the owner to revoke the vesting. Tokens already vested
   * remain with the contract, the rest are returned to the owner.
   */
  function revoke() public onlyOwner {
    require(!revoked);

    uint256 balance = token.balanceOf(this);
    uint256 withdrawable = withdrawableAmount();
    uint256 refund = balance.sub(withdrawable);

    revoked = true;

    token.safeTransfer(owner, refund);

    emit Revoked();
  }

  /**
   * @dev Calculates the amount that has already vested but hasn't been withdrawn yet.
   */
  function withdrawableAmount() public view returns (uint256) {
    return vestedAmount().sub(withdrawnAmount);
  }

  /**
   * @dev Calculates the amount that has already vested.
   */
  function vestedAmount() public view returns (uint256) {
    uint256 balance = token.balanceOf(this);
    uint256 totalVesting = balance.add(withdrawnAmount);

    if (block.timestamp < cliff) {
      return 0;
    } else if (block.timestamp >= start.add(duration) || revoked) {
      return totalVesting;
    } else {
      return totalVesting.mul(block.timestamp.sub(start)).div(duration);
    }
  }
}
