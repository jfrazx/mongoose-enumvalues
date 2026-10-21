import type {
  CallbackWithoutResultAndOptionalError,
  MongooseQueryMiddleware,
  Schema,
  SchemaType,
} from 'mongoose';

/**
 * eventually
  options {
    only: ['pathName', 'pathName', function],
    find: true,
    findOne: false,
    validateBeforeSave: true,
    virtual: true,
    attach: true,
    modify: false,
  }
*/

/**
 * currently
  options {
    only: ['pathName', 'pathName'],
    find: true,
    findOne: true,
    validateBeforeSave: true,

    virtual: {
      only: ['pathName', 'pathName'],
      properties: {
        propertyName: 'asVirtual',
      }
    },

    attach: {
      only: ['pathName', 'pathName'],
      properties: {
        propertyName: {
          as: 'attachPropertyAs',
          on: ['find', 'findOne']
        }
      }
    },

    modify: {
      only: ['pathName', 'pathName'],
      on: ['find', 'findOne']
    }
  }
*/

type Next = CallbackWithoutResultAndOptionalError;
type Fields = Record<string, unknown>;

interface Filtered {
  only: enumValues.Filterables[];
}

/**
 * The options once setOptions has filled in every default.
 */
interface ResolvedOptions extends Filtered {
  find?: boolean;
  findOne?: boolean;
  validateBeforeSave?: boolean;
  virtual?: Filtered & { properties: Record<string, string> };
  attach?: Filtered & {
    properties: Record<string, { as: string; on: MongooseQueryMiddleware[] }>;
  };
  modify?: Filtered & { on: MongooseQueryMiddleware[] };
}

interface EnumPath {
  path: string;
  enumValues: unknown[];
  options: ResolvedOptions;
}

/**
 * Mongoose plugin giving access to a schema's enum values: as virtuals,
 * attached to queried documents, or in place of the enum property on lean
 * results.
 */
function enumValues(
  schema: Schema,
  options?: enumValues.EnumValueOptions,
): void {
  const resolved = setOptions(schema, options);

  const paths = findPaths(schema, resolved);

  setVirtuals(schema, filterPaths(paths, resolved.virtual));
  attachProperties(schema, filterPaths(paths, resolved.attach));
  modifyProperties(schema, filterPaths(paths, resolved.modify));
}

// eslint-disable-next-line @typescript-eslint/no-namespace -- D21: carries the types on the one default export
declare namespace enumValues {
  type Filterables = string | RegExp | ((param: string) => boolean);

  interface EnumValueOptions {
    only?: Filterables[];
    find?: boolean;
    findOne?: boolean;
    validateBeforeSave?: boolean;
    virtual?: {
      only?: Filterables[];
      properties: {
        [property: string]: string;
      };
    };
    attach?: {
      only?: Filterables[];
      properties: {
        [property: string]: {
          as: string;
          on?: string[];
        };
      };
    };
    modify?:
      | {
          only?: Filterables[];
          on?: string[];
        }
      | boolean;
  }
}

export default enumValues;

/**
 * Setup handlers for modifying document properties, must be a `lean` object
 *
 */
function modifyProperties(schema: Schema, paths: EnumPath[]): void {
  if (!paths.length) {
    return;
  }

  const options = paths[0].options;

  /**
   * Modify document enum (string) properties to an object, with (original) value and
   * values (enumValues)
   *
   */
  function populatePropertyFor(
    this: { _mongooseOptions: { lean?: unknown } },
    documents: Fields | Fields[],
    next: Next,
  ): void {
    if (this._mongooseOptions.lean) {
      asArray(documents).forEach(function (doc) {
        paths.forEach(function (path) {
          try {
            const splitted = path.path.split('.');
            const key = splitted.shift()!; // split() never returns an empty array
            const insert: { values: unknown[]; value?: unknown } = {
              values: path.enumValues,
            };
            const value = doc[key];

            insert.value = determineValue(splitted, value);
            doc[key] = nest(splitted, insert);
          } catch (error) {
            return next(error as Error);
          }
        });
      });
    }

    next();
  }

  /**
   * If a document is modified, this method will locate the value on updates and assign it to the
   * appropriate property, allowing for proper validations later.
   * @param <Function>: next - function that notifies mongoose this middleware is complete
   */
  function reformatUpdateProperty(
    this: { _update: { $set?: Fields } },
    next: Next,
  ): void {
    const document = this._update['$set'];

    if (document) {
      paths.forEach(function (path) {
        try {
          const splitted = path.path.split('.');
          const key = splitted.shift()!; // split() never returns an empty array

          if (document[key] === undefined) {
            return;
          }

          const value = determineValue(splitted, document[key]);

          document[key] = nest(splitted, value);
        } catch (error) {
          return next(error as Error);
        }
      });
    }

    next();
  }

  /**
   * If a document is modified, this method will locate the value before save/validation and assign it to the
   * appropriate property, allowing for proper validations later.
   * @param <Function>: next - function that notifies mongoose this middleware is complete
   */
  function reformatProperty(this: Fields, next: Next): void {
    const self = this;
    paths.forEach(function (path) {
      try {
        const splitted = path.path.split('.');
        const key = splitted.shift()!; // split() never returns an empty array
        const value = determineValue(splitted, self[key]);

        self[key] = nest(splitted, value);
      } catch (error) {
        return next(error as Error);
      }
    });

    next();
  }

  /**
   * Setup handlers for modifying properties -- ['find', 'findOne']
   */
  // Non-null: filterPaths returns no paths when `modify` is unset, and this
  // function returned above in that case.
  options.modify!.on.forEach(function (on) {
    schema.post(on, populatePropertyFor);
  });

  schema.pre(
    options.validateBeforeSave ? 'validate' : 'save',
    reformatProperty,
  );

  /*
   * Setup handlers for updating documents (there may be more to consider)
   */
  // 'update' is not a hook name Mongoose's types know: Mongoose 7 removed
  // the method. The hook still registers, and never fires -- see
  // docs/baseline.md.
  ['update', 'findOneAndUpdate'].forEach(function (on) {
    schema.pre(on as MongooseQueryMiddleware, reformatUpdateProperty);
  });
}

