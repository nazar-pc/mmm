// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;
import { System, IWorld } from "solecs/System.sol";
import { FormulaComponent, ID as FormulaComponentID, Formula } from "components/FormulaComponent.sol";
import { PositionComponent, ID as PositionComponentID, Position } from "components/PositionComponent.sol";
import { getAddressById } from "solecs/utils.sol";

uint256 constant U256MAX = 115792089237316195423570985008687907853269984665640564039457584007913129639935;

uint256 constant ID = uint256(keccak256("system.CreateFormula"));

contract CreateFormulaSystem is System {
  constructor(IWorld _world, address _components) System(_world, _components) {}

  function execute(bytes memory arguments) public returns (bytes memory) {
    (Formula memory newFormula) = abi.decode(arguments, (Formula));
    uint256 formulaId = uint256(sha256(abi.encode(newFormula)));

    FormulaComponent formulaComponent = FormulaComponent(getAddressById(components, FormulaComponentID));
    formulaComponent.set(formulaId, newFormula);

    PositionComponent positionComponent = PositionComponent(getAddressById(components, PositionComponentID));
    uint16 x = uint16(uint128(formulaId) % 1024);
    uint16 y = uint16(uint128(formulaId >> 128) % 1024);
    Position memory position = Position(x, y);
    positionComponent.set(formulaId, position);
  }

  function executeTyped(Formula memory formula) public returns (bytes memory) {
    return execute(abi.encode(formula));
  }
}
