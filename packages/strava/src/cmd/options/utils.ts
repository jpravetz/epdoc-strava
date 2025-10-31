import { _ } from '@epdoc/type';
import { mapDef } from './definitions.ts';
import type * as Options from './types.ts';

const REG = {
  isParams: new RegExp(/^([<\[][a-zA-Z_][a-zA-Z0-9_]*(\.\.\.)?[>\]])$/),
};

export function isParams(val: unknown): val is Options.Params {
  return (_.isString(val) && REG.isParams.test(val));
}

export function isSubs(val: unknown): val is Options.Subs {
  if (typeof val !== 'object' || val === null) return false;

  const obj = val as Record<string, unknown>;
  const allowedKeys = ['description', 'defVal', 'params', 'choices', 'argParser'];
  for (const key in obj) {
    if (!allowedKeys.includes(key)) return false;
  }

  if ('description' in obj) {
    if (!_.isString(obj.description)) return false;
  }

  if ('params' in obj) {
    if (!isParams(obj.params)) return false;
  }

  if ('choices' in obj) {
    if (!Array.isArray(obj.choices)) return false;
  }

  return true;
}

export function isReplaceSubs(val: unknown): val is Options.ReplaceSubs {
  return _.isDict(val);
}

export function isName(val: unknown): val is Options.Name {
  return _.isString(val) && val in mapDef;
}

export function isDef(val: unknown): val is Options.Def {
  return _.isDict(val) && _.isString(val.name) && _.isString(val.description);
}

export function isConfig(val: unknown): val is Options.Config {
  if (!_.isDict(val)) return false;

  const configKeys: (keyof Options.Config)[] = ['replace', 'options', 'arguments'];

  // Check that all keys in the object are valid Config keys
  for (const key of Object.keys(val)) {
    if (!configKeys.includes(key as keyof Options.Config)) {
      return false;
    }
  }

  // Validate each property if it exists
  if ('replace' in val && !isReplaceSubs(val.replace)) {
    return false;
  }

  if ('options' in val) {
    if (!_.isDict(val.options)) return false;
  }

  if ('arguments' in val) {
    if (!Array.isArray(val.arguments)) return false;
    for (const arg of val.arguments) {
      if (!_.isDict(arg)) return false;
      for (const value of Object.values(arg)) {
        if (typeof value !== 'string') {
          return false;
        }
      }
    }
  }

  return true;
}