/**
 * Locate schema paths that are enums
 * @param
 */
function findPaths(schema: Schema, options: ResolvedOptions): EnumPath[] {
  const paths: EnumPath[] = [];

  schema.eachPath(function (
    path: string,
    type: SchemaType & { enumValues?: unknown[] },
  ) {
    if (type.enumValues && type.enumValues.length) {
      paths.push({
        path: path,
        enumValues: type.enumValues,
        options: options,
      });
    }
  });

  return filterPaths(paths, options);
}

/**
 * Filter paths based on allowed paths, which can be: string, callback or a regex
 *
 *
 */
function filterPaths(
  paths: EnumPath[],
  allowed: Filtered | undefined,
): EnumPath[] {
  if (!allowed) {
    return [];
  }
  if (!allowed.only.length) {
    return paths;
  }

  return paths.filter((path) => {
    let match = false;

    for (const filter of allowed.only) {
      try {
        switch (typeof filter) {
          case 'function':
            match = filter(path.path);
            break;
          case 'string':
            match = path.path === filter;
            break;
          default:
            match = filter.test(path.path);
        }
      } catch (e) {
        throw new Error(
          `${typeof filter} is not an allowed filter type. Must be String, RegExp or Function`,
        );
      }
      if (match) {
        return match;
      }
    }
    return match;
  });
}

/**
 * Setup virtual properties for the document
 *
 */
function setVirtuals(schema: Schema, paths: EnumPath[]): void {
  paths.forEach((path) => {
    // Non-null: filterPaths returns no paths when `virtual` is unset.
    const props = path.options.virtual!.properties;

    if (props[path.path]) {
      schema.virtual(props[path.path]).get(function () {
        return path.enumValues;
      });
    }
  });
}

/**
 * Attach properties to the document
 *
 */
function attachProperties(schema: Schema, paths: EnumPath[]): void {
  paths.forEach((path) => {
    // Non-null: filterPaths returns no paths when `attach` is unset.
    const props = path.options.attach!.properties;

    if (props[path.path]) {
      (props[path.path].on || []).forEach((on) => {
        /**
         * Setup post callbacks
         */
        schema.post(on, function (documents: Fields | Fields[], next: Next) {
          asArray(documents).forEach(function (doc) {
            paths.forEach(function (path) {
              doc[props[path.path].as] = path.enumValues;
            });
          });

          next();
        });
      });
    }
  });
}

/**
 * Traverse the passed document, according to keys, appropriating the desired value
 * @param [String]: keys -- an array of keys determining the path to value
 * @param Object: doc -- the document that contains the value at keys path
 * @return any: -- the value at the end of keys path in document
 */
function determineValue(keys: string[], doc: unknown): unknown {
  // The casts are deliberate. This relies on the property reads throwing
  // when it reaches null or undefined, and on the catch then returning
  // whatever it got to -- the behaviour docs/baseline.md records.
  try {
    for (const key of keys) {
      doc = (doc as Fields)[key];
    }

    /**
      the keys array should transition through any nesting,
      so any object is assumed to be enumValues:
        { value: 'string', enumValues: ['strings'] }
     */
    return typeof doc === 'object' ? (doc as { value: unknown }).value : doc;
  } catch (error) {
    return doc;
  }
}

/**
 * Nest the insert value into objects with keys from array
 *
 */
function nest(array: string[], insert: unknown): unknown {
  let obj: Fields;

  array.reverse().forEach((key) => {
    obj = { [key]: insert };
    insert = obj;
  });

  return insert;
}

/**
 * Setup options and defaults
 *
 */
function setOptions(
  schema: Schema,
  input: enumValues.EnumValueOptions | undefined,
): ResolvedOptions {
  // The defaults are written onto the caller's own object, in place, as
  // 0.0.3 always did. It changes shape as they go in, which no one type
  // describes, so this function alone works on an untyped view of it. Hook
  // names in `on` are taken on trust, as Mongoose itself takes them.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see above
  const options: Record<string, any> = input || {};

  function setDefaults(array: string[]): void {
    if (!array.length) {
      if (options.find) {
        array.push('find');
      }
      if (options.findOne || !options.find) {
        array.push('findOne');
      }
    }
  }

  options.only = options.only || [];
  options.validateBeforeSave =
    options.validateBeforeSave === undefined
      ? schema.options.validateBeforeSave
      : Boolean(options.validateBeforeSave);

  ['virtual', 'attach', 'modify']
    .filter((prop) => options[prop])
    .forEach((prop) => {
      if (typeof options[prop] !== 'object') {
        options[prop] = {};
      }
      options[prop].properties = options[prop].properties || {};
      options[prop].only =
        options[prop].only || Object.keys(options[prop].properties);
    });

  if (options.modify) {
    delete options.modify.properties;
    options.modify.on = options.modify.on || [];
    setDefaults(options.modify.on);
  }
  if (options.attach) {
    Object.keys(options.attach.properties).forEach((property) => {
      options.attach.properties[property].on =
        options.attach.properties[property].on || [];
      setDefaults(options.attach.properties[property].on);
    });
  }

  return options as ResolvedOptions;
}

/**
 * Helper function to ensure value is an array
 */
function asArray<T>(array: T | T[]): T[] {
  return Array.isArray(array) ? array : [array];
}
