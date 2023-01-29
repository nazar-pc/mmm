// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;
import { Component } from "solecs/Component.sol";
import { LibTypes } from "solecs/LibTypes.sol";

struct Formula {
  uint256 x;
  uint256 y;
}

uint256 constant ID = uint256(keccak256("component.Formula"));

contract FormulaComponent is Component {
  constructor(address world) Component(world, ID) {}

  function set(uint256 entity, Formula calldata value) public {
    set(entity, abi.encode(value));
  }

  function getValue(uint256 entity) public view returns (Formula memory) {
    return abi.decode(getRawValue(entity), (Formula));
  }

  function getEntitiesWithValue(Formula calldata value) public view returns (uint256[] memory) {
    return getEntitiesWithValue(abi.encode(value));
  }

  function getSchema() public pure override returns (string[] memory keys, LibTypes.SchemaValue[] memory values) {
    keys = new string[](2);
    values = new LibTypes.SchemaValue[](2);

    keys[0] = "x";
    values[0] = LibTypes.SchemaValue.UINT256;
    keys[1] = "y";
    values[1] = LibTypes.SchemaValue.UINT256;
  }
}
