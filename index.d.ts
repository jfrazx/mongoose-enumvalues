
declare module 'enumValues' {
  import { Schema } from 'mongoose';

  function enumValues(schema: Schema, options: EnumValueOptions): void;

  type Filterables = (string | RegExp | ((param: string) => boolean));

  interface EnumValueOptions {
    only?: Filterables[],
    find?: boolean,
    findOne?: boolean,
    validateBeforeSave?: boolean,
    virtual?: {
      only?: Filterables[],
      properties: {
        [property: string]: string
      }
    },
    attach?: {
      only?: Filterables[],
      properties: {
        [property: string]: {
          as: string,
          on?: string[]
        }
      }
    },
    modify?: {
      only?: Filterables[],
      on?: string[]
    } | boolean
  }
}
