import { setupMUDNetwork } from "@latticexyz/std-client";
import { createWorld, defineComponent, EntityID, EntityIndex, Type, World } from "@latticexyz/recs";
import { SystemTypes } from "contracts/types/SystemTypes";
import { SystemAbis } from "contracts/types/SystemAbis.mjs";
import { config } from "./config";
import { PositionStruct } from "contracts/types/ethers-contracts/PositionComponent";
import { FormulaStruct } from "contracts/types/ethers-contracts/FormulaComponent";
import {BigNumber} from "@ethersproject/bignumber/src.ts/bignumber";

function getRandomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function numericChunks(s: string): number[] {
  return s.slice(2).match(/.{2}/g)!.map((s) => parseInt(s, 16));
}

function toSuperScript(n: number): string {
  const superscripts = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];

  return n.toString(10).match(/./g)!.map((s) => superscripts[parseInt(s, 10)]).join('');
}

function formulaToText(x: string, y: string): string {
  let output = '';

  {
    let first = true;
    for (const [index, coefficient] of numericChunks(x).entries()) {
      if (!first) {
        output += ' + ';
      }
      first = false;

      if (coefficient > 0) {
        switch (index) {
          case 0:
            output += `${coefficient}`;
            break;
          case 1:
            output += `${coefficient}x`;
            break;
          default:
            output += `${coefficient}x${index ? toSuperScript(index) : ''}`;
            break;
        }
      }
    }
  }
  output += ' = ';
  {
    let first = true;
    for (const [index, coefficient] of numericChunks(y).entries()) {
      if (!first) {
        output += ' + ';
      }
      first = false;

      if (coefficient > 0) {
        switch (index) {
          case 0:
            output += `${coefficient}`;
            break;
          case 1:
            output += `${coefficient}y`;
            break;
          default:
            output += `${coefficient}y${index ? toSuperScript(index) : ''}`;
            break;
        }
      }
    }
  }

  return output;
}

class Entity {
  public readonly element: HTMLDivElement;
  public constructor(public readonly id: EntityID, root: Element) {
    const element = document.createElement('div');
    element.classList.add('entity');
    // Stats with `0x`, so first 2 characters are skipped
    const red = parseInt(id.slice(2, 4), 16);
    const green = parseInt(id.slice(4, 6), 16);
    const blue = parseInt(id.slice(6, 8), 16);
    const shape = parseInt(id.slice(6, 8), 16);
    const square = shape >= 128;
    const rotated = square && shape % 2;
    // Make sure transition runs rather than applying instantly
    setTimeout(() => {
      element.style.backgroundColor = `rgb(${red}, ${green}, ${blue})`;
      if (rotated) {
        element.style.transform = 'rotate(45deg)'
      }
    }, 0);
    if (square) {
      element.style.borderRadius = '0';
    }
    root.appendChild(element);
    this.element = element;
  }

  public updateFormula(formula?: FormulaStruct) {
    this.element.title = formula
      ? formulaToText(
        BigNumber.from(formula.x).toHexString(),
        BigNumber.from(formula.y).toHexString()
      )
      : '';
  }

  public updatePosition(position?: PositionStruct) {
    // Make sure transition runs rather than applying instantly
    setTimeout(() => {
      this.element.style.left = position ? `${position.x}px` : '';
      this.element.style.top = position ? `${position.y}px` : '';
    }, 0);
  }
}

class Entities {
  private readonly entities: Map<EntityIndex, Entity> = new Map();

  public constructor(
    private readonly world: World,
    private readonly root: Element,
  ) {
  }

  public getOrCreate(index: EntityIndex): Entity {
    {
      const entity = this.entities.get(index);
      if (entity) {
        return entity;
      }
    }

    const entity = new Entity(this.world.entities[index], this.root);
    this.entities.set(index, entity);
    return entity;
  }
}

// The world contains references to all entities, all components and disposers.
const world = createWorld();
const root = document.querySelector('#root')!;
const entities = new Entities(world, root)

// Components contain the application state.
// If a contractId is provided, MUD syncs the state with the corresponding
// component contract (in this case `FormulaComponent.sol`)
const components = {
  Formula: defineComponent(
    world,
    {
      x: Type.Number,
      y: Type.Number,
    },
    {
      metadata: {
        contractId: "component.Formula",
      },
    },
  ),
  Position: defineComponent(
    world,
    {
      x: Type.Number,
      y: Type.Number,
    },
    {
      metadata: {
        contractId: "component.Position",
      },
    },
  ),
};

components.Formula.update$.subscribe((update) => {
  const entity = entities.getOrCreate(update.entity);
  const formula: FormulaStruct | undefined = update.value?.[0];
  entity.updateFormula(formula);
});

components.Position.update$.subscribe((update) => {
  const entity = entities.getOrCreate(update.entity);
  const position: PositionStruct | undefined = update.value?.[0];
  entity.updatePosition(position);
});

setupMUDNetwork<typeof components, SystemTypes>(
  config,
  world,
  components,
  SystemAbis
).then(({ startSync, systems }) => {
  // After setting up the network, we can tell MUD to start the synchronization process.
  startSync();

  document.body.onclick = (e) => {
    if (e.target == document.body || e.target == root) {
      systems["system.CreateFormula"].executeTyped({
        x: getRandomInt(0, 9007199254740992),
        y: getRandomInt(0, 4294967295),
      });
    }
  }
});
